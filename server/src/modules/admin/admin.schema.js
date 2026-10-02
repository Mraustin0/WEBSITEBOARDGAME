import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'invalid id');

export const listUsersQuery = z.object({
  q: z.string().trim().min(1).max(80).optional(),
  role: z.enum(['user', 'admin']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export const idParam = z.object({ id: objectId });

export const updateRoleBody = z.object({
  role: z.enum(['user', 'admin']),
});
