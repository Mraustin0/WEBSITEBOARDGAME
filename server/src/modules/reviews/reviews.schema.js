import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'invalid id');

export const gameIdParam = z.object({ gameId: objectId });
export const idParam = z.object({ id: objectId });

export const upsertBody = z.object({
  game: objectId,
  rating: z.coerce.number().int().min(1).max(10),
  comment: z.string().max(2000).default(''),
});

export const adminListQuery = z.object({
  game: objectId.optional(),
  maxRating: z.coerce.number().int().min(1).max(10).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
