// สถานะการจอง + ฟังก์ชันช่วยอ่านข้อมูลการจอง
// tone = ชื่อสีใน index.css (available / reserved / occupied / maintenance)
// รองรับ "รอยืนยัน" ตาม API Develop: booked + ยังไม่มี confirmedAt + source เป็น online
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

/** การจองออนไลน์ที่ยังไม่ได้ยืนยัน (API: confirmed=false) */
export function needsConfirm(r) {
  if (!r || r.status !== 'booked') return false;
  if (r.confirmedAt) return false;
  // walk-in / จองแทนลูกค้า ยืนยันอัตโนมัติแล้ว — เหลือเฉพาะ online
  if (r.source && r.source !== 'online') return false;
  return true;
}

/** label + tone สำหรับแสดงบนการ์ด (รวมรอยืนยัน) */
export function displayStatus(r) {
  if (needsConfirm(r)) {
    return { label: 'รอยืนยัน', tone: 'reserved' };
  }
  return statusOf(r?.status);
}

// ชื่อลูกค้า: สมาชิก -> displayName / username, walk-in -> ชื่อ / เบอร์
export function customerName(r) {
  const u = r?.user;
  if (u && typeof u === 'object') {
    const name = (u.displayName || u.username || '').trim();
    if (name) return name;
  }
  const c = r?.customer;
  if (c && typeof c === 'object') {
    const name = (c.name || '').trim();
    if (name) return name;
    const phone = (c.phone || '').trim();
    if (phone) return phone;
  }
  return 'ไม่ระบุชื่อ';
}

export function customerPhone(r) {
  const fromCustomer = (r?.customer?.phone || '').trim();
  if (fromCustomer) return fromCustomer;
  const u = r?.user;
  if (u && typeof u === 'object') return (u.phone || '').trim();
  return '';
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
