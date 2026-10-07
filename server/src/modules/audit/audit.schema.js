import { z } from 'zod';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../../models/audit.model.js';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'invalid id');
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD');

export const listQuery = z
  .object({
    from: dateStr.optional(),
    to: dateStr.optional(),
    actor: objectId.optional(),
    action: z.enum(AUDIT_ACTIONS).optional(),
    module: z.enum(AUDIT_MODULES).optional(),
    q: z.string().trim().min(1).max(100).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, 'from must be <= to');

export const dayQuery = z.object({
  date: dateStr.optional(),
});

export const exportQuery = z
  .object({
    from: dateStr.optional(),
    to: dateStr.optional(),
    actor: objectId.optional(),
    action: z.enum(AUDIT_ACTIONS).optional(),
    module: z.enum(AUDIT_MODULES).optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, 'from must be <= to');
