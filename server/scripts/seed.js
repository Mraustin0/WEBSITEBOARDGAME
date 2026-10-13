import { env } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { logger } from '../src/lib/logger.js';
import { Game } from '../src/models/game.model.js';
import { flushAudit } from '../src/lib/audit.js';
import { detailMany, upsertFromBgg } from '../src/modules/bgg/bgg.service.js';

const SAMPLES = [
  { bggId: 13, name: 'Catan', minPlayers: 3, maxPlayers: 4, playtimeMin: 90, yearPublished: 1995 },
  {
    bggId: 30549,
    name: 'Pandemic',
    minPlayers: 2,
    maxPlayers: 4,
    playtimeMin: 45,
    yearPublished: 2008,
  },
  {
    bggId: 174430,
    name: 'Gloomhaven',
    minPlayers: 1,
    maxPlayers: 4,
    playtimeMin: 120,
    yearPublished: 2017,
  },
  {
    bggId: 167791,
    name: 'Terraforming Mars',
    minPlayers: 1,
    maxPlayers: 5,
    playtimeMin: 120,
    yearPublished: 2016,
  },
  {
    bggId: 68448,
    name: '7 Wonders',
    minPlayers: 3,
    maxPlayers: 7,
    playtimeMin: 30,
    yearPublished: 2010,
  },
  {
    bggId: 224517,
    name: 'Brass: Birmingham',
    minPlayers: 2,
    maxPlayers: 4,
    playtimeMin: 120,
    yearPublished: 2018,
  },
];

await connectDb(env.MONGODB_URI);

// 1) ใส่เกมตัวอย่าง (ข้อมูลพื้นฐาน — ไม่ทับเกมที่มีอยู่แล้ว)
for (const g of SAMPLES) {
  await Game.updateOne({ bggId: g.bggId }, { $setOnInsert: g }, { upsert: true });
}
logger.info(`seeded ${SAMPLES.length} games`);

// 2) มี BGG_TOKEN → ดึงรูป/เรตติ้ง/weight/หมวดจาก BGG ทีเดียว 6 เกม (ไม่ทับชื่อ/copies/ชั้นวาง)
if (env.BGG_TOKEN) {
  try {
    const infos = await detailMany(SAMPLES.map((g) => g.bggId));
    for (const info of infos) await upsertFromBgg(info);
    await flushAudit();
    logger.info(`enriched ${infos.length} games from BGG (image, ratings, categories)`);
  } catch (err) {
    logger.warn(`BGG enrich skipped: ${err.message}`);
  }
} else {
  logger.warn(
    'BGG_TOKEN not set → games have no images. Set it in server/.env then run: npm run bgg:refresh',
  );
}

await disconnectDb();
