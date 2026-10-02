import { User } from '../../models/user.model.js';
import { badRequest, notFound } from '../../lib/errors.js';

export async function listUsers({ q, role, page, limit }) {
  const filter = {};
  if (role) filter.role = role;
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ username: rx }, { email: rx }];
  }
  const [items, total] = await Promise.all([
    User.find(filter)
      .select('_id username email role createdAt updatedAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export async function updateRole(actorId, targetId, role) {
  if (String(actorId) === String(targetId)) {
    throw badRequest('cannot change your own role');
  }
  const user = await User.findByIdAndUpdate(
    targetId,
    { role },
    { new: true, runValidators: true, select: '_id username email role' },
  );
  if (!user) throw notFound('user not found');
  return user;
}

export async function remove(actorId, targetId) {
  if (String(actorId) === String(targetId)) {
    throw badRequest('cannot delete your own account');
  }
  const user = await User.findByIdAndDelete(targetId);
  if (!user) throw notFound('user not found');
  return user;
}
