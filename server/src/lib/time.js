// เวลาในระบบเก็บเป็น UTC แต่ "วัน" ของร้านนับตามเวลาไทย
export const TZ = 'Asia/Bangkok';
const TZ_OFFSET_MS = 7 * 60 * 60 * 1000; // ไทยไม่มี DST
const DAY_MS = 24 * 60 * 60 * 1000;

export const HOUR_MS = 60 * 60 * 1000;
export const MINUTE_MS = 60 * 1000;

/** 'YYYY-MM-DD' (เวลาไทย) ของ Date */
export function toLocalDateString(date) {
  return new Date(date.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

/** ช่วงเวลา [start, end) ของวันตามเวลาไทย */
export function localDayRange(dateStr) {
  const start = new Date(`${dateStr}T00:00:00+07:00`);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

/** ช่วงหลายวัน from..to (รวมทั้งสองวัน) ตามเวลาไทย */
export function localRange(fromStr, toStr) {
  return { start: localDayRange(fromStr).start, end: localDayRange(toStr).end };
}

/** list ของ 'YYYY-MM-DD' ตั้งแต่ from ถึง to */
export function eachLocalDate(fromStr, toStr) {
  const out = [];
  let t = localDayRange(fromStr).start.getTime();
  const end = localDayRange(toStr).start.getTime();
  while (t <= end && out.length < 400) {
    out.push(toLocalDateString(new Date(t)));
    t += DAY_MS;
  }
  return out;
}

export function addDays(dateStr, n) {
  return toLocalDateString(new Date(localDayRange(dateStr).start.getTime() + n * DAY_MS));
}
