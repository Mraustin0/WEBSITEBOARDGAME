import bcrypt from 'bcryptjs';
import { User } from '../../models/user.model.js';
import { signToken } from '../../middleware/auth.js';
import { conflict, forbidden, notFound, unauthorized } from '../../lib/errors.js';
import { logAudit } from '../../lib/audit.js';

const BCRYPT_ROUNDS = 10;

export async function register({ username, email, password }) {
  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) throw conflict('username or email already used');
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({ username, email, passwordHash, tier: 'new' });
  return { token: signToken(user), user: user.toPublic() };
}

export async function login({ email, password }, req) {
  const user = await User.findOne({ email });
  if (!user) throw unauthorized('invalid credentials');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw unauthorized('invalid credentials');
  if (user.status === 'suspended') {
    throw forbidden(`account suspended${user.suspendedReason ? `: ${user.suspendedReason}` : ''}`);
  }
  if (user.status === 'pending') {
    throw forbidden('account pending approval');
  }
  user.lastActiveAt = new Date();
  await user.save();
  logAudit({
    req,
    actor: user,
    action: 'login',
    module: 'auth',
    summary: `${user.username} เข้าสู่ระบบ`,
    targetType: 'User',
    targetId: user._id,
  });
  return { token: signToken(user), user: user.toPublic() };
}

export async function changePassword(userId, { oldPassword, newPassword }) {
  const user = await User.findById(userId);
  if (!user) throw notFound('user not found');
  const ok = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!ok) throw unauthorized('old password incorrect');
  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await user.save();
  return { ok: true };
}

export async function updateProfile(userId, data) {
  if (data.username || data.email) {
    const clash = await User.findOne({
      _id: { $ne: userId },
      $or: [
        ...(data.username ? [{ username: data.username }] : []),
        ...(data.email ? [{ email: data.email }] : []),
      ],
    });
    if (clash) throw conflict('username or email already used');
  }
  const user = await User.findByIdAndUpdate(userId, data, {
    new: true,
    runValidators: true,
  });
  if (!user) throw notFound('user not found');
  return user.toPublic();
}
