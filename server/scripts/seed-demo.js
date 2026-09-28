// ข้อมูลตัวอย่างสำหรับ demo หน้า dashboard / รายงาน:
// สมาชิก demo 5 คน + การจองย้อนหลัง 21 วัน (จบแล้ว/ยกเลิก/no-show) + การจองล่วงหน้า + รีวิว
// ต้องรัน seed (เกม) กับ seed:tables ก่อน — รันซ้ำได้ (ลบเฉพาะข้อมูลที่ script นี้สร้าง)
// usage: npm run --workspace server seed:demo
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { logger } from '../src/lib/logger.js';
import { User } from '../src/models/user.model.js';
import { Game } from '../src/models/game.model.js';
import { Table } from '../src/models/table.model.js';
import { Reservation } from '../src/models/reservation.model.js';
import { Review } from '../src/models/review.model.js';
import { calcPrice } from '../src/modules/reservations/reservations.rules.js';

const TAG = 'demo-seed';
const H = 60 * 60 * 1000;
const DEMO_USERS = ['demo_ploy', 'demo_ton', 'demo_mint', 'demo_bank', 'demo_fah'];

// สุ่มแบบกำหนด seed ได้ → ได้ข้อมูลเหมือนเดิมทุกครั้ง
let seed = 42;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

await connectDb(env.MONGODB_URI);

const [games, tables] = await Promise.all([
  Game.find({ status: { $ne: 'maintenance' } }).lean(),
  Table.find({ status: 'active' }).lean(),
]);
if (!games.length || !tables.length) {
  logger.error('run `seed` and `seed:tables` first');
  await disconnectDb();
  process.exit(1);
}

const passwordHash = await bcrypt.hash('demo1234', 10);
const users = [];
for (const username of DEMO_USERS) {
  const u = await User.findOneAndUpdate(
    { username },
    { $setOnInsert: { username, email: `${username}@demo.local`, passwordHash, role: 'user' } },
    { upsert: true, new: true },
  );
  users.push(u);
}

await Reservation.deleteMany({ note: TAG });
await Review.deleteMany({ user: { $in: users.map((u) => u._id) } });

// เวลาเริ่มที่เป็นไปได้ (เวลาไทย) — เย็นกับเสาร์อาทิตย์คนเยอะกว่า
const HOURS_WEEKDAY = [13, 15, 17, 18, 18, 19, 19, 20];
const HOURS_WEEKEND = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const docs = [];
const now = Date.now();
for (let daysAgo = 21; daysAgo >= 1; daysAgo -= 1) {
  const day = new Date(now - daysAgo * 24 * H);
  const localDate = new Date(day.getTime() + 7 * H).toISOString().slice(0, 10);
  const dow = new Date(`${localDate}T00:00:00Z`).getUTCDay();
  const weekend = dow === 0 || dow === 6;
  const count = weekend ? 6 + Math.floor(rand() * 4) : 2 + Math.floor(rand() * 4);
  const used = new Set();

  for (let i = 0; i < count; i += 1) {
    const table = pick(tables);
    const hour = pick(weekend ? HOURS_WEEKEND : HOURS_WEEKDAY);
    const key = `${table._id}-${hour}`;
    if (used.has(key)) continue;
    used.add(key);

    const game = pick(games);
    const players = Math.max(
      game.minPlayers,
      Math.min(game.maxPlayers, table.capacity, 2 + Math.floor(rand() * 3)),
    );
    const durationHours = pick([1, 1.5, 2, 2, 3]);
    const startAt = new Date(`${localDate}T${String(hour).padStart(2, '0')}:00:00+07:00`);
    const endAt = new Date(startAt.getTime() + durationHours * H);
    const member = rand() < 0.7 ? pick(users) : null;
    const roll = rand();
    const status = roll < 0.85 ? 'completed' : roll < 0.93 ? 'cancelled' : 'no_show';
    const price = calcPrice({ players, durationHours, tableExtraPerHour: table.extraPerHour });
    const overtime = status === 'completed' && rand() < 0.2 ? 0.5 : 0;
    const overtimeCharge = Math.round(overtime * (players * 50 + table.extraPerHour));

    docs.push({
      user: member?._id ?? null,
      customer: member ? {} : { name: pick(['คุณเอ', 'คุณบี', 'Walk-in']), phone: '' },
      source: member ? pick(['online', 'online', 'walk_in']) : 'walk_in',
      table: table._id,
      game: game._id,
      players,
      startAt,
      endAt,
      durationHours,
      price,
      status,
      note: TAG,
      ...(status === 'completed' && {
        startedAt: startAt,
        returnedAt: new Date(endAt.getTime() + overtime * H),
        checkout: {
          actualMinutes: Math.round((durationHours + overtime) * 60),
          overtimeHours: overtime,
          overtimeCharge,
          total: price.total + overtimeCharge,
          condition: 'good',
        },
        payment: {
          status: 'paid',
          method: pick(['cash', 'qr', 'transfer', 'card']),
          amount: price.total + overtimeCharge,
          paidAt: endAt,
        },
      }),
      ...(status === 'cancelled' && { cancelledAt: startAt, cancelReason: 'changed plans' }),
      ...(status === 'no_show' && { noShowAt: startAt }),
    });
  }
}

// การจองล่วงหน้า 2 วันข้างหน้า (ให้หน้า "รายการล่วงหน้า" และตารางเวลาโต๊ะมีข้อมูล)
for (let d = 1; d <= 2; d += 1) {
  const localDate = new Date(now + d * 24 * H + 7 * H).toISOString().slice(0, 10);
  for (const [i, hour] of [14, 18].entries()) {
    const table = tables[(d + i) % tables.length];
    const game = games[(d + i) % games.length];
    const players = Math.max(game.minPlayers, Math.min(game.maxPlayers, table.capacity, 3));
    const startAt = new Date(`${localDate}T${hour}:00:00+07:00`);
    docs.push({
      user: users[(d + i) % users.length]._id,
      source: 'online',
      table: table._id,
      game: game._id,
      players,
      startAt,
      endAt: new Date(startAt.getTime() + 2 * H),
      durationHours: 2,
      price: calcPrice({ players, durationHours: 2, tableExtraPerHour: table.extraPerHour }),
      status: 'booked',
      note: TAG,
    });
  }
}

await Reservation.insertMany(docs);

const reviews = [];
for (const u of users) {
  for (const g of games.slice(0, 4)) {
    if (rand() < 0.6) {
      reviews.push({
        user: u._id,
        game: g._id,
        rating: 6 + Math.floor(rand() * 5),
        comment: pick(['สนุกมาก', 'เล่นกับเพื่อนดี', 'กติกาเยอะไปนิด', 'อยากเล่นอีก']),
      });
    }
  }
}
await Review.insertMany(reviews);

logger.info(
  `demo data: ${users.length} members (password demo1234), ${docs.length} reservations, ${reviews.length} reviews`,
);
await disconnectDb();
