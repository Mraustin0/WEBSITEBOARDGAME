import { z } from 'zod';

export const searchQuery = z.object({
  q: z.string().trim().min(1).max(100),
});

export const bggIdParam = z.object({
  bggId: z.coerce.number().int().positive(),
});

// POST /api/bgg/import/:bggId — overwrite=true ทับชื่อ/คำอธิบาย/จำนวนผู้เล่น/เวลาเล่นที่ร้านแก้ไว้ด้วย
export const importBody = z
  .object({
    overwrite: z.boolean().optional().default(false),
  })
  .default({});
