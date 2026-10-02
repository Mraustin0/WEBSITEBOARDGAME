// สร้างผังโต๊ะตัวอย่าง (ไม่ทับโต๊ะที่มี code ซ้ำอยู่แล้ว): npm run --workspace server seed:tables
import { env } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { logger } from '../src/lib/logger.js';
import { Table } from '../src/models/table.model.js';

// position เป็น % ของพื้นที่ floor plan
const TABLES = [
  { code: 'A1', zone: 'Main', capacity: 4, shape: 'rect', position: { x: 5, y: 10, w: 18, h: 15 } },
  {
    code: 'A2',
    zone: 'Main',
    capacity: 4,
    shape: 'rect',
    position: { x: 28, y: 10, w: 18, h: 15 },
  },
  {
    code: 'A3',
    zone: 'Main',
    capacity: 6,
    shape: 'rect',
    position: { x: 51, y: 10, w: 22, h: 15 },
  },
  {
    code: 'B1',
    zone: 'Main',
    capacity: 2,
    shape: 'round',
    position: { x: 5, y: 40, w: 12, h: 12 },
  },
  {
    code: 'B2',
    zone: 'Main',
    capacity: 2,
    shape: 'round',
    position: { x: 22, y: 40, w: 12, h: 12 },
  },
  {
    code: 'B3',
    zone: 'Main',
    capacity: 4,
    shape: 'round',
    position: { x: 39, y: 40, w: 14, h: 14 },
  },
  {
    code: 'VIP1',
    name: 'Private Room 1',
    zone: 'VIP',
    capacity: 8,
    extraPerHour: 100,
    position: { x: 78, y: 10, w: 18, h: 30 },
  },
  {
    code: 'VIP2',
    name: 'Private Room 2',
    zone: 'VIP',
    capacity: 10,
    extraPerHour: 150,
    position: { x: 78, y: 50, w: 18, h: 35 },
  },
  { code: 'C1', zone: 'Outdoor', capacity: 4, position: { x: 5, y: 75, w: 18, h: 15 } },
  { code: 'C2', zone: 'Outdoor', capacity: 4, position: { x: 28, y: 75, w: 18, h: 15 } },
];

await connectDb(env.MONGODB_URI);
let created = 0;
for (const t of TABLES) {
  const res = await Table.updateOne({ code: t.code }, { $setOnInsert: t }, { upsert: true });
  created += res.upsertedCount;
}
logger.info(`seeded tables: ${created} new, ${TABLES.length - created} already existed`);
await disconnectDb();
