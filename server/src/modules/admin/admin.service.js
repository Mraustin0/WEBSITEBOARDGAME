import bcrypt from 'bcryptjs';
import { User } from '../../models/user.model.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { logAudit } from '../../lib/audit.js';

const BCRYPT_ROUNDS = 10;
const PUBLIC =
  '_id username email role status tier displayName phone lineId avatar noShowCount playCount suspendedAt suspendedReason createdAt updatedAt lastActiveAt';

export async function listUsers({ q, role, status, tier, page, limit }) {
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (tier) filter.tier = tier;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { username: rx },
      { email: rx },
      { phone: rx },
      { lineId: rx },
      { displayName: rx },
    ];
  }
  const [items, total] = await Promise.all([
    User.find(filter)
      .select(PUBLIC)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export async function userStats() {
  const [total, active, suspended, pending, staff, byTier] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: 'active' }),
    User.countDocuments({ status: 'suspended' }),
    User.countDocuments({ status: 'pending' }),
    User.countDocuments({ role: { $nin: ['user'] } }),
    User.aggregate([{ $group: { _id: '$tier', count: { $sum: 1 } } }]),
  ]);
  return {
    total,
    active,
    suspended,
    pending,
    staff,
    byTier: Object.fromEntries(byTier.map((r) => [r._id || 'regular', r.count])),
  };
}

export async function createUser(data, actor, req) {
  const exists = await User.findOne({
    $or: [{ email: data.email }, { username: data.username }],
  });
  if (exists) throw conflict('username or email already used');
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  const user = await User.create({
    username: data.username,
    email: data.email,
    passwordHash,
    role: data.role || 'user',
    status: data.status || 'active',
    tier: data.tier || 'regular',
    displayName: data.displayName || '',
    phone: data.phone || '',
    lineId: data.lineId || '',
  });
  logAudit({
    req,
    actor,
    action: 'create',
    module: 'users',
    summary: `สร้างผู้ใช้ ${user.username}`,
    targetType: 'User',
    targetId: user._id,
  });
  return user.toPublic();
}

export async function updateUser(actorId, targetId, data, actor, req) {
  if (String(actorId) === String(targetId) && data.role) {
    throw badRequest('cannot change your own role');
  }
  const user = await User.findByIdAndUpdate(targetId, data, {
    new: true,
    runValidators: true,
    select: PUBLIC,
  });
  if (!user) throw notFound('user not found');
  logAudit({
    req,
    actor,
    action: 'update',
    module: 'users',
    summary: `แก้ไขผู้ใช้ ${user.username}`,
    targetType: 'User',
    targetId: user._id,
    meta: data,
  });
  return user;
}

export async function updateRole(actorId, targetId, role, actor, req) {
  if (String(actorId) === String(targetId)) {
    throw badRequest('cannot change your own role');
  }
  const user = await User.findByIdAndUpdate(
    targetId,
    { role },
    { new: true, runValidators: true, select: PUBLIC },
  );
  if (!user) throw notFound('user not found');
  logAudit({
    req,
    actor,
    action: 'role_change',
    module: 'users',
    summary: `เปลี่ยน role ของ ${user.username} เป็น ${role}`,
    targetType: 'User',
    targetId: user._id,
  });
  return user;
}

export async function suspend(actorId, targetId, reason, actor, req) {
  if (String(actorId) === String(targetId)) {
    throw badRequest('cannot suspend your own account');
  }
  const user = await User.findByIdAndUpdate(
    targetId,
    {
      status: 'suspended',
      suspendedAt: new Date(),
      suspendedReason: reason || '',
    },
    { new: true, select: PUBLIC },
  );
  if (!user) throw notFound('user not found');
  logAudit({
    req,
    actor,
    action: 'suspend',
    module: 'users',
    summary: `ระงับบัญชี ${user.username}${reason ? `: ${reason}` : ''}`,
    targetType: 'User',
    targetId: user._id,
  });
  return user;
}

export async function unsuspend(targetId, actor, req) {
  const user = await User.findByIdAndUpdate(
    targetId,
    { status: 'active', suspendedAt: null, suspendedReason: '' },
    { new: true, select: PUBLIC },
  );
  if (!user) throw notFound('user not found');
  logAudit({
    req,
    actor,
    action: 'unsuspend',
    module: 'users',
    summary: `ปลดระงับบัญชี ${user.username}`,
    targetType: 'User',
    targetId: user._id,
  });
  return user;
}

export async function approve(targetId, actor, req) {
  const user = await User.findByIdAndUpdate(
    targetId,
    { status: 'active' },
    { new: true, select: PUBLIC },
  );
  if (!user) throw notFound('user not found');
  logAudit({
    req,
    actor,
    action: 'approve',
    module: 'users',
    summary: `อนุมัติบัญชี ${user.username}`,
    targetType: 'User',
    targetId: user._id,
  });
  return user;
}

export async function remove(actorId, targetId, actor, req) {
  if (String(actorId) === String(targetId)) {
    throw badRequest('cannot delete your own account');
  }
  const user = await User.findByIdAndDelete(targetId);
  if (!user) throw notFound('user not found');
  logAudit({
    req,
    actor,
    action: 'delete',
    module: 'users',
    summary: `ลบบัญชี ${user.username}`,
    targetType: 'User',
    targetId: user._id,
  });
  return user;
}
