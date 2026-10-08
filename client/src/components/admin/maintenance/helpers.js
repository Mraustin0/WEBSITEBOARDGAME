// ตัวช่วยของหน้า 8 ซ่อมบำรุง
export const PRIORITY = {
  high: { label: 'สูง (High)', tone: 'high' },
  medium: { label: 'ปานกลาง', tone: 'medium' },
  low: { label: 'ต่ำ (Low)', tone: 'low' },
};

export const baht = (n) => `฿${Number(n || 0).toLocaleString('th-TH')}`;

export function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}

// ชื่อของที่ซ่อม: เกม -> ชื่อเกม, โต๊ะ -> รหัสโต๊ะ (ถ้าถูกลบไปแล้วใช้หัวข้อแทน)
export function itemName(t) {
  return t.itemType === 'game' ? (t.game?.name ?? t.title) : (t.table?.code ?? t.title);
}

// แปลง err.details ให้เป็นข้อความอ่านง่าย
export function fmtDetails(d) {
  if (!d || typeof d !== 'object') return '';
  return Object.entries(d)
    .map(
      ([k, v]) =>
        `${k}: ${[].concat(typeof v === 'object' && !Array.isArray(v) ? JSON.stringify(v) : v).join(', ')}`,
    )
    .join(' • ');
}
