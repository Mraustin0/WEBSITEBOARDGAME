import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

// ประเภทการแจ้งเตือน (FE ใช้เลือกไอคอน)
export const NOTIFICATION_TYPES = [
  'booking_new', // สมาชิกจองโต๊ะออนไลน์
  'booking_cancelled', // สมาชิกยกเลิกการจอง
  'booking_affected', // การจองไม่มีกล่องเกมให้แล้วหลังแจ้งซ่อม
  'time_ending', // โต๊ะใกล้หมดเวลา (≤ 10 นาที)
  'time_overdue', // เลยเวลาแล้วยังไม่คืนเกม
  'assist', // ลูกค้าเรียก GM / พนักงาน
  'maintenance_new', // แจ้งซ่อมใหม่ / ของเสียตอนคืน
  'maintenance_done', // ซ่อมเสร็จ
];

const ActionSchema = new Schema(
  {
    key: String, // extend | checkout | acknowledge | open
    label: String,
    method: String,
    path: String,
    body: Schema.Types.Mixed,
  },
  { _id: false },
);

// ศูนย์การแจ้งเตือนของพนักงาน/แอดมิน (admin เห็นทุกรายการ, อ่านแล้วนับแยกรายคน)
const NotificationSchema = new Schema(
  {
    type: { type: String, enum: NOTIFICATION_TYPES, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    important: { type: Boolean, default: false, index: true },
    refs: {
      reservation: { type: Types.ObjectId, ref: 'Reservation' },
      table: { type: Types.ObjectId, ref: 'Table' },
      game: { type: Types.ObjectId, ref: 'Game' },
      assist: { type: Types.ObjectId, ref: 'AssistRequest' },
      ticket: { type: Types.ObjectId, ref: 'MaintenanceTicket' },
    },
    actions: { type: [ActionSchema], default: [] }, // ปุ่มดำเนินการด่วน
    done: { type: Boolean, default: false }, // เรื่องนี้จัดการแล้ว (ซ่อนปุ่มดำเนินการ)
    readBy: { type: [{ type: Types.ObjectId, ref: 'User' }], default: [] },
    dedupeKey: { type: String, unique: true, sparse: true }, // กันแจ้งซ้ำ (เช่น ใกล้หมดเวลา)
  },
  { timestamps: true },
);

NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 }); // เก็บ 60 วัน

export const Notification = model('Notification', NotificationSchema);

// การตั้งค่าการแจ้งเตือนรายคน (ไอคอนตั้งค่า) — ปิดบางประเภทได้
const NotificationPrefSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true, unique: true },
    muted: { type: [{ type: String, enum: NOTIFICATION_TYPES }], default: [] },
  },
  { timestamps: true },
);

export const NotificationPref = model('NotificationPref', NotificationPrefSchema);
