import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'invalid id');
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD');
const hhmm = z.string().regex(/^([01]\d|2[0-4]):[0-5]\d$/, 'use HH:MM');

export const idParam = z.object({ id: objectId });

export const listQuery = z
  .object({ date: dateStr.optional(), from: dateStr.optional(), to: dateStr.optional() })
  .refine((q) => !q.from || !q.to || q.from <= q.to, 'from must be <= to');

const fields = {
  user: objectId,
  date: dateStr,
  start: hhmm,
  end: hhmm,
  position: z.string().trim().max(60).optional(),
  zone: z.string().trim().max(40).optional(),
  note: z.string().trim().max(300).optional(),
};

export const createBody = z.object(fields);

export const updateBody = z
  .object(fields)
  .partial()
  .refine((o) => Object.keys(o).length > 0, 'nothing to update');
