import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

// booked → playing (ถึงเวลาเริ่ม, auto) → completed (กดคืนเกม)
// booked | playing → cancelled
export const RESERVATION_STATUSES = ['booked', 'playing', 'completed', 'cancelled'];
export const ACTIVE_STATUSES = ['booked', 'playing'];

const ReservationSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true },
    table: { type: Types.ObjectId, ref: 'Table', required: true },
    game: { type: Types.ObjectId, ref: 'Game', default: null },
    players: { type: Number, required: true, min: 1 },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    durationHours: { type: Number, required: true, min: 0.5 },
    price: {
      total: { type: Number, required: true, min: 0 },
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
  },
  { timestamps: true },
);

ReservationSchema.index({ table: 1, startAt: 1 });
ReservationSchema.index({ game: 1, startAt: 1 });
ReservationSchema.index({ user: 1, startAt: -1 });
ReservationSchema.index({ status: 1, startAt: 1 });

export const Reservation = model('Reservation', ReservationSchema);
