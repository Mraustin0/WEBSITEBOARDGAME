import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'invalid id');

const permission = z.object({
  key: z.string().trim().min(1).max(40),
  view: z.boolean().default(false),
  edit: z.boolean().default(false),
  del: z.boolean().default(false),
  approve: z.boolean().default(false),
});

export const idParam = z.object({ id: objectId });

export const createBody = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9_-]+$/, 'slug: lowercase alphanumeric, _ -')
    .optional(),
  description: z.string().trim().max(300).optional(),
  permissions: z.array(permission).max(50).optional(),
});

export const updateBody = createBody.partial().refine((o) => Object.keys(o).length > 0, 'empty');

export const permissionsBody = z.object({
  permissions: z.array(permission).max(50),
});

export const membersBody = z.object({
  userIds: z.array(objectId).min(1).max(50),
});
