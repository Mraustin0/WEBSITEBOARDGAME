// Business rules ของการจอง — pure functions (ไม่แตะ DB) เพื่อ test ง่าย
// ค่าจริงมาจากหน้า "ตั้งค่าร้าน" (settings) — RULES คือค่า default ถ้ายังไม่ได้ตั้ง
import { HOUR_MS, MINUTE_MS } from '../../lib/time.js';

export const DEFAULT_DAYS = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
  day, // 0 = อาทิตย์ ... 6 = เสาร์
  open: '10:00',
  close: '24:00',
  closed: false,
}));

export const RULES = {
  PRICE_PER_PERSON_HOUR: 50, // บาท/คน/ชั่วโมง
  FLAT_3H_PER_PERSON: 130, // แพ็กเกจเหมา 3 ชม. (ถูกกว่ารายชั่วโมง 3 × 50 = 150)
  FLAT_HOURS: 3,
  MAX_ADVANCE_DAYS: 3, // จองล่วงหน้าได้ไม่เกิน 3 วัน
  MIN_HOURS: 1,
  MAX_HOURS: 6,
  EXTRA_SEATS: 2, // admin เสริมเก้าอี้ได้เกิน capacity โต๊ะไม่เกิน 2 ที่
  OVERTIME_GRACE_MIN: 10, // เล่นเกินเวลาไม่เกิน 10 นาที ไม่คิดเงินเพิ่ม
  START_GRACE_MIN: 15, // ยอมให้เวลาเริ่มย้อนหลังได้ 15 นาที (walk-in)
  OVERDUE_BLOCK_MIN: 30, // โต๊ะ/เกมที่เล่นเกินเวลายังไม่คืน กันไม่ให้จองช่วงใกล้ ๆ นี้
  CANCEL_CUTOFF_HOURS: 2, // สมาชิกยกเลิกเองได้ถึงก่อนเริ่ม 2 ชม. (0 = ยกเลิกได้ตลอดจนถึงเวลาเริ่ม)
  OPERATING: { enforce: false, days: DEFAULT_DAYS },
};

export const PACKAGES = ['hourly', 'flat3h'];

export function computeEnd(startAt, durationHours) {
  return new Date(startAt.getTime() + durationHours * HOUR_MS);
}

/**
 * ราคา
 *  - hourly: ชั่วโมง × (ผู้เล่น × ราคา/คน/ชม. + ค่าโต๊ะ/ชม.)
 *  - flat3h: ผู้เล่น × ราคาเหมา + 3 × ค่าโต๊ะ/ชม. (durationHours ต้องเป็น 3)
 */
export function calcPrice({
  players,
  durationHours,
  tableExtraPerHour = 0,
  pkg = 'hourly',
  rules = RULES,
}) {
  const perHour = players * rules.PRICE_PER_PERSON_HOUR + tableExtraPerHour;
  const total =
    pkg === 'flat3h'
      ? players * rules.FLAT_3H_PER_PERSON + rules.FLAT_HOURS * tableExtraPerHour
      : perHour * durationHours;
  return {
    total: Math.round(total),
    package: pkg,
    perPersonHour: rules.PRICE_PER_PERSON_HOUR,
    tableExtraPerHour,
    players,
    hours: durationHours,
  };
}

/**
 * คิดเงินตอนเช็คบิล: ราคาที่จองไว้ + ค่าเล่นเกินเวลา
 * เกินเวลาไม่เกิน OVERTIME_GRACE_MIN ไม่คิด, เกินกว่านั้นปัดขึ้นทีละครึ่งชั่วโมง คิดอัตรารายชั่วโมง
 * (อัตราตอนจอง — perPersonHour) เล่นน้อยกว่าที่จอง = จ่ายตามที่จอง
 */
export function calcCheckout({
  startedAt,
  now = new Date(),
  durationHours,
  players,
  tableExtraPerHour = 0,
  perPersonHour,
  bookedTotal,
  rules = RULES,
}) {
  const actualMinutes = Math.max(0, Math.round((now - startedAt) / MINUTE_MS));
  const overMinutes = actualMinutes - durationHours * 60;
  const overtimeHours =
    overMinutes > rules.OVERTIME_GRACE_MIN ? Math.ceil(overMinutes / 30) / 2 : 0;
  const perHour = players * (perPersonHour ?? rules.PRICE_PER_PERSON_HOUR) + tableExtraPerHour;
  const overtimeCharge = Math.round(overtimeHours * perHour);
  return {
    startedAt,
    endedAt: now,
    actualMinutes,
    bookedHours: durationHours,
    overtimeHours,
    bookedTotal,
    overtimeCharge,
    total: bookedTotal + overtimeCharge,
  };
}

