import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'invalid id');

export const listQuery = z.object({
  q:     z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export const idParam = z.object({ id: objectId });

export const gameBody = z.object({
  bggId:         z.coerce.number().int().positive().optional(),
  name:          z.string().trim().min(1).max(200),
  minPlayers:    z.coerce.number().int().positive().default(1),
  maxPlayers:    z.coerce.number().int().positive().default(4),
  playtimeMin:   z.coerce.number().int().positive().default(60),
  yearPublished: z.coerce.number().int().optional(),
  thumbnail:     z.string().url().optional().or(z.literal('')),
  description:   z.string().max(10000).optional(),
});

export const gameBodyPartial = gameBody.partial();
