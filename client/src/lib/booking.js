// ตัวช่วยฝั่งผู้ใช้สำหรับการจอง: วันที่จองได้, รอบเวลา, ข้อความ error ภาษาไทย
// ค่าทั้งหมดอ่านจาก GET /api/reservations/rules (admin ตั้งในหน้า "ตั้งค่าร้าน")
import { addDays, todayTH, toISO } from './date.js';

const TZ = 'Asia/Bangkok';
const MINUTE = 60 * 1000;

const pad = (n) => String(n).padStart(2, '0');
export const toHHMM = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
export const fromHHMM = (s) => {
  const [h, m] = String(s).split(':').map(Number);
  return h * 60 + (m || 0);
};

/** วันในสัปดาห์ (0 = อาทิตย์) ของวันที่ YYYY-MM-DD ตามเวลาไทย */
export const dowOf = (ymd) => new Date(`${ymd}T12:00:00+07:00`).getUTCDay();

/** เวลาเปิด–ปิดของวันนั้น { open, close (นาที), closed } — ไม่มีข้อมูลใช้ 10:00–24:00 */
export function openHours(rules, ymd) {
  const cfg = rules?.OPERATING?.days?.find((d) => d.day === dowOf(ymd));
  if (!cfg) return { open: 600, close: 1440, closed: false };
  const open = fromHHMM(cfg.open);
  let close = fromHHMM(cfg.close);
  // ปิดหลังเที่ยงคืน (เช่น 18:00–02:00 หรือ 10:00–00:00) → นับ close เป็นของวันถัดไป (เหมือน server)
  if (close <= open) close += 1440;
  return { open, close, closed: Boolean(cfg.closed) };
}

/** วันที่จองได้: วันนี้ ถึง วันนี้ + MAX_ADVANCE_DAYS (เวลาไทย) */
export function bookingDates(rules) {
  const today = todayTH();
  const max = rules?.MAX_ADVANCE_DAYS ?? 3;
  return Array.from({ length: max + 1 }, (_, i) => {
    const ymd = addDays(today, i);
    const label =
      i === 0
        ? 'วันนี้'
        : i === 1
          ? 'พรุ่งนี้'
          : new Date(`${ymd}T12:00:00+07:00`).toLocaleDateString('th-TH', {
              timeZone: TZ,
              weekday: 'short',
            });
    const display = new Date(`${ymd}T12:00:00+07:00`).toLocaleDateString('th-TH', {
      timeZone: TZ,
      day: 'numeric',
      month: 'short',
    });
    return { ymd, label, display, closed: openHours(rules, ymd).closed };
  });
}

/**
 * เวลาเริ่มที่เลือกได้ของวันนั้น (ทีละ stepMin นาที) — ตัดรอบที่ผ่านไปแล้ว / เกินวันจองล่วงหน้า /
 * เล่นไม่ครบ MIN_HOURS ก่อนร้านปิด
 */
export function startTimes(rules, ymd, { stepMin = 60, now = new Date() } = {}) {
  const { open, close, closed } = openHours(rules, ymd);
  if (closed) return [];
  const minHours = rules?.MIN_HOURS ?? 1;
  const grace = (rules?.START_GRACE_MIN ?? 15) * MINUTE;
  // จองล่วงหน้า N วัน = นับตามปฏิทินไทย (วันสุดท้ายจองได้ทั้งวัน) — ตรงกับ server
  const today = now.toLocaleDateString('en-CA', { timeZone: TZ });
  if (ymd > addDays(today, rules?.MAX_ADVANCE_DAYS ?? 3)) return [];
  const out = [];
  // เวลาเริ่มอยู่ในวันที่เลือกเท่านั้น (ก่อน 24:00) แต่เล่นยาวข้ามเที่ยงคืนได้ถ้าร้านยังเปิด
  for (let m = open; m < 1440 && m + minHours * 60 <= close; m += stepMin) {
    const hhmm = toHHMM(m);
    const t = new Date(toISO(ymd, hhmm)).getTime();
    if (t < now.getTime() - grace) continue;
    out.push(hhmm);
  }
  return out;
}

/** ชั่วโมงที่เลือกได้เมื่อเริ่มเวลา hhmm (MIN_HOURS..MAX_HOURS ทีละ 0.5 และไม่เกินเวลาปิด) */
export function durationOptions(rules, ymd, hhmm) {
  const min = rules?.MIN_HOURS ?? 1;
  const max = rules?.MAX_HOURS ?? 6;
  const { close } = openHours(rules, ymd);
  const left = hhmm ? (close - fromHHMM(hhmm)) / 60 : max;
  const out = [];
  for (let h = min; h <= Math.min(max, left) + 1e-9; h += 0.5) out.push(h);
  return out;
}

