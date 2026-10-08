import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

// permission key format: "module:action" e.g. "reservations:view", "games:edit"
const PermissionSchema = new Schema(
  {
    key: { type: String, required: true }, // e.g. floor:view
    view: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    del: { type: Boolean, default: false }, // delete
    approve: { type: Boolean, default: false },
  },
  { _id: false },
);

const RoleSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // Super Admin, Game Master...
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, default: '' },
    isSystem: { type: Boolean, default: false }, // ห้ามลบ system roles
    permissions: { type: [PermissionSchema], default: [] },
    memberCount: { type: Number, default: 0 },
    updatedBy: { type: Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const Role = model('Role', RoleSchema);

/** default permission keys ที่ frontend ใช้สร้าง matrix */
export const PERMISSION_CATALOG = [
  { key: 'floor', label: 'ผังโต๊ะ & การจอง' },
  { key: 'inventory', label: 'คลังบอร์ดเกม (Vault)' },
  { key: 'checkout', label: 'การเงิน & เช็คบิล' },
  { key: 'users', label: 'จัดการผู้ใช้' },
  { key: 'reports', label: 'รายงาน & สถิติ' },
  { key: 'settings', label: 'ตั้งค่าร้าน' },
  { key: 'maintenance', label: 'ซ่อมบำรุง' },
  { key: 'roles', label: 'จัดการสิทธิ์' },
  { key: 'audit', label: 'บันทึกกิจกรรม (Audit)' },
];
