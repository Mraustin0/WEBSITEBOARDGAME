import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'invalid id');

export const addBody = z.object({
  game:      objectId,
  condition: z.enum(['new', 'good', 'worn']).default('good'),
  notes:     z.string().max(500).optional(),
});

export const idParam = z.object({ id: objectId });
