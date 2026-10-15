import { z } from 'zod';
import {
  email,
  lineId,
  newPassword,
  optionalPersonName,
  phone,
  username,
} from '../../lib/validators.js';

export const registerSchema = z.object({
  username,
  email,
  password: newPassword,
  // ไม่บังคับ — ฟอร์มสมัครของหน้า user มีช่องชื่อที่แสดง/เบอร์โทร
  displayName: optionalPersonName.optional(),
  phone: phone.optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('รูปแบบอีเมลไม่ถูกต้อง'),
  password: z.string().min(1, 'กรอกรหัสผ่าน'),
});

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'กรอกรหัสผ่านเดิม'),
    newPassword,
  })
  .refine((v) => v.oldPassword !== v.newPassword, {
    path: ['newPassword'],
    message: 'รหัสผ่านใหม่ต้องไม่ซ้ำรหัสเดิม',
  });

export const updateProfileSchema = z
  .object({
    username: username.optional(),
    email: email.optional(),
    displayName: optionalPersonName.optional(),
    phone: phone.optional(),
    lineId: lineId.optional(),
    avatar: z.string().max(500).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, 'nothing to update');
