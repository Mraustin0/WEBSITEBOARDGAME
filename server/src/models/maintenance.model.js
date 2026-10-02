import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

export const TICKET_STATUSES = ['pending', 'in_progress', 'resolved'];
export const OPEN_TICKET_STATUSES = ['pending', 'in_progress'];

// ใบแจ้งซ่อม — บอร์ดเกมหรือโต๊ะ (Maintenance & Repair Tracking)
const MaintenanceTicketSchema = new Schema(
  {
    itemType: { type: String, enum: ['game', 'table'], required: true },
    game: { type: Types.ObjectId, ref: 'Game', default: null },
    table: { type: Types.ObjectId, ref: 'Table', default: null },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    copies: { type: Number, default: 1, min: 1 }, // เกม: เสียกี่กล่อง (กล่องที่เหลือยังจองได้)
    // ระบบใช้ภายใน: true = เกมเป็น maintenance เพราะใบแจ้งซ่อม (ไม่ใช่ admin ปิดเอง)
    lockedGame: { type: Boolean, default: false, select: false },
    status: { type: String, enum: TICKET_STATUSES, default: 'pending', index: true },
    reservation: { type: Types.ObjectId, ref: 'Reservation', default: null }, // แจ้งจากตอนคืนเกม
    reportedBy: { type: Types.ObjectId, ref: 'User' },
    cost: { type: Number, default: 0, min: 0 },
    resolution: { type: String, default: '' },
    startedAt: Date,
    resolvedAt: Date,
    resolvedBy: { type: Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

MaintenanceTicketSchema.index({ game: 1, status: 1 });
MaintenanceTicketSchema.index({ table: 1, status: 1 });

export const MaintenanceTicket = model('MaintenanceTicket', MaintenanceTicketSchema);
