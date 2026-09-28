// Business rules ของการจอง — pure functions (ไม่แตะ DB) เพื่อ test ง่าย
import { HOUR_MS, MINUTE_MS } from '../../lib/time.js';

export const RULES = {
  PRICE_PER_PERSON_HOUR: 50, // บาท/คน/ชั่วโมง
  MAX_ADVANCE_DAYS: 3, // จองล่วงหน้าได้ไม่เกิน 3 วัน
  MIN_HOURS: 1,
  MAX_HOURS: 6,
  START_GRACE_MIN: 15, // ยอมให้เวลาเริ่มย้อนหลังได้ 15 นาที (walk-in)
  OVERDUE_BLOCK_MIN: 30, // โต๊ะ/เกมที่เล่นเกินเวลายังไม่คืน กันไม่ให้จองช่วงใกล้ ๆ นี้
  FLAT_3H_PER_PERSON: 130, // แพ็กเกจเหมา 3 ชม. (ถูกกว่ารายชั่วโมง 3 × 50 = 150)
  FLAT_HOURS: 3,
  EXTRA_SEATS: 2, // admin เสริมเก้าอี้ได้เกิน capacity โต๊ะไม่เกิน 2 ที่
  OVERTIME_GRACE_MIN: 10, // เล่นเกินเวลาไม่เกิน 10 นาที ไม่คิดเงินเพิ่ม
};

export const PACKAGES = ['hourly', 'flat3h'];

export function computeEnd(startAt, durationHours) {
  return new Date(startAt.getTime() + durationHours * HOUR_MS);
}

/**
 * ราคา
 *  - hourly: ชั่วโมง × (ผู้เล่น × 50 + ค่าโต๊ะ/ชม.)
 *  - flat3h: ผู้เล่น × 130 + 3 × ค่าโต๊ะ/ชม. (durationHours ต้องเป็น 3)
 */
export function calcPrice({ players, durationHours, tableExtraPerHour = 0, pkg = 'hourly' }) {
  const perHour = players * RULES.PRICE_PER_PERSON_HOUR + tableExtraPerHour;
  const total =
    pkg === 'flat3h'
      ? players * RULES.FLAT_3H_PER_PERSON + RULES.FLAT_HOURS * tableExtraPerHour
      : perHour * durationHours;
  return {
    total: Math.round(total),
    package: pkg,
    perPersonHour: RULES.PRICE_PER_PERSON_HOUR,
    tableExtraPerHour,
    players,
    hours: durationHours,
  };
}

/**
 * คิดเงินตอนเช็คบิล: ราคาที่จองไว้ + ค่าเล่นเกินเวลา
 * เกินเวลาไม่เกิน OVERTIME_GRACE_MIN ไม่คิด, เกินกว่านั้นปัดขึ้นทีละครึ่งชั่วโมง คิดอัตรารายชั่วโมง
 * เล่นน้อยกว่าที่จอง = จ่ายตามที่จอง
 */
export function calcCheckout({
  startedAt,
  now = new Date(),
  durationHours,
  players,
  tableExtraPerHour = 0,
  bookedTotal,
}) {
  const actualMinutes = Math.max(0, Math.round((now - startedAt) / MINUTE_MS));
  const overMinutes = actualMinutes - durationHours * 60;
  const overtimeHours =
    overMinutes > RULES.OVERTIME_GRACE_MIN ? Math.ceil(overMinutes / 30) / 2 : 0;
  const perHour = players * RULES.PRICE_PER_PERSON_HOUR + tableExtraPerHour;
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
export function bookingWindowError(startAt, now = new Date()) {
  if (Number.isNaN(startAt.getTime())) return 'invalid startAt';
  if (startAt.getTime() < now.getTime() - RULES.START_GRACE_MIN * MINUTE_MS) {
    return 'startAt is in the past';
  }
  if (startAt.getTime() > now.getTime() + RULES.MAX_ADVANCE_DAYS * 24 * HOUR_MS) {
    return `can book at most ${RULES.MAX_ADVANCE_DAYS} days in advance`;
  }
  return null;
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
