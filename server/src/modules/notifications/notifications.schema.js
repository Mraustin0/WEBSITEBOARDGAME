import { z } from 'zod';
import { NOTIFICATION_TYPES } from '../../models/notification.model.js';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'invalid id');

export const idParam = z.object({ id: objectId });

export const listQuery = z.object({
  filter: z.enum(['all', 'unread', 'important']).default('all'),
  type: z.enum(NOTIFICATION_TYPES).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(30),
});

export const prefsBody = z.object({
  muted: z.array(z.enum(NOTIFICATION_TYPES)).max(NOTIFICATION_TYPES.length),
});
