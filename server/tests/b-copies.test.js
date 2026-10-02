// Integration: เกมเดียวกันมีหลายกล่อง (field `copies` ของ module games)
//  - จองเกมเดียวกันพร้อมกันได้ไม่เกินจำนวนกล่อง (นับการใช้พร้อมกันจริง ไม่ใช่แค่จำนวนที่ทับช่วง)
//  - /availability ส่ง copies / copiesLeft
//  - สถานะเกมเป็น in_use เมื่อเล่นอยู่ครบทุกกล่อง
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { User } from '../src/models/user.model.js';

const MONGO = process.env.MONGODB_URI;
const describeIf = MONGO ? describe : describe.skip;

const H = 60 * 60 * 1000;
// ปัดเป็นต้นชั่วโมงถัดไป +N ชม. ให้ช่วงเวลาตรงกันทุก request
const base = Math.ceil(Date.now() / H) * H;
const at = (h) => new Date(base + h * H).toISOString();

describeIf('game copies (integration)', () => {
  let app;
  let adminT;
  const members = [];
  const tables = [];
  let catan; // 2 กล่อง
  let azul; // 2 กล่อง
  let walkIns = [];

  const auth = (t) => ({ Authorization: `Bearer ${t}` });

  async function register(username) {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username, email: `${username}@bk-test.com`, password: 'secret123' });
    expect(res.status).toBe(201);
    return res.body;
  }

  // ใส่ copies ผ่าน collection ตรง ๆ (ไม่ขึ้นกับว่า schema ของ games มี field นี้แล้วหรือยัง)
  async function makeGame(name, copies) {
    const { insertedId } = await mongoose.connection.collection('games').insertOne({
      name,
      minPlayers: 2,
      maxPlayers: 4,
      playtimeMin: 45,
      status: 'available',
      categories: [],
      copies,
    });
    return String(insertedId);
  }

  const book = (i, game, start, hours = 1) =>
    request(app)
      .post('/api/reservations')
      .set(auth(members[i].token))
      .send({ table: tables[i]._id, game, players: 2, startAt: at(start), durationHours: hours });

  beforeAll(async () => {
    await connectDb(MONGO);
    app = createApp();
    const db = mongoose.connection;
    await Promise.all(
      ['tables', 'reservations', 'games', 'settings'].map((c) => db.collection(c).deleteMany({})),
    );
    await db.collection('users').deleteMany({ email: /@bk-test\.com$/ });

    adminT = (await register('bk_admin')).token;
    await User.updateOne({ email: 'bk_admin@bk-test.com' }, { role: 'admin' });
    for (let i = 0; i < 4; i += 1) {
      members.push(await register(`bk_m${i}`));
      tables.push(
        (
          await request(app)
            .post('/api/tables')
            .set(auth(adminT))
            .send({ code: `K${i + 1}`, zone: 'Main', capacity: 4 })
        ).body,
      );
    }
    catan = await makeGame('Catan', 2);
    azul = await makeGame('Azul', 2);
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('allows as many overlapping bookings as copies, based on real concurrency', async () => {
    // m0: +3→+4, m1: +4→+5 (ต่อคิวกัน)
    expect((await book(0, catan, 3)).status).toBe(201);
    expect((await book(1, catan, 4)).status).toBe(201);
    // m2: +3.5→+4.5 ทับทั้งคู่ แต่ใช้พร้อมกันสูงสุดแค่ 2 กล่อง → ได้
    expect((await book(2, catan, 3.5)).status).toBe(201);
    // m3: +3.5→+4.5 → ช่วง +3.5→+4 จะใช้ 3 กล่อง → ไม่ได้
    const full = await book(3, catan, 3.5);
    expect(full.status).toBe(409);
    expect(full.body.error).toMatch(/all 2 copies/);
    // แต่ +5 เป็นต้นไปว่าง
    expect((await book(3, catan, 5)).status).toBe(201);
  });

  it('availability reports copies and copies left', async () => {
    const busy = await request(app)
      .get('/api/reservations/availability')
      .query({ startAt: at(3.5), durationHours: 1 });
    expect(busy.status).toBe(200);
    const c = busy.body.games.find((g) => g.name === 'Catan');
    expect(c.copies).toBe(2);
    expect(c.copiesLeft).toBe(0);
    expect(c.available).toBe(false);
    expect(c.reason).toBe('booked');
    expect(c.inUseAt.map((x) => x.table).sort()).toEqual(['K1', 'K2', 'K3']);

    const half = await request(app)
      .get('/api/reservations/availability')
      .query({ startAt: at(3), durationHours: 0.5 });
    const c2 = half.body.games.find((g) => g.name === 'Catan');
    expect(c2.copiesLeft).toBe(1);
    expect(c2.available).toBe(true);

    const a = busy.body.games.find((g) => g.name === 'Azul');
    expect(a.copies).toBe(2);
    expect(a.copiesLeft).toBe(2);
  });

  it('game is in_use only when every copy is being played', async () => {
    await mongoose.connection.collection('reservations').deleteMany({});
    const open = (i) =>
      request(app)
        .post('/api/reservations/admin')
        .set(auth(adminT))
        .send({
          table: tables[i]._id,
          game: azul,
          players: 2,
          durationHours: 1,
          customer: { name: `walk-in ${i}` },
        });
    const status = async () => (await request(app).get(`/api/games/${azul}`)).body.status;

    walkIns = [(await open(0)).body];
    expect(walkIns[0].status).toBe('playing');
    expect(await status()).toBe('available'); // ยังเหลือ 1 กล่อง

    walkIns.push((await open(1)).body);
    expect(walkIns[1].status).toBe('playing');
    expect(await status()).toBe('in_use'); // ครบ 2 กล่อง

    const third = await open(2);
    expect(third.status).toBe(409);

    const ret = await request(app)
      .patch(`/api/reservations/${walkIns[0]._id}/return`)
      .set(auth(adminT));
    expect(ret.status).toBe(200);
    expect(await status()).toBe('available');
  });

  it('switching to a game with no free copy is refused', async () => {
    const res = await request(app)
      .post('/api/reservations/admin')
      .set(auth(adminT))
      .send({ table: tables[2]._id, players: 2, durationHours: 1, customer: { name: 'no game' } });
    expect(res.status).toBe(201);

    // ใช้ Azul อยู่ 1 กล่อง → เปลี่ยนเป็น Azul ได้ (เหลือ 1)
    const ok = await request(app)
      .patch(`/api/reservations/${res.body._id}/game`)
      .set(auth(adminT))
      .send({ game: azul });
    expect(ok.status).toBe(200);

    // ตอนนี้ใช้ครบ 2 กล่อง → โต๊ะที่ 4 เปลี่ยนเป็น Azul ไม่ได้
    const other = await request(app)
      .post('/api/reservations/admin')
      .set(auth(adminT))
      .send({ table: tables[3]._id, players: 2, durationHours: 1, customer: { name: 'late' } });
    const full = await request(app)
      .patch(`/api/reservations/${other.body._id}/game`)
      .set(auth(adminT))
      .send({ game: azul });
    expect(full.status).toBe(409);
  });
});
