import { XMLParser } from 'fast-xml-parser';
import { AppError, notFound } from '../../lib/errors.js';
import { createCache } from '../../lib/cache.js';
import { logAudit } from '../../lib/audit.js';
import { env } from '../../config/env.js';
import { Game } from '../../models/game.model.js';

const BASE = 'https://boardgamegeek.com/xmlapi2';
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

// 1 hour cache to be nice to BGG + avoid rate limits during demo
const cache = createCache({ ttlMs: 60 * 60 * 1000, maxEntries: 500 });

const TIMEOUT_MS = 10_000;
// BGG ตอบ 202 = "รับคำขอแล้ว กำลังเตรียมข้อมูล" → รอแล้วถามใหม่
const QUEUED_RETRIES = 3;
const QUEUED_DELAY_MS = 1500;
/** BGG /thing รับได้ครั้งละไม่เกิน 20 id */
export const MAX_IDS_PER_CALL = 20;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

const pickPrimaryName = (names) => {
  const list = arr(names);
  return list.find((n) => n.type === 'primary')?.value || list[0]?.value || '';
};

const linksOfType = (links, type) =>
  arr(links)
    .filter((l) => l.type === type)
    .map((l) => l.value);

/** error ที่อ่านแล้วรู้เลยว่าต้องแก้ตรงไหน (code ให้ FE ใช้แยกข้อความได้) */
const bggError = (status, code, message) => new AppError(status, message, { code });

async function fetchXml(path) {
  const cached = cache.get(path);
  if (cached) return cached;

  // ตั้งแต่ปลายปี 2025 BGG XML API ต้องมี token ทุก request — ไม่มีก็ไม่ต้องยิงให้เสียเวลา
  if (!env.BGG_TOKEN) {
    throw bggError(
      503,
      'BGG_TOKEN_MISSING',
      'ยังไม่ได้ตั้ง BGG_TOKEN — ใส่ใน server/.env แล้ว restart server',
    );
  }
  const headers = { Authorization: `Bearer ${env.BGG_TOKEN}` };

  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(`${BASE}${path}`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (err) {
      const timeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
      throw bggError(
        502,
        timeout ? 'BGG_TIMEOUT' : 'BGG_UNREACHABLE',
        timeout ? 'BGG ตอบช้าเกินไป ลองใหม่อีกครั้ง' : 'ติดต่อ BGG ไม่ได้ (เช็กอินเทอร์เน็ต/DNS)',
      );
    }

    if (res.status === 202) {
      if (attempt < QUEUED_RETRIES) {
        await sleep(QUEUED_DELAY_MS * (attempt + 1));
        continue;
      }
      throw bggError(503, 'BGG_BUSY', 'BGG กำลังเตรียมข้อมูล ลองใหม่อีกครั้งในไม่กี่วินาที');
    }
    if (res.status === 401 || res.status === 403) {
      throw bggError(
        503,
        'BGG_TOKEN_INVALID',
        'BGG ปฏิเสธ BGG_TOKEN (ผิด / หมดอายุ / แอปยังไม่อนุมัติ) — เช็กค่าใน server/.env',
      );
    }
    if (res.status === 429) {
      throw bggError(429, 'BGG_RATE_LIMIT', 'เรียก BGG ถี่เกินไป รอสักครู่แล้วลองใหม่');
    }
    if (!res.ok) throw bggError(502, 'BGG_ERROR', `BGG ${res.status}`);

    const parsed = parser.parse(await res.text());
    cache.set(path, parsed);
    return parsed;
  }
}

export async function search(query) {
  const data = await fetchXml(`/search?query=${encodeURIComponent(query)}&type=boardgame`);
  return arr(data?.items?.item)
    .slice(0, 30)
    .map((it) => ({
      bggId: Number(it.id),
      name: it.name?.value || '',
      yearPublished: it.yearpublished?.value ? Number(it.yearpublished.value) : undefined,
    }));
}

