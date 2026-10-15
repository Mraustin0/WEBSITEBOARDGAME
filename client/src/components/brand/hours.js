// สรุปเวลาเปิดร้านจาก rules.OPERATING (GET /reservations/rules) เป็นข้อความสั้น ๆ ภาษาไทย
const DAY_TH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสฯ', 'ศุกร์', 'เสาร์'];

/** คืนข้อความ เช่น "เปิดทุกวัน 10:00–24:00 น." หรือ null ถ้าไม่มีข้อมูล */
export function openingHoursText(operating) {
  const days = operating?.days;
  if (!Array.isArray(days) || days.length === 0) return null;
  const open = days.filter((d) => !d.closed);
  if (open.length === 0) return null;
  const same = open.every((d) => d.open === open[0].open && d.close === open[0].close);
  if (same) {
    const range = `${open[0].open}–${open[0].close} น.`;
    if (open.length === 7) return `เปิดทุกวัน ${range}`;
    const closed = days
      .filter((d) => d.closed)
      .map((d) => DAY_TH[d.day])
      .join(', ');
    return `เปิด ${range} · หยุดวัน${closed}`;
  }
  // เวลาไม่เท่ากันทุกวัน → บอกเวลาของวันนี้ (เวลาไทย UTC+7)
  const dow = new Date(Date.now() + 7 * 3600 * 1000).getUTCDay();
  const today = days.find((d) => d.day === dow);
  if (!today) return null;
  return today.closed ? 'วันนี้ร้านหยุด' : `วันนี้เปิด ${today.open}–${today.close} น.`;
}
