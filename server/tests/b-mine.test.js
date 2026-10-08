// Integration: หน้า "การจองของฉัน" + modal เลือกเกม ตาม FE ฝั่ง user ชุดใหม่ (FE_new)
//  - GET /reservations?q= + counts ของแต่ละแท็บ
//  - /availability บอกว่าเกมถูกใช้อยู่ที่โต๊ะไหน (inUseAt)
//  - สมาชิกยกเลิกเองได้ถึงก่อนเริ่ม booking.cancelCutoffHours (default 2 ชม.)
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { User } from '../src/models/user.model.js';
import { Game } from '../src/models/game.model.js';

const MONGO = process.env.MONGODB_URI;
const describeIf = MONGO ? describe : describe.skip;

const H = 60 * 60 * 1000;
const inHours = (h) => new Date(Date.now() + h * H).toISOString();

describeIf('my reservations + game picker (integration)', () => {
  let app;
  let adminT;
  let memberT;
  let a1;
  let vip;
  let catan;
  let azul;
  let soon;
  let later;

  const auth = (t) => ({ Authorization: `Bearer ${t}` });

  async function register(username) {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username, email: `${username}@bm-test.com`, password: 'secret123' });
    expect(res.status).toBe(201);
    return res.body;
  }

  beforeAll(async () => {
    await connectDb(MONGO);
    app = createApp();
    const db = mongoose.connection;
    await Promise.all(
      ['tables', 'reservations', 'reviews', 'games', 'settings'].map((c) =>
        db.collection(c).deleteMany({}),
      ),
    );
    await db.collection('users').deleteMany({ email: /@bm-test\.com$/ });

    adminT = (await register('bm_admin')).token;
    memberT = (await register('bm_member')).token;
    await User.updateOne({ email: 'bm_admin@bm-test.com' }, { role: 'admin' });

    const mk = (code, zone) =>
      request(app).post('/api/tables').set(auth(adminT)).send({ code, zone, capacity: 4 });
    a1 = (await mk('A1', 'Main')).body;
    vip = (await mk('VIP1', 'VIP')).body;
    const mkGame = async (name, categories) => {
      const g = (
        await Game.create({ name, minPlayers: 2, maxPlayers: 4, categories, bggAverage: 7.8 })
      ).toObject();
      return { ...g, _id: String(g._id) };
    };
    catan = await mkGame('Catan', ['Strategy']);
    azul = await mkGame('Azul', ['Family']);

    const book = (table, game, h) =>
      request(app)
        .post('/api/reservations')
        .set(auth(memberT))
        .send({ table, game, players: 3, startAt: inHours(h), durationHours: 1 });
    soon = (await book(a1._id, catan._id, 1)).body;
    later = (await book(vip._id, azul._id, 5)).body;
    expect(soon.status).toBe('booked');
    expect(later.status).toBe('booked');
  });

  afterAll(async () => {
    await mongoose.connection.collection('settings').deleteMany({});
    await disconnectDb();
  });

  it('member cannot cancel within 2 hours of start, but can before that', async () => {
    const tooLate = await request(app)
      .patch(`/api/reservations/${soon._id}/cancel`)
      .set(auth(memberT));
    expect(tooLate.status).toBe(409);
    expect(tooLate.body.error).toMatch(/2 hours/);

    const ok = await request(app)
      .patch(`/api/reservations/${later._id}/cancel`)
      .set(auth(memberT))
      .send({ reason: 'busy' });
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('cancelled');
  });

  it('list returns tab counts and supports search by table or game', async () => {
    const up = await request(app).get('/api/reservations?scope=upcoming').set(auth(memberT));
    expect(up.status).toBe(200);
    expect(up.body.total).toBe(1);
    expect(up.body.counts).toEqual({ active: 0, upcoming: 1, past: 1 });
    expect(up.body.items[0].game.bggAverage).toBe(7.8);

    const byGame = await request(app).get('/api/reservations?q=cat').set(auth(memberT));
    expect(byGame.body.total).toBe(1);
    expect(byGame.body.items[0]._id).toBe(soon._id);
    expect(byGame.body.counts).toEqual({ active: 0, upcoming: 1, past: 0 });

    const byTable = await request(app).get('/api/reservations?q=vip').set(auth(memberT));
    expect(byTable.body.total).toBe(1);
    expect(byTable.body.items[0]._id).toBe(later._id);

    const none = await request(app).get('/api/reservations?q=zzz').set(auth(memberT));
    expect(none.body.total).toBe(0);
    expect(none.body.counts).toEqual({ active: 0, upcoming: 0, past: 0 });
  });

  it('availability tells which table a game is booked at', async () => {
    const res = await request(app)
      .get('/api/reservations/availability')
      .query({ startAt: soon.startAt, durationHours: 1, players: 3 });
    expect(res.status).toBe(200);
    const c = res.body.games.find((g) => g.name === 'Catan');
    const a = res.body.games.find((g) => g.name === 'Azul');
    expect(c.available).toBe(false);
    expect(c.reason).toBe('booked');
    expect(c.inUseAt).toHaveLength(1);
    expect(c.inUseAt[0].table).toBe('A1');
    expect(c.inUseAt[0].status).toBe('booked');
    expect(c.categories).toEqual(['Strategy']);
    expect(c.bggAverage).toBe(7.8);
    expect(a.available).toBe(true);
    expect(a.inUseAt).toEqual([]);
  });

  it('cancel cutoff is configurable in settings (0 = until start)', async () => {
    const put = await request(app)
      .put('/api/settings')
      .set(auth(adminT))
      .send({ booking: { cancelCutoffHours: 0 } });
    expect(put.status).toBe(200);
    expect(put.body.booking.cancelCutoffHours).toBe(0);

    const rules = await request(app).get('/api/reservations/rules');
    expect(rules.body.CANCEL_CUTOFF_HOURS).toBe(0);

    const res = await request(app).patch(`/api/reservations/${soon._id}/cancel`).set(auth(memberT));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });
});
