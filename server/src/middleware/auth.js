import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/user.model.js';
import { forbidden, unauthorized } from '../lib/errors.js';

const TOKEN_TTL = '7d';

export function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, username: user.username },
    env.JWT_SECRET,
    { expiresIn: TOKEN_TTL },
  );
}

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw unauthorized('no token');
    const payload = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(payload.sub).select(
      '_id username email role status tier displayName phone lineId avatar noShowCount playCount',
    );
    if (!user) throw unauthorized('user not found');
    if (user.status === 'suspended') throw forbidden('account suspended');
    if (user.status === 'pending') throw forbidden('account pending approval');
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(unauthorized('invalid token'));
    }
    next(err);
  }
}

export function requireRole(role) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (req.user.role !== role) return next(forbidden());
    next();
  };
}

/** admin หรือ role ที่อยู่ในรายการ */
export function requireAnyRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}
