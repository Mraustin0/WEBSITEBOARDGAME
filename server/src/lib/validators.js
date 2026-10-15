// กฎตรวจข้อมูลที่ผู้ใช้กรอก (ใช้ร่วมกันทุก schema) — ข้อความ error เป็นภาษาไทยเพราะหน้าเว็บแสดงตรง ๆ ใต้ช่องกรอก
// ฝั่งหน้าเว็บมีกฎชุดเดียวกันที่ client/src/lib/validate.js (แก้ที่หนึ่งต้องแก้อีกที่ด้วย)
import { z } from 'zod';

/** ชื่อผู้ใช้: 3–32 ตัว ภาษาอังกฤษ/ตัวเลข/_ . ขึ้นต้นด้วยตัวอักษรหรือตัวเลข */
export const USERNAME_RE = /^[A-Za-z0-9][A-Za-z0-9_.]{2,31}$/;
/** ชื่อคน/ชื่อที่แสดง: ตัวอักษรทุกภาษา ตัวเลข ช่องว่าง และ . ' - _ ( ) — ต้องมีตัวอักษรอย่างน้อย 1 ตัว */
export const PERSON_NAME_RE = /^[\p{L}\p{M}\p{N} .'\-_()]+$/u;
const HAS_LETTER_RE = /\p{L}/u;
/** เบอร์โทรไทย: 0 ตามด้วย 8–9 หลัก (บ้าน 9 หลัก / มือถือ 10 หลัก) หลังตัด - และช่องว่าง */
export const PHONE_RE = /^0\d{8,9}$/;
/** LINE ID: 4–20 ตัว a-z 0-9 . _ - (บัญชีทางการขึ้นต้นด้วย @ ได้) */
export const LINE_ID_RE = /^@?[a-z0-9._-]{4,20}$/i;

export const username = z
  .string({ required_error: 'กรอกชื่อผู้ใช้' })
  .trim()
  .min(3, 'ชื่อผู้ใช้อย่างน้อย 3 ตัวอักษร')
  .max(32, 'ชื่อผู้ใช้ไม่เกิน 32 ตัวอักษร')
  .regex(USERNAME_RE, 'ชื่อผู้ใช้ใช้ได้เฉพาะภาษาอังกฤษ ตัวเลข _ และ . (ไม่มีช่องว่าง)');

export const email = z
  .string({ required_error: 'กรอกอีเมล' })
  .trim()
  .toLowerCase()
  .max(254, 'อีเมลยาวเกินไป')
  .email('รูปแบบอีเมลไม่ถูกต้อง');

/** รหัสผ่านใหม่ (สมัคร / เปลี่ยนรหัส / admin สร้างบัญชี) — login ใช้แค่ "ไม่ว่าง" เพื่อรองรับรหัสเก่า */
export const newPassword = z
  .string({ required_error: 'กรอกรหัสผ่าน' })
  .min(8, 'รหัสผ่านอย่างน้อย 8 ตัวอักษร')
  .max(128, 'รหัสผ่านยาวเกินไป')
  .regex(/[A-Za-z]/, 'รหัสผ่านต้องมีตัวอักษรภาษาอังกฤษอย่างน้อย 1 ตัว')
  .regex(/\d/, 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว');

/** ตรวจชื่อคน — คืนข้อความ error หรือ null */
export function personNameError(s) {
  if (s.length < 2) return 'ชื่ออย่างน้อย 2 ตัวอักษร';
  if (s.length > 80) return 'ชื่อไม่เกิน 80 ตัวอักษร';
  if (!PERSON_NAME_RE.test(s)) return 'ชื่อมีอักขระพิเศษที่ใช้ไม่ได้';
  if (!HAS_LETTER_RE.test(s)) return 'ชื่อต้องมีตัวอักษร';
  return null;
}

const nameCheck =
  ({ allowEmpty }) =>
  (s, ctx) => {
    if (allowEmpty && s === '') return;
    const msg = personNameError(s);
    if (msg) ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg });
  };

/** ชื่อคน (ชื่อที่แสดง / ชื่อลูกค้าหน้าร้าน) — บังคับกรอก */
export const personName = z
  .string()
  .trim()
  .superRefine(nameCheck({ allowEmpty: false }));

/** ชื่อคนแบบไม่บังคับ: '' = ไม่กรอก */
export const optionalPersonName = z
  .string()
  .trim()
  .superRefine(nameCheck({ allowEmpty: true }));

/** เบอร์โทรไทย — ตัด - ช่องว่าง วงเล็บ แล้วเก็บเป็นตัวเลขล้วน; '' = ไม่กรอก */
export const phone = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s\-().]/g, '').replace(/^\+66/, '0'))
  .refine(
    (s) => s === '' || PHONE_RE.test(s),
    'เบอร์โทรไม่ถูกต้อง (เช่น 0812345678 หรือ 021234567)',
  );

/** LINE ID — '' = ไม่กรอก */
export const lineId = z
  .string()
  .trim()
  .refine((s) => s === '' || LINE_ID_RE.test(s), 'LINE ID 4–20 ตัว ใช้ a-z 0-9 . _ - เท่านั้น');

/** อีเมลแบบไม่บังคับ (เช่น อีเมลร้านในหน้าตั้งค่า) — '' = ไม่กรอก */
export const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .refine((s) => s === '' || z.string().email().safeParse(s).success, 'รูปแบบอีเมลไม่ถูกต้อง');
