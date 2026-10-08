import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

// กะพนักงาน (Staff Roster บนหน้า Dashboard)
const ShiftSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD เวลาไทย
    start: { type: String, required: true }, // HH:MM
    end: { type: String, required: true }, // HH:MM (น้อยกว่า start = เลิกหลังเที่ยงคืน)
    position: { type: String, default: '' }, // เช่น Game Master, Cashier
    zone: { type: String, default: '' },
    note: { type: String, default: '' },
    createdBy: { type: Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

ShiftSchema.index({ date: 1, start: 1 });

export const Shift = model('Shift', ShiftSchema);
