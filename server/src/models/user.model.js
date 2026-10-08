import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export const USER_STATUSES = ['active', 'suspended', 'pending'];
export const USER_TIERS = ['regular', 'gold', 'vip', 'new'];
export const BUILTIN_ROLES = ['user', 'admin'];

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'user', index: true },
    status: {
      type: String,
      enum: USER_STATUSES,
      default: 'active',
      index: true,
    },
    tier: {
      type: String,
      enum: USER_TIERS,
      default: 'regular',
      index: true,
    },
    displayName: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    lineId: { type: String, default: '', trim: true },
    avatar: { type: String, default: '' },
    noShowCount: { type: Number, default: 0, min: 0 },
    playCount: { type: Number, default: 0, min: 0 },
    suspendedAt: Date,
    suspendedReason: { type: String, default: '' },
    lastActiveAt: Date,
  },
  { timestamps: true },
);

UserSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    status: this.status,
    tier: this.tier,
    displayName: this.displayName || this.username,
    phone: this.phone,
    lineId: this.lineId,
    avatar: this.avatar,
    noShowCount: this.noShowCount,
    playCount: this.playCount,
    createdAt: this.createdAt,
    lastActiveAt: this.lastActiveAt,
  };
};

export const User = model('User', UserSchema);
