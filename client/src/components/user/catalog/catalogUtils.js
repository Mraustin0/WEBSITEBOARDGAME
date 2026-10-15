// ตัวช่วยของหน้าคลังเกม (สมาชิก): สถานะกล่อง "ตอนนี้" / "ช่วงเวลาที่เลือก", ตัวกรอง, ลิงก์ไปหน้าจอง
import { GAME_REASON } from '../../../lib/booking.js';

const TZ = 'Asia/Bangkok';

// ---------- สถานะ ----------

/** tone → คลาสสี badge (ว่าง = teal, จองแล้ว = มัสตาร์ด, กำลังเล่น = แดงอิฐ, ส่งซ่อม/ไม่ว่าง = เทาอุ่น) */
export const TONE = {
  ok: 'bg-teal text-white',
  busy: 'bg-brick-dark text-white',
  booked: 'bg-mustard text-ink',
  repair: 'bg-slate-600 text-white',
  muted: 'bg-slate-500 text-white',
};

/** สถานะ "ตอนนี้" จากจำนวนกล่องบนชั้น / กำลังเล่น / ส่งซ่อม */
export function nowStatus(g) {
  const copies = g.copies ?? 1;
  const vault = g.copiesInVault ?? g.stockCount ?? 0;
  const play = g.copiesInPlay ?? 0;
  const repair = g.copiesInRepair ?? 0;
  if (g.status === 'maintenance' || (repair >= copies && vault === 0)) {
    return { ok: false, tone: 'repair', label: 'ส่งซ่อม', short: 'ส่งซ่อม' };
  }
  if (vault > 0) {
    return { ok: true, tone: 'ok', label: `ว่าง ${vault} กล่อง`, short: 'ว่าง' };
  }
  if (play > 0) {
    return { ok: false, tone: 'busy', label: 'กำลังเล่นทุกกล่อง', short: 'กำลังเล่น' };
  }
  return { ok: false, tone: 'muted', label: 'ตอนนี้ไม่มีกล่องว่าง', short: 'ไม่ว่าง' };
}

/** รหัสโต๊ะที่ใช้เกมนี้อยู่ในช่วงเวลา (ไม่ซ้ำ ตัด null) */
export function tablesOf(entry) {
  return [...new Set((entry?.inUseAt ?? []).map((u) => u.table).filter(Boolean))];
}

/** สถานะในช่วงเวลาที่เลือก จาก GET /reservations/availability (games[]) */
export function slotStatus(entry) {
  if (!entry.reason) {
    return {
      ok: true,
      tone: 'ok',
      label: `ว่าง ${entry.copiesLeft ?? 0} กล่อง`,
      short: 'ว่าง',
    };
  }
  if (entry.reason === 'booked') {
    const tables = tablesOf(entry);
    return {
      ok: false,
      tone: 'booked',
      label: tables.length ? `จองแล้วทุกกล่อง (โต๊ะ ${tables.join(', ')})` : GAME_REASON.booked,
      short: 'จองแล้ว',
    };
  }
  if (entry.reason === 'maintenance') {
    return { ok: false, tone: 'repair', label: GAME_REASON.maintenance, short: 'ส่งซ่อม' };
  }
  return {
    ok: false,
    tone: 'muted',
    label: GAME_REASON[entry.reason] ?? 'ไม่ว่าง',
    short: GAME_REASON[entry.reason] ?? 'ไม่ว่าง',
  };
}

// ---------- ตัวกรอง ----------

export const PAX_OPTIONS = [
  { id: 'all', label: 'กี่คนก็ได้', lo: null, hi: null },
  { id: '1-2', label: '1–2 คน', lo: 1, hi: 2 },
  { id: '3-4', label: '3–4 คน', lo: 3, hi: 4 },
  { id: '5+', label: '5+ คน', lo: 5, hi: Infinity },
];

/** เกมเล่นได้ด้วยจำนวนผู้เล่น n ใดสักค่าในช่วง [lo, hi] (minPlayers ≤ n ≤ maxPlayers) */
export function fitsPlayers(g, lo, hi) {
  if (lo == null) return true;
  const min = g.minPlayers ?? 1;
  const max = g.maxPlayers ?? min;
  return min <= hi && max >= lo;
}

export const SORT_OPTIONS = [
  { id: 'rating', label: 'คะแนน BGG สูงสุด' },
  { id: 'name', label: 'ชื่อ A–Z' },
  { id: 'time', label: 'เล่นจบเร็วก่อน' },
];

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

export function sortGames(list, sort) {
  const out = [...list];
  const byName = (a, b) => (a.name || '').localeCompare(b.name || '', 'th');
  if (sort === 'name') return out.sort(byName);
  if (sort === 'time') {
    return out.sort(
      (a, b) => (a.playtimeMin ?? Infinity) - (b.playtimeMin ?? Infinity) || byName(a, b),
    );
  }
  // rating: ไม่มีคะแนนไว้ท้ายสุด
  return out.sort((a, b) => (num(b.rating) ?? -1) - (num(a.rating) ?? -1) || byName(a, b));
}

/** หมวดหมู่ที่มีในเกมที่โหลดมา เรียงตามจำนวนเกม → [{ name, count }] */
export function categoryCounts(games) {
  const map = new Map();
  for (const g of games) {
    for (const c of new Set(g.categories ?? [])) map.set(c, (map.get(c) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

// ---------- ลิงก์ / ข้อความ ----------

/** ลิงก์ไปหน้าจอง (FloorPlan อ่าน ?game= — พารามิเตอร์อื่นไม่รู้จักก็ข้ามได้) */
export function bookingHref(gameId, slot) {
  const qs = new URLSearchParams({ game: gameId });
  if (slot) {
    qs.set('date', slot.ymd);
    qs.set('time', slot.time);
    qs.set('hours', String(slot.hours));
    if (slot.players) qs.set('players', String(slot.players));
  }
  return `/booking?${qs}`;
}

/** คำอธิบายจาก BGG มี HTML entity (&#10; &mdash; ...) → ข้อความล้วน (DOMParser ไม่รันสคริปต์/ไม่โหลดรูป) */
export function plainText(html) {
  if (!html) return '';
  let text = String(html);
  try {
    const doc = new DOMParser().parseFromString(`<body>${text}</body>`, 'text/html');
    text = doc.body.textContent ?? '';
  } catch {
    /* ใช้ข้อความเดิม */
  }
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

export const playersLabel = (g) =>
  g.minPlayers && g.maxPlayers && g.minPlayers !== g.maxPlayers
    ? `${g.minPlayers}–${g.maxPlayers} คน`
    : `${g.minPlayers ?? g.maxPlayers ?? '-'} คน`;

export const playtimeLabel = (g) => (g.playtimeMin ? `${g.playtimeMin} นาที` : '-');

export const dateTH = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('th-TH', {
        timeZone: TZ,
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';
