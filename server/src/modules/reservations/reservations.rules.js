// Business rules ของการจอง — pure functions (ไม่แตะ DB) เพื่อ test ง่าย
import { HOUR_MS, MINUTE_MS } from '../../lib/time.js';

export const RULES = {
  PRICE_PER_PERSON_HOUR: 50, // บาท/คน/ชั่วโมง
  MAX_ADVANCE_DAYS: 3, // จองล่วงหน้าได้ไม่เกิน 3 วัน
  MIN_HOURS: 1,
  MAX_HOURS: 6,
  START_GRACE_MIN: 15, // ยอมให้เวลาเริ่มย้อนหลังได้ 15 นาที (walk-in)
  OVERDUE_BLOCK_MIN: 30, // โต๊ะ/เกมที่เล่นเกินเวลายังไม่คืน กันไม่ให้จองช่วงใกล้ ๆ นี้
};

export function computeEnd(startAt, durationHours) {
  return new Date(startAt.getTime() + durationHours * HOUR_MS);
}

export function calcPrice({ players, durationHours, tableExtraPerHour = 0 }) {
  const perHour = players * RULES.PRICE_PER_PERSON_HOUR + tableExtraPerHour;
  return {
    total: Math.round(perHour * durationHours),
    perPersonHour: RULES.PRICE_PER_PERSON_HOUR,
    tableExtraPerHour,
    players,
    hours: durationHours,
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
