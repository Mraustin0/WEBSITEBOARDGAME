import { z } from 'zod';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD');

export const dayQuery = z.object({ date: dateStr.optional() });

export const rangeQuery = z
  .object({ from: dateStr.optional(), to: dateStr.optional() })
  .refine((q) => !q.from || !q.to || q.from <= q.to, 'from must be <= to');

export const popularQuery = z
  .object({
    from: dateStr.optional(),
    to: dateStr.optional(),
    limit: z.coerce.number().int().positive().max(50).default(10),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, 'from must be <= to');
