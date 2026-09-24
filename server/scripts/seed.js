import { env } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { logger } from '../src/lib/logger.js';
import { Game } from '../src/models/game.model.js';

const SAMPLES = [
  { bggId: 13,     name: 'Catan',             minPlayers: 3, maxPlayers: 4, playtimeMin: 90,  yearPublished: 1995 },
  { bggId: 30549,  name: 'Pandemic',          minPlayers: 2, maxPlayers: 4, playtimeMin: 45,  yearPublished: 2008 },
  { bggId: 174430, name: 'Gloomhaven',        minPlayers: 1, maxPlayers: 4, playtimeMin: 120, yearPublished: 2017 },
  { bggId: 167791, name: 'Terraforming Mars', minPlayers: 1, maxPlayers: 5, playtimeMin: 120, yearPublished: 2016 },
  { bggId: 68448,  name: '7 Wonders',         minPlayers: 3, maxPlayers: 7, playtimeMin: 30,  yearPublished: 2010 },
  { bggId: 224517, name: 'Brass: Birmingham', minPlayers: 2, maxPlayers: 4, playtimeMin: 120, yearPublished: 2018 },
];

await connectDb(env.MONGODB_URI);
for (const g of SAMPLES) {
  await Game.updateOne({ bggId: g.bggId }, { $setOnInsert: g }, { upsert: true });
}
logger.info(`seeded ${SAMPLES.length} games`);
await disconnectDb();
