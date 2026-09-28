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