export const hoursLabel = (h) =>
  Number.isInteger(h) ? `${h} ชม.` : `${Math.floor(h)} ชม. 30 นาที`;

/** ISO ของเวลาเริ่ม (เวลาไทย) */
export const startISO = (ymd, hhmm) => toISO(ymd, hhmm);

// ---------- ข้อความภาษาไทย ----------

export const TABLE_REASON = {
  closed: 'ปิดใช้งาน',
  booked: 'ไม่ว่างช่วงนี้',
  too_small: 'ที่นั่งไม่พอ',
};

export const GAME_REASON = {
  booked: 'จองแล้วทุกกล่อง',
  maintenance: 'ส่งซ่อม',
  player_count: 'จำนวนผู้เล่นไม่ตรงกับเกม',
};

const MESSAGE_TH = [
  [/startAt is in the past/, 'เวลาที่เลือกผ่านไปแล้ว'],
  [/can book at most (\d+) days in advance/, 'จองล่วงหน้าได้ไม่เกิน $1 วัน'],
  [/store is closed/, 'ร้านปิดในวันที่เลือก'],
  [/outside operating hours \((.*)\)/, 'อยู่นอกเวลาเปิดร้าน ($1)'],
  [/durationHours must be ([\d.]+)-([\d.]+)/, 'จองได้ครั้งละ $1–$2 ชม.'],
  [/table (\S+) is already booked/, 'โต๊ะ $1 มีคนจองช่วงนี้แล้ว'],
  [/table (\S+) seats up to (\d+) players/, 'โต๊ะ $1 นั่งได้ไม่เกิน $2 คน'],
  [/(.+) needs (\d+)-(\d+) players/, '$1 เล่นได้ $2–$3 คน'],
  [/you already have a reservation overlapping/, 'คุณมีการจองอื่นในช่วงเวลานี้แล้ว'],
  [/(.+) has no free copy right now/, '$1 ไม่มีกล่องว่างตอนนี้'],
  [
    /all (\d+) available copies of (.+) are booked for this time/,
    '$2 จองแล้วครบทั้ง $1 กล่องในช่วงนี้',
  ],
  [/(.+) is already booked for this time/, '$1 มีคนจองแล้วในช่วงนี้'],
  [/the table is booked right after/, 'โต๊ะนี้มีคิวจองต่อ — ต่อเวลาไม่ได้'],
  [/you have another reservation right after/, 'คุณมีการจองอื่นต่อจากนี้ — ต่อเวลาไม่ได้'],
  [
    /total duration cannot exceed (\d+) hours/,
    'รวมแล้วเล่นได้ไม่เกิน $1 ชม. — ถ้าอยากเล่นนานกว่านี้ติดต่อพนักงาน',
  ],
  [/reservation already started/, 'เริ่มเล่นแล้ว ยกเลิกการจองไม่ได้ — กดคืนเกมแทน'],
  [/cannot cancel a (\w+) reservation/, 'ยกเลิกการจองนี้ไม่ได้แล้ว'],
  [/cannot extend/, 'ต่อเวลาไม่ได้'],
  [
    /can cancel at most (\d+) hours before start/,
    'ยกเลิกเองได้ถึง $1 ชม. ก่อนเวลาเริ่ม — หลังจากนั้นติดต่อพนักงาน',
  ],
  [/cannot edit a (\w+) reservation/, 'แก้ไขการจองนี้ไม่ได้แล้ว'],
  [/reservation has not started yet/, 'ยังไม่ถึงเวลาเริ่มเล่น'],
  [/table (\S+) is closed/, 'โต๊ะ $1 ปิดใช้งาน'],
  [/(.+) is under maintenance/, '$1 ส่งซ่อมอยู่'],
  [/validation failed/, 'ข้อมูลไม่ถูกต้อง ลองตรวจอีกครั้ง'],
];

/** แปลงข้อความ error จาก server เป็นภาษาไทย (ไม่รู้จัก = คืนข้อความเดิม) */
export function thaiError(err) {
  const msg = err?.message || String(err || '');
  for (const [re, th] of MESSAGE_TH) if (re.test(msg)) return msg.replace(re, th);
  if (err?.status === 0 || /Failed to fetch/.test(msg)) return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้';
  return msg || 'เกิดข้อผิดพลาด';
}
