import { z } from 'zod';
import { GAME_STATUSES } from '../../models/game.model.js';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'invalid id');

export const listQuery = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  minPlayers: z.coerce.number().int().positive().optional(),
  maxPlayers: z.coerce.number().int().positive().optional(),
  year: z.coerce.number().int().optional(),
  status: z.enum(GAME_STATUSES).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  mechanic: z.string().trim().min(1).max(80).optional(),
  shelf: z.string().trim().min(1).max(40).optional(),
  minWeight: z.coerce.number().min(0).max(5).optional(),
  maxWeight: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(['name', 'year', 'createdAt', 'bggRating', 'copies']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export const idParam = z.object({ id: objectId });

const thisYear = new Date().getFullYear();
const players = z.coerce
  .number()
  .int('จำนวนผู้เล่นต้องเป็นจำนวนเต็ม')
  .min(1, 'ผู้เล่นอย่างน้อย 1 คน')
  .max(99, 'ผู้เล่นไม่เกิน 99 คน');
const imageUrl = z
  .string()
  .trim()
  .url('ลิงก์รูปไม่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)');

const gameFields = z.object({
  bggId: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1, 'กรอกชื่อเกม').max(200, 'ชื่อเกมไม่เกิน 200 ตัวอักษร'),
  minPlayers: players.default(1),
  maxPlayers: players.default(4),
  playtimeMin: z.coerce
    .number()
    .int()
    .min(1, 'เวลาเล่นอย่างน้อย 1 นาที')
    .max(1440, 'เวลาเล่นไม่เกิน 24 ชม.')
    .default(60),
  yearPublished: z.coerce
    .number()
    .int()
    .min(1800, 'ปีที่วางจำหน่ายไม่ถูกต้อง')
    .max(thisYear + 1, 'ปีที่วางจำหน่ายไม่ถูกต้อง')
    .optional(),
  thumbnail: imageUrl.optional().or(z.literal('')),
  image: imageUrl.optional().or(z.literal('')),
  description: z.string().max(10000, 'คำอธิบายยาวเกินไป').optional(),
  bggAverage: z.coerce.number().min(0).max(10).optional(),
  bggRating: z.coerce.number().min(0).optional(),
  bggWeight: z.coerce.number().min(0).max(5).optional(),
  categories: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  mechanics: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  designers: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  status: z.enum(GAME_STATUSES).optional(),
  copies: z.coerce.number().int().min(1, 'อย่างน้อย 1 กล่อง').max(999).optional(),
  shelf: z.string().trim().max(40, 'ชั้นวางไม่เกิน 40 ตัวอักษร').optional(),
  sku: z.string().trim().max(40).optional(),
  barcode: z.string().trim().max(60).optional(),
  publisher: z.string().trim().max(120).optional(),
  notes: z.string().max(2000).optional(),
});

// ผู้เล่นต่ำสุดต้องไม่มากกว่าสูงสุด (เช็คเมื่อส่งมาทั้งคู่)
const playersInOrder = [
  (o) => o.minPlayers === undefined || o.maxPlayers === undefined || o.minPlayers <= o.maxPlayers,
  { path: ['maxPlayers'], message: 'ผู้เล่นสูงสุดต้องไม่น้อยกว่าผู้เล่นต่ำสุด' },
];

export const gameBody = gameFields.refine(...playersInOrder);

export const gameBodyPartial = gameFields.partial().refine(...playersInOrder);

export const copiesBody = z.object({
  copies: z.coerce.number().int().min(1).max(999).optional(),
  status: z.enum(GAME_STATUSES).optional(),
  shelf: z.string().trim().max(40).optional(),
});
