import { z } from 'zod';
import { ASSIST_STATUSES, ASSIST_TOPICS } from '../../models/assist.model.js';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'invalid id');

export const idParam = z.object({ id: objectId });

export const createBody = z.object({
  reservation: objectId,
  topic: z.enum(ASSIST_TOPICS),
  note: z.string().trim().max(500).default(''),
});

export const myQuery = z.object({
  reservation: objectId.optional(),
});

export const listQuery = z.object({
  // active = open + acknowledged (คิวที่ยังต้องจัดการ)
  status: z.enum([...ASSIST_STATUSES, 'active']).default('active'),
  topic: z.enum(ASSIST_TOPICS).optional(),
  table: objectId.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export const updateBody = z.object({
  status: z.enum(['acknowledged', 'resolved']),
  resolution: z.string().trim().max(500).optional(),
});
