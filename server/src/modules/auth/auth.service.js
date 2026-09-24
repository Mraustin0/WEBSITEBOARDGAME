import bcrypt from 'bcryptjs';
import { User } from '../../models/user.model.js';
import { signToken } from '../../middleware/auth.js';
import { conflict, unauthorized } from '../../lib/errors.js';

const BCRYPT_ROUNDS = 10;

export async function register({ username, email, password }) {
  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) throw conflict('username or email already used');
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({ username, email, passwordHash });
  return { token: signToken(user), user: user.toPublic() };
}

export async function login({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) throw unauthorized('invalid credentials');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw unauthorized('invalid credentials');
  return { token: signToken(user), user: user.toPublic() };
}
