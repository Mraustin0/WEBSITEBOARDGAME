// ฟังก์ชันวันที่/เวลาตามเวลาไทย (Asia/Bangkok)
const TZ = 'Asia/Bangkok';
const DAY_MS = 86400000;

// วันนี้แบบ YYYY-MM-DD (ใช้กับ ?date= / ?from= / ?to=)
export function todayTH() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

// บวก/ลบวัน: addDays('2026-10-12', 1) -> '2026-10-13'
export function addDays(ymd, n) {
  const t = new Date(`${ymd}T00:00:00+07:00`).getTime() + n * DAY_MS;
  return new Date(t).toLocaleDateString('en-CA', { timeZone: TZ });
}

// แสดงวันที่ภาษาไทย เช่น "จ. 12 ต.ค. 2569"
export function formatThaiDate(ymd) {
  return new Date(`${ymd}T12:00:00+07:00`).toLocaleDateString('th-TH', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// แสดงเวลา "HH:mm" จาก ISO string
export function timeTH(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}

// วัน + เวลา (input) -> ISO string ส่งให้ API
export function toISO(ymd, hhmm) {
  return new Date(`${ymd}T${hhmm}:00+07:00`).toISOString();
}

// จำนวนนาทีนับจาก 00:00 ของวัน ymd (เวลาไทย)
export function minutesFromDayStart(iso, ymd) {
  return (new Date(iso).getTime() - new Date(`${ymd}T00:00:00+07:00`).getTime()) / 60000;
}

// จันทร์–อาทิตย์ ของสัปดาห์ที่มีวัน ymd
export function weekRange(ymd) {
  const dow = (new Date(`${ymd}T12:00:00+07:00`).getUTCDay() + 6) % 7; // จันทร์ = 0
  const from = addDays(ymd, -dow);
  return { from, to: addDays(from, 6) };
}

// วันแรก–วันสุดท้ายของเดือนที่มีวัน ymd
export function monthRange(ymd) {
  const [y, m] = ymd.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, '0');
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, '0')}` };
}
