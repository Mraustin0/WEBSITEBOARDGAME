// สถานะการจอง (ไม่มี pending) + ฟังก์ชันช่วยอ่านข้อมูลการจอง
// tone = ชื่อสีใน index.css (available / reserved / occupied / maintenance)
export const STATUS = {
  booked: { label: 'จองล่วงหน้า', tone: 'available' },
  playing: { label: 'กำลังเล่น', tone: 'reserved' },
  completed: { label: 'ใช้งานแล้ว', tone: 'maintenance' },
  cancelled: { label: 'ยกเลิก', tone: 'occupied' },
  no_show: { label: 'ไม่มา', tone: 'occupied' },
};

export function statusOf(s) {
  return STATUS[s] ?? { label: s ?? '-', tone: 'maintenance' };
}

// ชื่อลูกค้า: สมาชิก -> username, walk-in -> ชื่อ/เบอร์
export function customerName(r) {
  return r?.user?.username ?? r?.customer?.name ?? r?.customer?.phone ?? 'ไม่ระบุชื่อ';
}

export function customerPhone(r) {
  return r?.customer?.phone ?? r?.user?.phone ?? '';
}

// รหัสโต๊ะ (table อาจเป็น object ที่ populate มา หรือเป็นแค่ id)
export function tableCode(r) {
  return typeof r?.table === 'object' ? (r.table?.code ?? r.table?.name ?? '-') : '-';
}

export function gameName(r) {
  return typeof r?.game === 'object' && r.game ? (r.game.name ?? r.game.title ?? '') : '';
}

// เวลาสิ้นสุด: ใช้ endAt ถ้ามี ไม่งั้นคำนวณจาก startAt + durationHours
export function endAtOf(r) {
  if (r?.endAt) return r.endAt;
  const ms = new Date(r.startAt).getTime() + (Number(r.durationHours) || 1) * 3600000;
  return new Date(ms).toISOString();
}
