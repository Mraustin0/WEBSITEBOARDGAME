// ตรวจข้อมูลในฟอร์มฝั่งหน้าเว็บ — กฎชุดเดียวกับ server/src/lib/validators.js (แก้ที่หนึ่งต้องแก้อีกที่)
// แต่ละฟังก์ชันคืน "ข้อความ error ภาษาไทย" หรือ '' ถ้าถูกต้อง

const USERNAME_RE = /^[A-Za-z0-9][A-Za-z0-9_.]{2,31}$/;
const PERSON_NAME_RE = /^[\p{L}\p{M}\p{N} .'\-_()]+$/u;
const HAS_LETTER_RE = /\p{L}/u;
const PHONE_RE = /^0\d{8,9}$/;
const LINE_ID_RE = /^@?[a-z0-9._-]{4,20}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TABLE_CODE_RE = /^[A-Za-z0-9-]+$/;

const str = (v) => (v == null ? '' : String(v)).trim();

/** เบอร์โทรแบบตัวเลขล้วน (ตัด - ช่องว่าง วงเล็บ, +66 → 0) */
export const normalizePhone = (v) =>
  str(v)
    .replace(/[\s\-().]/g, '')
    .replace(/^\+66/, '0');

export function vUsername(v) {
  const s = str(v);
  if (!s) return 'กรอกชื่อผู้ใช้';
  if (s.length < 3) return 'ชื่อผู้ใช้อย่างน้อย 3 ตัวอักษร';
  if (s.length > 32) return 'ชื่อผู้ใช้ไม่เกิน 32 ตัวอักษร';
  if (!USERNAME_RE.test(s)) return 'ใช้ได้เฉพาะภาษาอังกฤษ ตัวเลข _ และ . (ไม่มีช่องว่าง)';
  return '';
}

export function vEmail(v, { required = true } = {}) {
  const s = str(v);
  if (!s) return required ? 'กรอกอีเมล' : '';
  if (s.length > 254 || !EMAIL_RE.test(s)) return 'รูปแบบอีเมลไม่ถูกต้อง เช่น name@example.com';
  return '';
}

/** รหัสผ่านใหม่: ≥ 8 ตัว มีตัวอักษรภาษาอังกฤษและตัวเลข */
export function vNewPassword(v) {
  const s = v ?? '';
  if (!s) return 'กรอกรหัสผ่าน';
  if (s.length < 8) return 'รหัสผ่านอย่างน้อย 8 ตัวอักษร';
  if (s.length > 128) return 'รหัสผ่านยาวเกินไป';
  if (!/[A-Za-z]/.test(s)) return 'ต้องมีตัวอักษรภาษาอังกฤษอย่างน้อย 1 ตัว';
  if (!/\d/.test(s)) return 'ต้องมีตัวเลขอย่างน้อย 1 ตัว';
  return '';
}

export function vConfirm(password, confirm) {
  if (!confirm) return 'ยืนยันรหัสผ่านอีกครั้ง';
  return password === confirm ? '' : 'รหัสผ่านไม่ตรงกัน';
}

/** ชื่อคน / ชื่อที่แสดง / ชื่อลูกค้า */
export function vPersonName(v, { required = false } = {}) {
  const s = str(v);
  if (!s) return required ? 'กรอกชื่อ' : '';
  if (s.length < 2) return 'ชื่ออย่างน้อย 2 ตัวอักษร';
  if (s.length > 80) return 'ชื่อไม่เกิน 80 ตัวอักษร';
  if (!PERSON_NAME_RE.test(s)) return 'ชื่อมีอักขระพิเศษที่ใช้ไม่ได้';
  if (!HAS_LETTER_RE.test(s)) return 'ชื่อต้องมีตัวอักษร';
  return '';
}

/** เบอร์โทรไทย 9–10 หลัก ขึ้นต้นด้วย 0 */
export function vPhone(v, { required = false } = {}) {
  const s = normalizePhone(v);
  if (!s) return required ? 'กรอกเบอร์โทร' : '';
  if (!/^\d+$/.test(s)) return 'เบอร์โทรต้องเป็นตัวเลข';
  if (!PHONE_RE.test(s)) return 'เบอร์โทรไม่ถูกต้อง (เช่น 0812345678 หรือ 021234567)';
  return '';
}

export function vLineId(v) {
  const s = str(v);
  if (!s) return '';
  return LINE_ID_RE.test(s) ? '' : 'LINE ID 4–20 ตัว ใช้ a-z 0-9 . _ - เท่านั้น';
}

export function vTableCode(v) {
  const s = str(v);
  if (!s) return 'กรอกรหัสโต๊ะ';
  if (s.length > 10) return 'รหัสโต๊ะไม่เกิน 10 ตัว';
  return TABLE_CODE_RE.test(s) ? '' : 'ใช้ได้เฉพาะภาษาอังกฤษ ตัวเลข และ - (เช่น A1, VIP-2)';
}

/** ตัวเลขในช่วง (ใช้กับ จำนวนคน / ราคา / นาที ฯลฯ) */
export function vNumber(v, { min, max, integer = false, required = true, label = 'ค่า' } = {}) {
  if (v === '' || v == null) return required ? `กรอก${label}` : '';
  const n = Number(v);
  if (!Number.isFinite(n)) return `${label}ต้องเป็นตัวเลข`;
  if (integer && !Number.isInteger(n)) return `${label}ต้องเป็นจำนวนเต็ม`;
  if (min != null && n < min) return `${label}ต้องไม่น้อยกว่า ${min}`;
  if (max != null && n > max) return `${label}ต้องไม่เกิน ${max}`;
  return '';
}

/** ความยาวข้อความ */
export function vText(v, { max, min = 0, required = false, label = 'ข้อความ' } = {}) {
  const s = str(v);
  if (!s) return required ? `กรอก${label}` : '';
  if (s.length < min) return `${label}อย่างน้อย ${min} ตัวอักษร`;
  if (max && s.length > max) return `${label}ไม่เกิน ${max} ตัวอักษร`;
  return '';
}

/**
 * ตรวจหลายช่องพร้อมกัน: validateAll({ email: vEmail(form.email), ... })
 * → { errors: { email: 'ข้อความ' }, ok: boolean } (ตัดช่องที่ผ่านออก)
 */
export function validateAll(map) {
  const errors = Object.fromEntries(Object.entries(map).filter(([, msg]) => msg));
  return { errors, ok: Object.keys(errors).length === 0 };
}

/** แปลง err.details จาก server ({ field: ['msg'] }) เป็น { field: 'msg' } */
export function serverFieldErrors(err) {
  const d = err?.details;
  if (!d || typeof d !== 'object') return {};
  return Object.fromEntries(
    Object.entries(d)
      .filter(([, v]) => v)
      .map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v)]),
  );
}
