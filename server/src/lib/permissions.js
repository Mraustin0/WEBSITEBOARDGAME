// สิทธิ์ละเอียดตามบทบาท (หน้า 16 Roles & Permissions)
// - admin (Super Admin) ทำได้ทุกอย่างเสมอ
// - user (สมาชิก) ไม่มีสิทธิ์ฝั่งหลังร้าน
// - บทบาทอื่น (staff, manager, ...) ดูจาก permission matrix ของ Role ใน DB
import { Role } from '../models/role.model.js';
import { createCache } from './cache.js';

export const PERMISSION_ACTIONS = ['view', 'edit', 'del', 'approve'];

const cache = createCache({ ttlMs: 10_000, maxEntries: 100 });

/** ล้าง cache หลังแก้บทบาท (เรียกจาก roles.service) */
export function clearPermissionCache() {
  cache.clear();
}

async function matrixOf(slug) {
  const hit = cache.get(slug);
  if (hit) return hit;
  const role = await Role.findOne({ slug }).select('permissions').lean();
  const matrix = new Map((role?.permissions ?? []).map((p) => [p.key, p]));
  cache.set(slug, matrix);
  return matrix;
}

/** พนักงาน = ไม่ใช่สมาชิกทั่วไป */
export const isStaffRole = (user) => Boolean(user?.role) && user.role !== 'user';

/** user ทำ action กับ key นี้ได้ไหม (เช่น can(user, 'floor', 'edit')) */
export async function can(user, key, action = 'view') {
  if (!user?.role) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'user') return false;
  const perm = (await matrixOf(user.role)).get(key);
  return Boolean(perm?.[action]);
}

/** action จาก HTTP method: GET → view, DELETE → del, อื่น ๆ → edit */
export function actionOf(method) {
  if (method === 'GET' || method === 'HEAD') return 'view';
  if (method === 'DELETE') return 'del';
  return 'edit';
}