/** แปลง <item> ของ /thing เป็น object ที่ใช้ในระบบ */
function mapThing(it) {
  const ratings = it.statistics?.ratings ?? {};
  return {
    bggId: Number(it.id),
    name: pickPrimaryName(it.name),
    minPlayers: Number(it.minplayers?.value) || 1,
    maxPlayers: Number(it.maxplayers?.value) || 4,
    playtimeMin: Number(it.playingtime?.value) || 60,
    minPlaytime: Number(it.minplaytime?.value) || undefined,
    maxPlaytime: Number(it.maxplaytime?.value) || undefined,
    minAge: Number(it.minage?.value) || undefined,
    yearPublished: Number(it.yearpublished?.value) || undefined,
    thumbnail: it.thumbnail || '', // รูปเล็ก ~200px — ใช้กับ list/ตาราง
    image: it.image || it.thumbnail || '', // รูปเต็ม — ใช้กับการ์ด/หน้า detail
    description: (it.description || '').toString().replace(/&#10;/g, '\n'),
    bggAverage: Number(ratings.average?.value) || undefined,
    bggRating: Number(ratings.bayesaverage?.value) || undefined,
    bggWeight: Number(ratings.averageweight?.value) || undefined,
    usersRated: Number(ratings.usersrated?.value) || undefined,
    categories: linksOfType(it.link, 'boardgamecategory'),
    mechanics: linksOfType(it.link, 'boardgamemechanic'),
    designers: linksOfType(it.link, 'boardgamedesigner'),
  };
}

/** ดึงรายละเอียดหลายเกมในครั้งเดียว (ไม่เกิน 20 id) — id ที่ไม่มีบน BGG จะไม่อยู่ในผลลัพธ์ */
export async function detailMany(bggIds) {
  const ids = [...new Set(bggIds.map(Number))].filter((n) => Number.isInteger(n) && n > 0);
  if (!ids.length) return [];
  if (ids.length > MAX_IDS_PER_CALL) {
    throw new AppError(400, `ดึงได้ครั้งละไม่เกิน ${MAX_IDS_PER_CALL} เกม`);
  }
  const data = await fetchXml(`/thing?id=${ids.join(',')}&stats=1`);
  return arr(data?.items?.item).map(mapThing);
}

export async function detail(bggId) {
  const [game] = await detailMany([bggId]);
  if (!game) throw notFound('game not on BGG');
  return game;
}

// field ที่มาจาก BGG และควรอัปเดตตาม BGG เสมอ (รูป, เรตติ้ง, หมวด)
const BGG_FIELDS = [
  'thumbnail',
  'image',
  'yearPublished',
  'bggAverage',
  'bggRating',
  'bggWeight',
  'categories',
  'mechanics',
  'designers',
];
// field ที่ร้านอาจแก้เอง (ชื่อไทย, คำอธิบาย, เวลาเล่นจริง) → ทับเฉพาะตอนสร้าง หรือ overwrite=true
const LOCAL_FIELDS = ['name', 'description', 'minPlayers', 'maxPlayers', 'playtimeMin'];

const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

/**
 * สร้าง/อัปเดตเกมในคลังจากข้อมูล BGG ที่ดึงมาแล้ว (upsert ตาม bggId)
 * ไม่แตะ copies / shelf / sku / status ของร้าน
 * @returns {{ game: object, created: boolean }}
 */
export async function upsertFromBgg(info, { overwrite = false, req } = {}) {
  const existing = await Game.findOne({ bggId: info.bggId });
  let game;
  if (!existing) {
    game = await Game.create({
      bggId: info.bggId,
      ...pick(info, [...LOCAL_FIELDS, ...BGG_FIELDS]),
      createdBy: req?.user?._id,
    });
  } else {
    existing.set(pick(info, overwrite ? [...LOCAL_FIELDS, ...BGG_FIELDS] : BGG_FIELDS));
    game = await existing.save();
  }
  logAudit({
    req,
    actor: req?.user,
    action: existing ? 'update' : 'create',
    module: 'games',
    summary: `${existing ? 'อัปเดต' : 'นำเข้า'}เกม "${game.name}" จาก BGG #${info.bggId}`,
    targetType: 'Game',
    targetId: game._id,
    meta: { bggId: info.bggId, overwrite },
  });
  return { game, created: !existing };
}

/** POST /api/bgg/import/:bggId — ดึงจาก BGG แล้วสร้าง/อัปเดตเกมในคำสั่งเดียว */
export async function importGame(bggId, { overwrite = false, req } = {}) {
  return upsertFromBgg(await detail(bggId), { overwrite, req });
}

/** BGG "hot list" — trending boardgames right now. */
export async function hot() {
  const data = await fetchXml('/hot?type=boardgame');
  return arr(data?.items?.item)
    .slice(0, 50)
    .map((it) => ({
      rank: Number(it.rank),
      bggId: Number(it.id),
      name: it.name?.value || '',
      yearPublished: it.yearpublished?.value ? Number(it.yearpublished.value) : undefined,
      thumbnail: it.thumbnail?.value || '',
      image: it.thumbnail?.value || '', // hot list ของ BGG มีแค่รูปเล็ก — รูปเต็มได้ตอน import
    }));
}

// exported for tests
export const _internal = { cache };
