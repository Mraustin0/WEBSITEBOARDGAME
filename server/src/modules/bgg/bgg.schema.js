import { z } from 'zod';

export const searchQuery = z.object({
  q: z.string().trim().min(1).max(100),
});

export const bggIdParam = z.object({
  bggId: z.coerce.number().int().positive(),
});
