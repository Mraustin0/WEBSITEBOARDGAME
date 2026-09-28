import { z } from 'zod';

const hhmm = z.string().regex(/^([01]\d|2[0-4]):[0-5]\d$/, 'use HH:MM');
const money = z.coerce.number().min(0).max(100000);

const day = z.object({
  day: z.coerce.number().int().min(0).max(6),
  open: hhmm,
  close: hhmm,
  closed: z.boolean().default(false),
});

export const settingsBody = z
  .object({
    store: z
      .object({
        name: z.string().trim().max(100),
        phone: z.string().trim().max(30),
        email: z.string().trim().max(100),
        address: z.string().trim().max(300),
      })
      .partial(),
    pricing: z
      .object({ perPersonHour: money, flat3hPerPerson: money, revenueTargetPerDay: money })
      .partial(),
    booking: z
      .object({
        maxAdvanceDays: z.coerce.number().int().min(0).max(60),
        minHours: z.coerce.number().min(0.5).max(12),
        maxHours: z.coerce.number().min(0.5).max(12),
        overtimeGraceMin: z.coerce.number().int().min(0).max(120),
        extraSeats: z.coerce.number().int().min(0).max(10),
      })
      .partial(),
    operatingHours: z
      .object({
        enforce: z.boolean(),
        days: z
          .array(day)
          .length(7)
          .refine((d) => new Set(d.map((x) => x.day)).size === 7, 'need each day 0-6 once'),
      })
      .partial(),
    noShow: z
      .object({
        graceMin: z.coerce.number().int().min(0).max(240),
        depositPerPerson: money,
        suspendAfter: z.coerce.number().int().min(0).max(100),
      })
      .partial(),
  })
  .partial()
  .refine((o) => Object.values(o).some((v) => v !== undefined), 'nothing to update');
