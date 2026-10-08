import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

// หัวข้อที่สมาชิกเรียกพนักงาน (Game Master) ได้จากการ์ดโต๊ะที่กำลังเล่น
export const ASSIST_TOPICS = ['tutorial', 'extension', 'game_issue', 'other'];
export const ASSIST_STATUSES = ['open', 'acknowledged', 'resolved', 'cancelled'];
export const ACTIVE_ASSIST_STATUSES = ['open', 'acknowledged'];

const AssistRequestSchema = new Schema(
  {
    reservation: { type: Types.ObjectId, ref: 'Reservation', required: true },
    table: { type: Types.ObjectId, ref: 'Table', required: true },
    user: { type: Types.ObjectId, ref: 'User', default: null },
    topic: { type: String, enum: ASSIST_TOPICS, required: true },
    note: { type: String, default: '' },
    status: { type: String, enum: ASSIST_STATUSES, default: 'open', index: true },
    acknowledgedAt: Date,
    acknowledgedBy: { type: Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    resolvedBy: { type: Types.ObjectId, ref: 'User' },
    resolution: { type: String, default: '' },
  },
  { timestamps: true },
);

AssistRequestSchema.index({ reservation: 1, status: 1 });
AssistRequestSchema.index({ status: 1, createdAt: 1 });

export const AssistRequest = model('AssistRequest', AssistRequestSchema);
