import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

export const AUDIT_ACTIONS = [
  'create',
  'update',
  'delete',
  'suspend',
  'unsuspend',
  'approve',
  'login',
  'logout',
  'pay',
  'return',
  'no_show',
  'cancel',
  'confirm',
  'role_change',
  'settings',
  'other',
];

export const AUDIT_MODULES = [
  'auth',
  'users',
  'games',
  'tables',
  'reservations',
  'maintenance',
  'settings',
  'roles',
  'reviews',
  'notifications',
  'assist',
  'system',
];

const AuditLogSchema = new Schema(
  {
    actor: { type: Types.ObjectId, ref: 'User', default: null, index: true },
    actorName: { type: String, default: 'system' },
    actorRole: { type: String, default: '' },
    action: { type: String, enum: AUDIT_ACTIONS, required: true, index: true },
    module: { type: String, enum: AUDIT_MODULES, required: true, index: true },
    targetType: { type: String, default: '' },
    targetId: { type: String, default: '', index: true },
    summary: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    // hash chain (Integrity Verification Badge)
    seq: { type: Number, index: true },
    prevHash: { type: String, default: '' },
    hash: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ module: 1, action: 1, createdAt: -1 });

export const AuditLog = model('AuditLog', AuditLogSchema);
