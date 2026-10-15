import { env } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { logger } from '../src/lib/logger.js';
import { Game } from '../src/models/game.model.js';
import { flushAudit } from '../src/lib/audit.js';
import { detailMany, upsertFromBgg } from '../src/modules/bgg/bgg.service.js';

// รูปไม่ใส่ไว้ตรงนี้ — ดึงของจริงจาก BGG ในขั้นที่ 2 (มี BGG_TOKEN) หรือ npm run bgg:refresh
const SAMPLES = [
  {
    bggId: 13,
    name: 'Catan',
    minPlayers: 3,
    maxPlayers: 4,
    playtimeMin: 90,
    yearPublished: 1995,
    publisher: 'KOSMOS',
    bggAverage: 7.1,
    bggRating: 7.0,
    bggWeight: 2.3,
    categories: ['Economic', 'Negotiation'],
    mechanics: ['Dice Rolling', 'Trading', 'Route Building'],
    description:
      'In CATAN, players try to be the dominant force on the island of Catan by building settlements, cities, and roads.',
    copies: 3,
  },
  {
    bggId: 30549,
    name: 'Pandemic',
    minPlayers: 2,
    maxPlayers: 4,
    playtimeMin: 45,
    yearPublished: 2008,
    publisher: 'Z-Man Games',
    bggAverage: 7.5,
    bggRating: 7.4,
    bggWeight: 2.4,
    categories: ['Medical', 'Cooperative'],
    mechanics: ['Action Points', 'Hand Management', 'Set Collection'],
    description:
      'In Pandemic, several virulent diseases have broken out simultaneously all over the world! The players are disease-fighting specialists.',
    copies: 2,
  },
  {
    bggId: 174430,
    name: 'Gloomhaven',
    minPlayers: 1,
    maxPlayers: 4,
    playtimeMin: 120,
    yearPublished: 2017,
    publisher: 'Cephalofair Games',
    bggAverage: 8.6,
    bggRating: 8.4,
    bggWeight: 3.9,
    categories: ['Adventure', 'Fantasy', 'Fighting'],
    mechanics: ['Campaign / Battle Card Driven', 'Cooperative Game', 'Grid Movement'],
    description:
      'Gloomhaven is a game of Euro-inspired tactical combat in a persistent world of shifting motives.',
    copies: 2,
  },
  {
    bggId: 167791,
    name: 'Terraforming Mars',
    minPlayers: 1,
    maxPlayers: 5,
    playtimeMin: 120,
    yearPublished: 2016,
    publisher: 'FryxGames',
    bggAverage: 8.4,
    bggRating: 8.2,
    bggWeight: 3.3,
    categories: ['Economic', 'Industry / Manufacturing', 'Science Fiction'],
    mechanics: ['Drafting', 'End Game Bonuses', 'Hand Management', 'Tile Placement'],
    description:
      'In the 2400s, humankind begins to terraform the planet Mars. Giant corporations sponsor vast projects to raise temperature and oxygen.',
    copies: 3,
  },
  {
    bggId: 68448,
    name: '7 Wonders',
    minPlayers: 3,
    maxPlayers: 7,
    playtimeMin: 30,
    yearPublished: 2010,
    publisher: 'Repos Production',
    bggAverage: 7.7,
    bggRating: 7.6,
    bggWeight: 2.3,
    categories: ['Ancient', 'Card Game', 'City Building', 'Civilization'],
    mechanics: [
      'Card Drafting',
      'Hand Management',
      'Set Collection',
      'Simultaneous Action Selection',
    ],
    description:
      'You are the leader of one of the 7 great cities of the Ancient World. Gather resources, develop commercial routes, and affirm your military supremacy.',
    copies: 4,
  },
  {
    bggId: 224517,
    name: 'Brass: Birmingham',
    minPlayers: 2,
    maxPlayers: 4,
    playtimeMin: 120,
    yearPublished: 2018,
    publisher: 'Roxley Games',
    bggAverage: 8.6,
    bggRating: 8.4,
    bggWeight: 3.9,
    categories: ['Economic', 'Industry / Manufacturing', 'Post-Napoleonic', 'Transportation'],
    mechanics: ['Hand Management', 'Income', 'Loans', 'Market', 'Network and Route Building'],
    description:
      "Brass: Birmingham is an economic strategy game sequel to Martin Wallace's 2007 masterpiece, Brass.",
    copies: 2,
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
