import rateLimit from 'express-rate-limit';
import { isTest } from '../config/env.js';

/**
 * Build a limiter. In test env we skip so integration tests never trip 429s.
 * ponytail: in-memory store, per-process; move to Redis if we run >1 replica.
 */
function limiter({ windowMs, max, name }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => isTest,
    message: { error: `too many requests (${name})` },
  });
}

// auth: brute-force-ish surface, keep tight
export const authLimiter = limiter({ windowMs: 60 * 1000, max: 10, name: 'auth' });

// bgg: external upstream (BGG throttles too), be nice
export const bggLimiter = limiter({ windowMs: 60 * 1000, max: 30, name: 'bgg' });
