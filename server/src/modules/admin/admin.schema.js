import { z } from 'zod';
import { USER_STATUSES, USER_TIERS } from '../../models/user.model.js';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'invalid id');

export const listUsersQuery = z.object({
  q: z.string().trim().min(1).max(80).optional(),
  role: z.string().trim().min(1).max(40).optional(),
  status: z.enum(USER_STATUSES).optional(),
  tier: z.enum(USER_TIERS).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export const idParam = z.object({ id: objectId });

export const updateRoleBody = z.object({
  role: z.string().trim().min(1).max(40),
});

export const createUserBody = z.object({
  username: z.string().trim().min(3).max(32),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(128),
  role: z.string().trim().min(1).max(40).default('user'),
  status: z.enum(USER_STATUSES).default('active'),
  tier: z.enum(USER_TIERS).default('regular'),
  displayName: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(30).optional(),
  lineId: z.string().trim().max(60).optional(),
});

export const updateUserBody = z
  .object({
    username: z.string().trim().min(3).max(32).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    role: z.string().trim().min(1).max(40).optional(),
    status: z.enum(USER_STATUSES).optional(),
    tier: z.enum(USER_TIERS).optional(),
    displayName: z.string().trim().max(80).optional(),
    phone: z.string().trim().max(30).optional(),
    lineId: z.string().trim().max(60).optional(),
    avatar: z.string().max(500).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, 'nothing to update');

export const suspendBody = z.object({
  reason: z.string().trim().max(300).optional(),
});
