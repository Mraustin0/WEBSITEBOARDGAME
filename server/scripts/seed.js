import { env } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { logger } from '../src/lib/logger.js';
import { Game } from '../src/models/game.model.js';

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
    image:
      'https://cf.geekdo-images.com/W3Bsga_uA_M3WmgIO-51Dg__original/img/8v9-kFm_T1F28_j-hWdK68l11_g=/0x0/filters:format(jpeg)/pic2419375.jpg',
    thumbnail:
      'https://cf.geekdo-images.com/W3Bsga_uA_M3WmgIO-51Dg__thumb/img/J19ne6dV-bTjW5euT1k_b1tYv-Q=/fit-in/200x150/filters:strip_icc()/pic2419375.jpg',
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
    image:
      'https://cf.geekdo-images.com/S3ybV1LAp-ASJm0AAMjQww__original/img/Isrvgg9q1iH5FpC0kU_uB8Rj0Gk=/0x0/filters:format(jpeg)/pic1534148.jpg',
    thumbnail:
      'https://cf.geekdo-images.com/S3ybV1LAp-ASJm0AAMjQww__thumb/img/76wIeIq1HnQ5r5aV6U7r2Xp_A_U=/fit-in/200x150/filters:strip_icc()/pic1534148.jpg',
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
    image:
      'https://cf.geekdo-images.com/sZYp_3BTDGjh2XdAnjxZ2A__original/img/7qZzN2V_V8-0i0PjJ8K8bWk_J1w=/0x0/filters:format(jpeg)/pic2437871.jpg',
    thumbnail:
      'https://cf.geekdo-images.com/sZYp_3BTDGjh2XdAnjxZ2A__thumb/img/M2p6W3X3zL5a_8X8Q-1o3a6L8-g=/fit-in/200x150/filters:strip_icc()/pic2437871.jpg',
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
    image:
      'https://cf.geekdo-images.com/wg9oOLcsKvDesioGGHalRw__original/img/Iw96p7n-fM_H9VqTfL-vG2K1d9M=/0x0/filters:format(jpeg)/pic3536616.jpg',
    thumbnail:
      'https://cf.geekdo-images.com/wg9oOLcsKvDesioGGHalRw__thumb/img/qX_a7N6b7r8c5X4a3b2a1Z9y8x8=/fit-in/200x150/filters:strip_icc()/pic3536616.jpg',
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
    image:
      'https://cf.geekdo-images.com/RvFV24w72i6OCD97w2jTew__original/img/Y_U9r57VlG_e_YI7v7K6d9W_I8w=/0x0/filters:format(jpeg)/pic860217.jpg',
    thumbnail:
      'https://cf.geekdo-images.com/RvFV24w72i6OCD97w2jTew__thumb/img/3X4v5b6a7b8c9d0e1f2a3b4c5d6=/fit-in/200x150/filters:strip_icc()/pic860217.jpg',
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
    image:
      'https://cf.geekdo-images.com/x3zxjr-Vw53nzNX14CYrAQ__original/img/pqcB3Uo9m-b_I7o8cW0L3R5aYk8=/0x0/filters:format(jpeg)/pic3490053.jpg',
    thumbnail:
      'https://cf.geekdo-images.com/x3zxjr-Vw53nzNX14CYrAQ__thumb/img/4X5y6z7a8b9c0d1e2f3a4b5c6d7=/fit-in/200x150/filters:strip_icc()/pic3490053.jpg',
    description:
      "Brass: Birmingham is an economic strategy game sequel to Martin Wallace's 2007 masterpiece, Brass.",
    copies: 2,
  },
];

await connectDb(env.MONGODB_URI);
for (const g of SAMPLES) {
  await Game.updateOne({ bggId: g.bggId }, { $set: g }, { upsert: true });
}
logger.info(`seeded ${SAMPLES.length} games`);
await disconnectDb();
