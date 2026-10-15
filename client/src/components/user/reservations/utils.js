// ตัวช่วยเฉพาะหน้า "การจองของฉัน" (แสดงผลเวลาไทย, ราคา, สถานะ, ข้อความ error)
import { useEffect, useState } from 'react';
import { formatThaiDate, timeTH } from '../../../lib/date.js';
import { thaiError } from '../../../lib/booking.js';

const TZ = 'Asia/Bangkok';
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** เวลาปัจจุบัน (ms) ที่อัปเดตทุก `ms` — ใช้กับ countdown / เช็คเวลายกเลิก */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export const baht = (n) => `฿${Math.round(Number(n) || 0).toLocaleString('th-TH')}`;

/** YYYY-MM-DD ของ ISO ตามเวลาไทย */
export const ymdTH = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });

export const dateLabel = (iso) => formatThaiDate(ymdTH(iso));

export const timeRange = (r) => `${timeTH(r.startAt)}–${timeTH(r.endAt)} น.`;

/** รหัสสั้นของการจอง เช่น #A1B2C3 */
export const resCode = (id) =>
  `#${String(id || '')
    .slice(-6)
    .toUpperCase()}`;

export const coverOf = (game) => game?.image || game?.thumbnail || '';

/** 75 → "1 ชม. 15 นาที" */
export function minutesText(min) {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r} นาที`;
  return r ? `${h} ชม. ${r} นาที` : `${h} ชม.`;
}

/** "อีก 2 วัน" / "อีก 3 ชม." / "อีก 20 นาที" */
export function countdownLabel(iso, now) {
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return 'ถึงเวลาแล้ว';
  if (diff >= 24 * HOUR) return `อีก ${Math.floor(diff / (24 * HOUR))} วัน`;
  if (diff >= HOUR) return `อีก ${Math.floor(diff / HOUR)} ชม.`;
  return `อีก ${Math.max(1, Math.round(diff / MINUTE))} นาที`;
}

export const cutoffHours = (rules) => rules?.CANCEL_CUTOFF_HOURS ?? 2;

/** ยกเลิกเองได้ไหม (สมาชิกต้องยกเลิกก่อนเริ่ม CANCEL_CUTOFF_HOURS ชม.) */
export function canSelfCancel(r, rules, now) {
  const cutoff = cutoffHours(rules);
  return new Date(r.startAt).getTime() - now >= cutoff * HOUR;
}

export const cutoffText = (rules) =>
  `ยกเลิกเองได้ถึง ${cutoffHours(rules)} ชม. ก่อนเวลาเริ่ม — หลังจากนั้นติดต่อพนักงาน`;

/** ความคืบหน้าของโต๊ะที่กำลังเล่น */
export function sessionProgress(r, now) {
  const start = new Date(r.startedAt || r.startAt).getTime();
  const end = new Date(r.endAt).getTime();
  const total = Math.max(1, end - start);
  const pct = Math.min(100, Math.max(0, ((now - start) / total) * 100));
  const remainingMin = (end - now) / MINUTE;
  return { pct, remainingMin, overtime: remainingMin < 0 };
}

/** ประมาณค่าเกินเวลา (สูตรเดียวกับ server: เกิน grace คิดทีละครึ่งชั่วโมง) */
export function overtimeEstimate(r, now, rules) {
  const start = new Date(r.startedAt || r.startAt).getTime();
  const overMin = (now - start) / MINUTE - r.durationHours * 60;
  const grace = rules?.OVERTIME_GRACE_MIN ?? 10;
  if (overMin <= grace) return 0;
  const hours = Math.ceil(overMin / 30) / 2;
  const perPerson = r.price?.perPersonHour ?? rules?.PRICE_PER_PERSON_HOUR ?? 50;
  const perHour = r.players * perPerson + (r.price?.tableExtraPerHour ?? 0);
  return Math.round(hours * perHour);
}

export const STATUS = {
  booked: { label: 'จองแล้ว', cls: 'bg-mustard-light text-ink border border-mustard/60' },
  playing: { label: 'กำลังเล่น', cls: 'bg-brick-dark text-white' },
  completed: { label: 'เล่นจบแล้ว', cls: 'bg-forest-100 text-forest-800' },
  cancelled: { label: 'ยกเลิกแล้ว', cls: 'bg-slate-200 text-slate-700' },
  no_show: { label: 'ไม่มาตามนัด', cls: 'bg-brick-light text-brick-dark' },
};

export const ASSIST_TOPICS = [
  { key: 'tutorial', label: 'สอนเล่น', icon: 'fa-chalkboard-user' },
  { key: 'extension', label: 'ต่อเวลา', icon: 'fa-clock' },
  { key: 'game_issue', label: 'เกมมีปัญหา', icon: 'fa-puzzle-piece' },
  { key: 'other', label: 'อื่น ๆ', icon: 'fa-ellipsis' },
];

export const ASSIST_STATUS = {
  open: 'รอพนักงาน',
  acknowledged: 'พนักงานรับเรื่องแล้ว',
  resolved: 'เสร็จแล้ว',
  cancelled: 'ยกเลิกแล้ว',
};

const EXTRA_TH = [
  [/staff has already been called/, 'เรียกพนักงานเรื่องนี้ไปแล้ว — รอสักครู่'],
  [/can call staff only while playing/, 'เรียกพนักงานได้เฉพาะตอนกำลังเล่น'],
  [/request is already (\w+)/, 'คำขอนี้ปิดไปแล้ว'],
  [/flat3h package must be/, 'แพ็กเกจเหมา 3 ชม. ต้องจอง 3 ชม. พอดี'],
  [/reservation is already (\w+)/, 'การจองนี้จบไปแล้ว'],
  [/not found/, 'ไม่พบข้อมูล — ลองรีเฟรชหน้า'],
];

/** ข้อความ error ภาษาไทย (เพิ่มข้อความที่ thaiError ยังไม่รู้จัก) */
export function errText(err) {
  const msg = err?.message || '';
  for (const [re, th] of EXTRA_TH) if (re.test(msg)) return th;
  return thaiError(err);
}

/** แปลงผลลัพธ์ list ที่อาจมาเป็น array หรือ { items } */
export const asList = (data) => (Array.isArray(data) ? data : (data?.items ?? []));

// ปุ่ม/ชิปใช้ชุดคลาสแบรนด์ร่วมกับหน้าอื่น
export { BTN, chip } from '../brandUi.js';
