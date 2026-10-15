import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be ≥16 chars'),
  // คั่นหลาย origin ด้วย , เช่น https://shop.example.com,https://admin.example.com
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  // จำนวน reverse proxy ข้างหน้า (0 = ไม่มี → ไม่เชื่อ X-Forwarded-For กันปลอม IP หลบ rate limit)
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  BGG_TOKEN: z.string().optional().default(''),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid env:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';

// production ห้ามใช้ secret ตัวอย่าง / สั้นเกิน — ใครรู้ secret ปลอม token เป็น admin ได้ทันที
const PLACEHOLDER_SECRETS = new Set([
  'change-me-please',
  'change-me-to-a-long-random-string-please',
  'test-secret-that-is-long-enough',
]);
if (isProd && (PLACEHOLDER_SECRETS.has(env.JWT_SECRET) || env.JWT_SECRET.length < 32)) {
  console.error('Invalid env: JWT_SECRET must be a random string ≥32 chars in production');
  process.exit(1);
}

/** origin ที่อนุญาต (CORS) — dev เพิ่ม localhost ของ Vite ให้อัตโนมัติ */
export const clientOrigins = Array.from(
  new Set([
    ...env.CLIENT_ORIGIN.split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    ...(isProd ? [] : ['http://localhost:5173', 'http://localhost:5174']),
  ]),
);
export const isTest = env.NODE_ENV === 'test';
