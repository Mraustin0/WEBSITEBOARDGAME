import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'invalid id');

export const createBody = z.object({
  game: objectId,
  playedAt: z.coerce.date().optional(),
  players: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  winner: z.string().trim().max(60).default(''),
  durationMin: z.coerce.number().int().positive().optional(),
  notes: z.string().max(1000).default(''),
});

export const updateBody = createBody.partial();
export const idParam = z.object({ id: objectId });
