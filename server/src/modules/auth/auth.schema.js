import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(32),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1),
    newPassword: z.string().min(6).max(128),
  })
  .refine((v) => v.oldPassword !== v.newPassword, {
    path: ['newPassword'],
    message: 'newPassword must differ from oldPassword',
  });

export const updateProfileSchema = z
  .object({
    username: z.string().trim().min(3).max(32).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    displayName: z.string().trim().max(80).optional(),
    phone: z.string().trim().max(30).optional(),
    lineId: z.string().trim().max(60).optional(),
    avatar: z.string().max(500).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, 'nothing to update');
