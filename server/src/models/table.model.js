import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export const TABLE_STATUSES = ['active', 'closed'];

// โต๊ะในผังร้าน. position เป็น % บน canvas ของ floor plan (0-100) ให้ frontend วาดได้ตรง ๆ
const TableSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, default: '', trim: true },
    zone: { type: String, default: 'Main', trim: true, index: true },
    capacity: { type: Number, required: true, min: 1 },
    status: { type: String, enum: TABLE_STATUSES, default: 'active', index: true },
    extraPerHour: { type: Number, default: 0, min: 0 },
    shape: { type: String, enum: ['rect', 'round'], default: 'rect' },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      w: { type: Number, default: 10 },
      h: { type: Number, default: 10 },
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

export const Table = model('Table', TableSchema);