/** คืน error message ถ้าเวลาเริ่มไม่อยู่ในช่วงที่จองได้, ไม่งั้น null */
export function bookingWindowError(startAt, now = new Date(), rules = RULES) {
  if (Number.isNaN(startAt.getTime())) return 'invalid startAt';
  if (startAt.getTime() < now.getTime() - rules.START_GRACE_MIN * MINUTE_MS) {
    return 'startAt is in the past';
  }
  if (startAt.getTime() > now.getTime() + rules.MAX_ADVANCE_DAYS * 24 * HOUR_MS) {
    return `can book at most ${rules.MAX_ADVANCE_DAYS} days in advance`;
  }
  return null;
}

/** ค่าต่อเวลา — คิดอัตรารายชั่วโมงเดียวกับตอนจอง (แพ็กเกจเหมาก็คิดรายชั่วโมงส่วนที่ต่อ) */
export function extensionCharge({
  hours,
  players,
  perPersonHour,
  tableExtraPerHour = 0,
  rules = RULES,
}) {
  const perHour = players * (perPersonHour ?? rules.PRICE_PER_PERSON_HOUR) + tableExtraPerHour;
  return Math.round(hours * perHour);
}

/** สมาชิกยกเลิกเองได้ไหม — ต้องยกเลิกก่อนเวลาเริ่มอย่างน้อย CANCEL_CUTOFF_HOURS */
export function cancelCutoffError(startAt, now = new Date(), rules = RULES) {
  const cutoff = rules.CANCEL_CUTOFF_HOURS ?? 0;
  if (cutoff > 0 && startAt.getTime() - now.getTime() < cutoff * HOUR_MS) {
    return `can cancel at most ${cutoff} hours before start — please contact staff`;
  }
  return null;
}

export function durationError(durationHours, rules = RULES) {
  if (durationHours < rules.MIN_HOURS || durationHours > rules.MAX_HOURS) {
    return `durationHours must be ${rules.MIN_HOURS}-${rules.MAX_HOURS}`;
  }
  return null;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TZ_OFFSET_MIN = 7 * 60; // เวลาไทย

/** 'HH:MM' → นาทีนับจากเที่ยงคืน ('24:00' = 1440) */
export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** ช่วงเวลาเปิดของวันนั้นเป็นนาที [open, close) — ปิดข้ามเที่ยงคืนได้ (close <= open) */
function dayWindow(cfg) {
  if (!cfg || cfg.closed) return null;
  const open = toMinutes(cfg.open);
  let close = toMinutes(cfg.close);
  if (close <= open) close += 1440;
  return [open, close];
}

/**
 * ตรวจว่าการจอง [startAt, endAt) อยู่ในเวลาทำการ (เวลาไทย) — คืน error message หรือ null
 * รองรับร้านที่ปิดหลังเที่ยงคืน (เช่น 18:00–02:00) โดยเช็คกะของเมื่อวานด้วย
 */
export function operatingHoursError(startAt, endAt, operating = RULES.OPERATING) {
  if (!operating?.enforce) return null;
  const days = operating.days?.length ? operating.days : DEFAULT_DAYS;
  const local = new Date(startAt.getTime() + TZ_OFFSET_MIN * 60 * 1000);
  const dow = local.getUTCDay();
  const startMin = local.getUTCHours() * 60 + local.getUTCMinutes();
  const lengthMin = Math.round((endAt - startAt) / MINUTE_MS);
  const find = (d) => days.find((x) => x.day === d);

  const today = dayWindow(find(dow));
  if (today && startMin >= today[0] && startMin + lengthMin <= today[1]) return null;

  const yesterday = dayWindow(find((dow + 6) % 7)); // กะเมื่อวานที่ลากข้ามเที่ยงคืน
  if (yesterday && startMin + 1440 >= yesterday[0] && startMin + 1440 + lengthMin <= yesterday[1]) {
    return null;
  }

  const cfg = find(dow);
  if (!cfg || cfg.closed) return `store is closed on ${DAY_NAMES[dow]}`;
  return `outside operating hours (${DAY_NAMES[dow]} ${cfg.open}-${cfg.close})`;
}

/** จำนวนชั่วโมงที่ร้านเปิดในวันนั้น (ใช้คำนวณอัตราการใช้โต๊ะ) */
export function openHoursOfDay(dow, operating = RULES.OPERATING) {
  const days = operating?.days?.length ? operating.days : DEFAULT_DAYS;
  const w = dayWindow(days.find((x) => x.day === dow));
  return w ? (w[1] - w[0]) / 60 : 0;
}

export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Mongo filter หา reservation ที่ชนกับช่วง [startAt, endAt)
 * - booked/playing ที่ช่วงเวลาทับกัน
 * - playing ที่เลยเวลาแต่ยังไม่คืน → ถือว่ายังไม่ว่าง ถ้าช่วงที่ขอเริ่มภายใน OVERDUE_BLOCK_MIN จากตอนนี้
 */
export function conflictFilter({ startAt, endAt }, now = new Date()) {
  const or = [{ endAt: { $gt: startAt } }];
  if (startAt.getTime() < now.getTime() + RULES.OVERDUE_BLOCK_MIN * MINUTE_MS) {
    or.push({ status: 'playing' });
  }
  return { status: { $in: ['booked', 'playing'] }, startAt: { $lt: endAt }, $or: or };
}
