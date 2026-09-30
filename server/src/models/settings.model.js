import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const DaySchema = new Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true }, // 0 = อาทิตย์
    open: { type: String, default: '10:00' },
    close: { type: String, default: '24:00' }, // น้อยกว่า open = ปิดหลังเที่ยงคืน
    closed: { type: Boolean, default: false },
  },
  { _id: false },
);

const defaultDays = () =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '10:00', close: '24:00', closed: false }));

// การตั้งค่าร้าน — มีเอกสารเดียว (key = 'store')
const SettingsSchema = new Schema(
  {
    key: { type: String, default: 'store', unique: true },
    store: {
      name: { type: String, default: 'Boardgame Everyday' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      address: { type: String, default: '' },
    },
    pricing: {
      perPersonHour: { type: Number, default: 50, min: 0 },
      flat3hPerPerson: { type: Number, default: 130, min: 0 },
      revenueTargetPerDay: { type: Number, default: 0, min: 0 },
    },
    booking: {
      maxAdvanceDays: { type: Number, default: 3, min: 0 },
      minHours: { type: Number, default: 1, min: 0.5 },
      maxHours: { type: Number, default: 6, min: 0.5 },
      overtimeGraceMin: { type: Number, default: 10, min: 0 },
      extraSeats: { type: Number, default: 2, min: 0 },
      cancelCutoffHours: { type: Number, default: 2, min: 0 }, // สมาชิกยกเลิกเองได้ถึงก่อนเริ่มกี่ชม.
    },
    operatingHours: {
      enforce: { type: Boolean, default: false }, // true = ห้ามสมาชิกจองนอกเวลาทำการ
      days: { type: [DaySchema], default: defaultDays },
    },
    noShow: {
      graceMin: { type: Number, default: 30, min: 0 }, // มาช้าเกินกี่นาทีถือว่า no-show
      depositPerPerson: { type: Number, default: 0, min: 0 },
      suspendAfter: { type: Number, default: 3, min: 0 }, // no-show กี่ครั้งควรระงับบัญชี
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const Settings = model('Settings', SettingsSchema);
