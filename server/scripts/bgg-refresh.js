// อัปเดตรูป / เรตติ้ง / weight / หมวด ของเกมในคลังที่มี bggId จาก BoardGameGeek
//   npm run bgg:refresh            → เฉพาะเกมที่ยังไม่มีรูป (image ว่าง)
//   npm run bgg:refresh -- --all   → ทุกเกมที่มี bggId (ข้อมูล BGG ล่าสุด)
// ไม่แตะชื่อ / คำอธิบาย / copies / ชั้นวาง / สถานะ ที่ร้านตั้งเอง
import { env } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { logger } from '../src/lib/logger.js';
import { flushAudit } from '../src/lib/audit.js';
import { Game } from '../src/models/game.model.js';
import { MAX_IDS_PER_CALL, detailMany, upsertFromBgg } from '../src/modules/bgg/bgg.service.js';

const all = process.argv.includes('--all');
// BGG ขอให้เว้นช่วงระหว่าง request — ห่างกันไว้ก่อนกันโดน 429
const GAP_MS = 5000;

if (!env.BGG_TOKEN) {
  logger.error('BGG_TOKEN not set — put it in server/.env first');
  process.exit(1);
}

await connectDb(env.MONGODB_URI);

const filter = { bggId: { $gt: 0 } };
if (!all) filter.$or = [{ image: { $in: [null, ''] } }, { image: { $exists: false } }];
const ids = (await Game.find(filter).select('bggId').lean()).map((g) => g.bggId);
logger.info(`${ids.length} game(s) to refresh${all ? ' (--all)' : ' (missing image)'}`);

let updated = 0;
let failed = 0;
for (let i = 0; i < ids.length; i += MAX_IDS_PER_CALL) {
  if (i > 0) await new Promise((r) => setTimeout(r, GAP_MS));
  const chunk = ids.slice(i, i + MAX_IDS_PER_CALL);
  try {
    const infos = await detailMany(chunk);
    for (const info of infos) await upsertFromBgg(info);
    updated += infos.length;
    const missing = chunk.filter((id) => !infos.some((x) => x.bggId === id));
    if (missing.length) logger.warn(`not found on BGG: ${missing.join(', ')}`);
  } catch (err) {
    failed += chunk.length;
    logger.warn(`chunk ${chunk.join(',')} failed: ${err.message}`);
    if (err.status === 503 && err.details?.code?.startsWith('BGG_TOKEN')) break; // token เสีย ไม่ต้องลองต่อ
  }
}

await flushAudit();
logger.info(`done: updated ${updated}, failed ${failed}`);
await disconnectDb();
