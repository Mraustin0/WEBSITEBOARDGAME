import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

// booked → playing (ถึงเวลาเริ่ม, auto) → completed (กดคืนเกม)
// booked | playing → cancelled, booked | playing → no_show (ลูกค้าไม่มา — admin กด)
export const RESERVATION_STATUSES = ['booked', 'playing', 'completed', 'cancelled', 'no_show'];
// สถานะที่ไม่นับเป็นรายได้ / การใช้บริการ
export const NOT_SERVED = ['cancelled', 'no_show'];
export const ACTIVE_STATUSES = ['booked', 'playing'];
export const SOURCES = ['online', 'walk_in', 'admin'];
export const PAYMENT_METHODS = ['cash', 'transfer', 'card', 'qr'];

const ReservationSchema = new Schema(
  {
    // สมาชิกที่จอง — null ได้ถ้าเป็นลูกค้า walk-in ที่ไม่มีบัญชี (ใช้ customer แทน)
    user: { type: Types.ObjectId, ref: 'User', default: null },
    customer: {
      name: { type: String, default: '', trim: true },
      phone: { type: String, default: '', trim: true },
    },
    source: { type: String, enum: SOURCES, default: 'online' },
    createdBy: { type: Types.ObjectId, ref: 'User' },
    table: { type: Types.ObjectId, ref: 'Table', required: true },
    game: { type: Types.ObjectId, ref: 'Game', default: null },
    players: { type: Number, required: true, min: 1 },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    durationHours: { type: Number, required: true, min: 0.5 },
    price: {
      total: { type: Number, required: true, min: 0 },
      package: { type: String, enum: ['hourly', 'flat3h'], default: 'hourly' },
      perPersonHour: Number,
      tableExtraPerHour: Number,
      players: Number,
      hours: Number,
    },
    status: { type: String, enum: RESERVATION_STATUSES, default: 'booked' },
    note: { type: String, default: '' },
    startedAt: Date,
    returnedAt: Date,
    returnedBy: { type: Types.ObjectId, ref: 'User' },
    cancelledAt: Date,
    cancelledBy: { type: Types.ObjectId, ref: 'User' },
    cancelReason: { type: String, default: '' },
    noShowAt: Date,
    // เช็คบิลตอนคืนเกม
    checkout: {
      actualMinutes: Number,
      overtimeHours: Number,
      overtimeCharge: Number,
      total: Number,
      condition: { type: String, enum: ['good', 'damaged'] },
      damageNote: String,
      inspectedBy: { type: Types.ObjectId, ref: 'User' },
    },
    payment: {
      status: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
      method: { type: String, enum: PAYMENT_METHODS },
      amount: Number,
      paidAt: Date,
      receivedBy: { type: Types.ObjectId, ref: 'User' },
    },
  },
  { timestamps: true },
);

ReservationSchema.index({ table: 1, startAt: 1 });
ReservationSchema.index({ game: 1, startAt: 1 });
ReservationSchema.index({ user: 1, startAt: -1 });
ReservationSchema.index({ status: 1, startAt: 1 });

export const Reservation = model('Reservation', ReservationSchema);
