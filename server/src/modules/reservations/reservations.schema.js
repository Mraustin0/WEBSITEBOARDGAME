import { z } from 'zod';
import { RESERVATION_STATUSES } from '../../models/reservation.model.js';
import { RULES } from './reservations.rules.js';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'invalid id');
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD');

const hours = z.coerce
  .number()
  .min(RULES.MIN_HOURS)
  .max(RULES.MAX_HOURS)
  .refine((v) => Number.isInteger(v * 2), 'durationHours must be in 0.5 hour steps');

const players = z.coerce.number().int().min(1).max(30);

export const bookingBody = z.object({
  table: objectId,
  game: objectId.nullish(),
  players,
  startAt: z.coerce.date(),
  durationHours: hours,
  note: z.string().trim().max(300).default(''),
});

export const updateBody = z
  .object({
    table: objectId,
    game: objectId.nullable(),
    players,
    startAt: z.coerce.date(),
    durationHours: hours,
    note: z.string().trim().max(300),
  })
  .partial()
  .refine((o) => Object.values(o).some((v) => v !== undefined), 'nothing to update');

export const cancelBody = z.object({ reason: z.string().trim().max(300).default('') });

export const idParam = z.object({ id: objectId });

const pagination = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
};

export const listQuery = z.object({
  scope: z.enum(['active', 'upcoming', 'past', 'all']).default('all'),
  ...pagination,
});

export const adminListQuery = z.object({
  date: dateStr.optional(),
  status: z.enum(RESERVATION_STATUSES).optional(),
  table: objectId.optional(),
  ...pagination,
});

export const availabilityQuery = z.object({
  startAt: z.coerce.date(),
  durationHours: hours.default(1),
  players: players.optional(),
});
