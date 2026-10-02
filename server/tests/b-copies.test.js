// Integration: เกมเดียวกันมีหลายกล่อง (field `copies` ของ module games)
//  - จองเกมเดียวกันพร้อมกันได้ไม่เกินจำนวนกล่อง (นับการใช้พร้อมกันจริง ไม่ใช่แค่จำนวนที่ทับช่วง)
//  - /availability ส่ง copies / copiesLeft
//  - สถานะเกมเป็น in_use เมื่อเล่นอยู่ครบทุกกล่อง
//  - แจ้งซ่อมระบุจำนวนกล่อง → ปิดเฉพาะกล่องที่เสีย, maintenance เมื่อซ่อมครบทุกกล่อง
//  - แจ้งซ่อมแล้วบอกรายการจองที่ไม่มีกล่องให้, แก้จำนวนกล่อง / เปิดใบซ่อมใหม่
//  - เกมที่ admin ปิดเอง (maintenance) ไม่ถูกเปิดคืนโดยใบแจ้งซ่อม
//  - ต่อเวลาเกมหลายกล่อง
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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

  describe('maintenance by number of copies', () => {
    let first;
    const gameStatus = async () => (await request(app).get(`/api/games/${catan}`)).body.status;
    const report = (copies) =>
      request(app)
        .post('/api/maintenance')
        .set(auth(adminT))
        .send({ itemType: 'game', game: catan, title: 'Missing cards', copies });

    beforeAll(async () => {
      await mongoose.connection.collection('reservations').deleteMany({});
      await mongoose.connection.collection('maintenancetickets').deleteMany({});
    });

    it('reporting 1 of 2 copies keeps the game bookable with 1 copy', async () => {
      const res = await report(1);
      expect(res.status).toBe(201);
      expect(res.body.copies).toBe(1);
      first = res.body;
      expect(await gameStatus()).toBe('available');

      const avail = await request(app)
        .get('/api/reservations/availability')
        .query({ startAt: at(3), durationHours: 1 });
      const c = avail.body.games.find((g) => g.name === 'Catan');
      expect(c.copies).toBe(2);
      expect(c.copiesInRepair).toBe(1);
      expect(c.copiesLeft).toBe(1);
      expect(c.available).toBe(true);

      expect((await book(0, catan, 3)).status).toBe(201);
      const second = await book(1, catan, 3);
      expect(second.status).toBe(409);
    });

    it('cannot report more copies than are still good', async () => {
      const tooMany = await report(2);
      expect(tooMany.status).toBe(400);
      expect(tooMany.body.error).toMatch(/only 1 of 2/);
    });

    it('all copies under repair → maintenance; resolving one reopens it', async () => {
      expect((await report(1)).status).toBe(201);
      expect(await gameStatus()).toBe('maintenance');
      const blocked = await book(1, catan, 5);
      expect(blocked.status).toBe(409);

      const avail = await request(app)
        .get('/api/reservations/availability')
        .query({ startAt: at(5), durationHours: 1 });
      const c = avail.body.games.find((g) => g.name === 'Catan');
      expect(c.copiesInRepair).toBe(2);
      expect(c.copiesLeft).toBe(0);
      expect(c.reason).toBe('maintenance');

      const done = await request(app)
        .patch(`/api/maintenance/${first._id}`)
        .set(auth(adminT))
        .send({ status: 'resolved' });
      expect(done.status).toBe(200);
      expect(await gameStatus()).toBe('available');
      expect((await book(1, catan, 5)).status).toBe(201);
    });
  });

  describe('repair follow-ups', () => {
    const games = () => mongoose.connection.collection('games');
    const gameStatus = async (id) => (await request(app).get(`/api/games/${id}`)).body.status;
    const report = (game, copies) =>
      request(app)
        .post('/api/maintenance')
        .set(auth(adminT))
        .send({ itemType: 'game', game, title: 'Broken', copies });
    const patchTicket = (id, body) =>
      request(app).patch(`/api/maintenance/${id}`).set(auth(adminT)).send(body);

    beforeEach(async () => {
      await mongoose.connection.collection('reservations').deleteMany({});
      await mongoose.connection.collection('maintenancetickets').deleteMany({});
      await games().updateMany({}, { $set: { status: 'available' } });
    });

    it('reports which bookings no longer have a copy', async () => {
      expect((await book(0, catan, 3)).status).toBe(201);
      expect((await book(1, catan, 3.5)).status).toBe(201);

      const res = await report(catan, 1);
      expect(res.status).toBe(201);
      expect(res.body.affectedReservations).toHaveLength(1);
      expect(res.body.affectedReservations[0].table).toBe('K2'); // คนที่เริ่มทีหลัง
      expect(res.body.affectedReservations[0].member.username).toBe('bk_m1');
    });

    it('changing ticket copies and reopening recompute the game status', async () => {
      const t = (await report(catan, 1)).body;
      expect(await gameStatus(catan)).toBe('available');

      const more = await patchTicket(t._id, { copies: 2 });
      expect(more.status).toBe(200);
      expect(more.body.copies).toBe(2);
      expect(await gameStatus(catan)).toBe('maintenance');

      const tooMany = await patchTicket(t._id, { copies: 3 });
      expect(tooMany.status).toBe(400);

      const less = await patchTicket(t._id, { copies: 1 });
      expect(less.status).toBe(200);
      expect(await gameStatus(catan)).toBe('available');

      expect((await patchTicket(t._id, { status: 'resolved' })).status).toBe(200);
      const second = (await report(catan, 2)).body;
      expect(await gameStatus(catan)).toBe('maintenance');
      // เปิดใบเก่ากลับมาไม่ได้ เพราะกล่องเสียครบแล้ว
      expect((await patchTicket(t._id, { status: 'pending' })).status).toBe(400);
      expect((await patchTicket(second._id, { status: 'resolved' })).status).toBe(200);
      expect((await patchTicket(t._id, { status: 'pending' })).status).toBe(200);
      expect(await gameStatus(catan)).toBe('available');
    });

    it('a game closed by admin stays closed after a partial repair ticket', async () => {
      await games().updateOne(
        { _id: new mongoose.Types.ObjectId(catan) },
        { $set: { status: 'maintenance' } },
      );
      const t = (await report(catan, 1)).body;
      expect(await gameStatus(catan)).toBe('maintenance');
      expect((await patchTicket(t._id, { status: 'resolved' })).status).toBe(200);
      expect(await gameStatus(catan)).toBe('maintenance');
    });

    it('extending counts copies too', async () => {
      // Azul 2 กล่อง: m0 +3→+4, m1 +4→+5, m2 +4→+5 → m0 ต่อเวลาไม่ได้ (ช่วง +4→+5 เต็ม)
      const r0 = (await book(0, azul, 3)).body;
      expect((await book(1, azul, 4)).status).toBe(201);
      const r2 = (await book(2, azul, 4)).body;

      const full = await request(app)
        .patch(`/api/reservations/${r0._id}/extend`)
        .set(auth(members[0].token))
        .send({ hours: 1 });
      expect(full.status).toBe(409);
      expect(full.body.error).toMatch(/cannot extend — all 2 available copies/);

      await request(app).patch(`/api/reservations/${r2._id}/cancel`).set(auth(members[2].token));
      const ok = await request(app)
        .patch(`/api/reservations/${r0._id}/extend`)
        .set(auth(members[0].token))
        .send({ hours: 1 });
      expect(ok.status).toBe(200);
      expect(ok.body.durationHours).toBe(2);
    });
  });
});
