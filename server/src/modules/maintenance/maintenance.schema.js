import { z } from 'zod';
import { TICKET_STATUSES } from '../../models/maintenance.model.js';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'invalid id');
const priority = z.enum(['low', 'medium', 'high']);

export const createBody = z
  .object({
    itemType: z.enum(['game', 'table']),
    game: objectId.optional(),
    table: objectId.optional(),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).default(''),
    priority: priority.default('medium'),
    cost: z.coerce.number().min(0).max(1_000_000).default(0),
    copies: z.coerce.number().int().min(1).max(50).default(1), // เกม: เสียกี่กล่อง
  })
  .refine((o) => (o.itemType === 'game' ? o.game : o.table), {
    message: 'game or table id is required for the itemType',
    path: ['itemType'],
  });

export const updateBody = z
  .object({
    status: z.enum(TICKET_STATUSES),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000),
    priority,
    cost: z.coerce.number().min(0).max(1_000_000),
    copies: z.coerce.number().int().min(1).max(50),
    resolution: z.string().trim().max(2000),
  })
  .partial()
  .refine((o) => Object.values(o).some((v) => v !== undefined), 'nothing to update');

export const idParam = z.object({ id: objectId });

export const listQuery = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  itemType: z.enum(['game', 'table']).optional(),
  game: objectId.optional(),
  table: objectId.optional(),
  priority: priority.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});
