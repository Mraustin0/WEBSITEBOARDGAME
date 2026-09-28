import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'invalid id');

export const listQuery = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  minPlayers: z.coerce.number().int().positive().optional(),
  maxPlayers: z.coerce.number().int().positive().optional(),
  year: z.coerce.number().int().optional(),
  status: z.enum(['available', 'in_use', 'maintenance']).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  mechanic: z.string().trim().min(1).max(80).optional(),
  sort: z.enum(['name', 'year', 'createdAt', 'bggRating']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export const idParam = z.object({ id: objectId });

export const gameBody = z.object({
  bggId: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1).max(200),
  minPlayers: z.coerce.number().int().positive().default(1),
  maxPlayers: z.coerce.number().int().positive().default(4),
  playtimeMin: z.coerce.number().int().positive().default(60),
  yearPublished: z.coerce.number().int().optional(),
  thumbnail: z.string().url().optional().or(z.literal('')),
  image: z.string().url().optional().or(z.literal('')),
  description: z.string().max(10000).optional(),
  bggAverage: z.coerce.number().min(0).max(10).optional(),
  bggRating: z.coerce.number().min(0).optional(),
  bggWeight: z.coerce.number().min(0).max(5).optional(),
  categories: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  mechanics: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  designers: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  status: z.enum(['available', 'in_use', 'maintenance']).optional(),
});

export const gameBodyPartial = gameBody.partial();
