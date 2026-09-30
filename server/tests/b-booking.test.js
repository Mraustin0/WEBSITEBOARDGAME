// Integration: tables + reservations + game lifecycle + reviews + stats (ต้องมี MONGODB_URI)
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { User } from '../src/models/user.model.js';

const MONGO = process.env.MONGODB_URI;
const describeIf = MONGO ? describe : describe.skip;

const H = 60 * 60 * 1000;
const inHours = (h) => new Date(Date.now() + h * H).toISOString();

describeIf('booking flow (integration)', () => {
  let app;
  let adminT;
  let aliceT;
  let bobT;
  let t1;
  let t2;
  let catan;
  let aliceBooking;
  let bobWalkIn;

  const auth = (t) => ({ Authorization: `Bearer ${t}` });

  async function register(username) {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username, email: `${username}@b-test.com`, password: 'secret123' });
    expect(res.status).toBe(201);
    return res.body.token;
  }

  beforeAll(async () => {
    await connectDb(MONGO);
    app = createApp();
    const db = mongoose.connection;
    await Promise.all(
      ['tables', 'reservations', 'reviews', 'games'].map((c) => db.collection(c).deleteMany({})),
    );
    await db.collection('users').deleteMany({ email: /@b-test\.com$/ });

    adminT = await register('b_admin');
    aliceT = await register('b_alice');
    bobT = await register('b_bob');
    await User.updateOne({ email: 'b_admin@b-test.com' }, { role: 'admin' });
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('admin creates tables; member cannot', async () => {
    const denied = await request(app)
      .post('/api/tables')
      .set(auth(aliceT))
      .send({ code: 'X-1', capacity: 2 });
    expect(denied.status).toBe(403);

    const a = await request(app)
      .post('/api/tables')
      .set(auth(adminT))
      .send({ code: 't-01', zone: 'Main', capacity: 4, position: { x: 10, y: 10 } });
    expect(a.status).toBe(201);
    expect(a.body.code).toBe('T-01');
    t1 = a.body;

    const b = await request(app)
      .post('/api/tables')
      .set(auth(adminT))
      .send({ code: 'VIP-1', zone: 'VIP', capacity: 6, extraPerHour: 100 });
    expect(b.status).toBe(201);
    t2 = b.body;

    const dup = await request(app)
      .post('/api/tables')
      .set(auth(adminT))
      .send({ code: 'T-01', capacity: 2 });
    expect(dup.status).toBe(409);
  });

  it('admin creates a game (status defaults to available)', async () => {
    const res = await request(app)
      .post('/api/games')
      .set(auth(adminT))
      .send({ name: 'Catan', minPlayers: 3, maxPlayers: 4, playtimeMin: 90 });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('available');
    catan = res.body;
  });

  it('availability shows free tables and games for a slot', async () => {
    const res = await request(app)
      .get('/api/reservations/availability')
      .query({ startAt: inHours(2), durationHours: 2, players: 3 });
    expect(res.status).toBe(200);
    expect(res.body.bookable).toBe(true);
    expect(res.body.tables.every((t) => t.available)).toBe(true);
    expect(res.body.games.find((g) => g._id === catan._id).available).toBe(true);
  });

  it('quote calculates price without saving', async () => {
    const res = await request(app)
      .post('/api/reservations/quote')
      .set(auth(aliceT))
      .send({ table: t2._id, game: catan._id, players: 3, startAt: inHours(2), durationHours: 2 });
    expect(res.status).toBe(200);
    expect(res.body.price.total).toBe(2 * (3 * 50 + 100));
  });

  it('member books a table + game', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set(auth(aliceT))
      .send({ table: t1._id, game: catan._id, players: 3, startAt: inHours(2), durationHours: 2 });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('booked');
    expect(res.body.table.code).toBe('T-01');
    expect(res.body.price.total).toBe(300);
    aliceBooking = res.body;
  });

  it('rejects double booking of the same table or game', async () => {
    const sameTable = await request(app)
      .post('/api/reservations')
      .set(auth(bobT))
      .send({ table: t1._id, players: 2, startAt: inHours(3), durationHours: 1 });
    expect(sameTable.status).toBe(409);

    const sameGame = await request(app)
      .post('/api/reservations')
      .set(auth(bobT))
      .send({ table: t2._id, game: catan._id, players: 3, startAt: inHours(3), durationHours: 1 });
    expect(sameGame.status).toBe(409);
  });

  it('enforces 3-day window, table capacity and game player count', async () => {
    const far = await request(app)
      .post('/api/reservations')
      .set(auth(bobT))
      .send({ table: t2._id, players: 2, startAt: inHours(24 * 3 + 1), durationHours: 1 });
    expect(far.status).toBe(400);

    const tooMany = await request(app)
      .post('/api/reservations')
      .set(auth(bobT))
      .send({ table: t1._id, players: 5, startAt: inHours(10), durationHours: 1 });
    expect(tooMany.status).toBe(400);

    const badCount = await request(app)
      .post('/api/reservations')
      .set(auth(bobT))
      .send({ table: t2._id, game: catan._id, players: 6, startAt: inHours(10), durationHours: 1 });
    expect(badCount.status).toBe(400);
  });

  it('member edits own booking (move time) and others cannot see it', async () => {
    const res = await request(app)
      .put(`/api/reservations/${aliceBooking._id}`)
      .set(auth(aliceT))
      .send({ startAt: inHours(10), durationHours: 1.5 });
    expect(res.status).toBe(200);
    expect(new Date(res.body.endAt) - new Date(res.body.startAt)).toBe(1.5 * H);
    expect(res.body.price.total).toBe(Math.round(1.5 * 150));

    const other = await request(app).get(`/api/reservations/${aliceBooking._id}`).set(auth(bobT));
    expect(other.status).toBe(404);
  });

  it('walk-in booking starting now becomes playing and game becomes in_use', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set(auth(bobT))
      .send({ table: t2._id, game: catan._id, players: 4, startAt: inHours(0), durationHours: 1 });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('playing');
    bobWalkIn = res.body;

    const game = await request(app).get(`/api/games/${catan._id}`);
    expect(game.body.status).toBe('in_use');

    const floor = await request(app).get('/api/tables/floor');
    expect(floor.status).toBe(200);
    const vip = floor.body.tables.find((t) => t.code === 'VIP-1');
    expect(vip.state).toBe('occupied');
    expect(vip.current.game.name).toBe('Catan');
    expect(floor.body.tables.find((t) => t.code === 'T-01').state).toBe('available');
  });

  it('lists my reservations by scope', async () => {
    const upcoming = await request(app).get('/api/reservations?scope=upcoming').set(auth(aliceT));
    expect(upcoming.status).toBe(200);
    expect(upcoming.body.total).toBe(1);

    const active = await request(app).get('/api/reservations?scope=active').set(auth(bobT));
    expect(active.body.items[0]._id).toBe(bobWalkIn._id);
  });

  it('cannot cancel a started booking as member; return game → completed + available', async () => {
    const cancel = await request(app)
      .patch(`/api/reservations/${bobWalkIn._id}/cancel`)
      .set(auth(bobT));
    expect(cancel.status).toBe(409);

    const notOwner = await request(app)
      .patch(`/api/reservations/${bobWalkIn._id}/return`)
      .set(auth(aliceT));
    expect(notOwner.status).toBe(404);

    const ret = await request(app)
      .patch(`/api/reservations/${bobWalkIn._id}/return`)
      .set(auth(bobT));
    expect(ret.status).toBe(200);
    expect(ret.body.status).toBe('completed');

    const game = await request(app).get(`/api/games/${catan._id}`);
    expect(game.body.status).toBe('available');

    const again = await request(app)
      .patch(`/api/reservations/${bobWalkIn._id}/return`)
      .set(auth(bobT));
    expect(again.status).toBe(409);
  });

  it('member cancels an upcoming booking', async () => {
    const res = await request(app)
      .patch(`/api/reservations/${aliceBooking._id}/cancel`)
      .set(auth(aliceT))
      .send({ reason: 'plans changed' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
    expect(res.body.cancelReason).toBe('plans changed');
  });

  it('closed tables cannot be booked; tables with active bookings cannot be deleted', async () => {
    const close = await request(app)
      .patch(`/api/tables/${t1._id}/status`)
      .set(auth(adminT))
      .send({ status: 'closed' });
    expect(close.status).toBe(200);

    const book = await request(app)
      .post('/api/reservations')
      .set(auth(aliceT))
      .send({ table: t1._id, players: 2, startAt: inHours(5), durationHours: 1 });
    expect(book.status).toBe(409);

    await request(app)
      .patch(`/api/tables/${t1._id}/status`)
      .set(auth(adminT))
      .send({ status: 'active' });
    const upcoming = await request(app)
      .post('/api/reservations')
      .set(auth(aliceT))
      .send({ table: t1._id, players: 2, startAt: inHours(5), durationHours: 1 });
    expect(upcoming.status).toBe(201);

    const del = await request(app).delete(`/api/tables/${t1._id}`).set(auth(adminT));
    expect(del.status).toBe(409);
  });

  it('maintenance games are not bookable', async () => {
    await request(app)
      .put(`/api/games/${catan._id}`)
      .set(auth(adminT))
      .send({ status: 'maintenance' });
    const res = await request(app)
      .post('/api/reservations')
      .set(auth(bobT))
      .send({ table: t2._id, game: catan._id, players: 3, startAt: inHours(20), durationHours: 1 });
    expect(res.status).toBe(409);
    await request(app)
      .put(`/api/games/${catan._id}`)
      .set(auth(adminT))
      .send({ status: 'available' });
  });

  it('admin sees all reservations; member cannot', async () => {
    const res = await request(app).get('/api/reservations/admin').set(auth(adminT));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);

    const denied = await request(app).get('/api/reservations/admin').set(auth(aliceT));
    expect(denied.status).toBe(403);
  });

  it('reviews: upsert keeps one per user+game, summary + my', async () => {
    await request(app).post('/api/reviews').set(auth(aliceT)).send({ game: catan._id, rating: 6 });
    await request(app)
      .post('/api/reviews')
      .set(auth(aliceT))
      .send({ game: catan._id, rating: 8, comment: 'fun' });
    await request(app).post('/api/reviews').set(auth(bobT)).send({ game: catan._id, rating: 9 });

    const summary = await request(app).get(`/api/reviews/${catan._id}/summary`);
    expect(summary.status).toBe(200);
    expect(summary.body.count).toBe(2);
    expect(summary.body.average).toBe(8.5);
    expect(summary.body.distribution['9']).toBe(1);

    const mine = await request(app).get('/api/reviews/my').set(auth(aliceT));
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0].rating).toBe(8);

    const missing = await request(app)
      .post('/api/reviews')
      .set(auth(aliceT))
      .send({ game: '64b000000000000000000000', rating: 5 });
    expect(missing.status).toBe(404);
  });

  it('admin can delete another user review', async () => {
    const list = await request(app).get(`/api/reviews/${catan._id}`);
    const bobs = list.body.find((r) => r.user.username === 'b_bob');
    const res = await request(app).delete(`/api/reviews/${bobs._id}`).set(auth(adminT));
    expect(res.status).toBe(200);
  });

  it('stats: overview, daily, popular games, me', async () => {
    const overview = await request(app).get('/api/stats/overview').set(auth(adminT));
    expect(overview.status).toBe(200);
    expect(overview.body.reservations.completed).toBe(1);
    expect(overview.body.tables.total).toBe(2);

    const daily = await request(app).get('/api/stats/daily').set(auth(adminT));
    expect(daily.body.series).toHaveLength(7);

    const popular = await request(app).get('/api/stats/popular-games');
    expect(popular.status).toBe(200);
    expect(popular.body[0].game.name).toBe('Catan');
    expect(popular.body[0].reservations).toBeGreaterThanOrEqual(1);

    const me = await request(app).get('/api/stats/me').set(auth(bobT));
    expect(me.body.reservations.completed).toBe(1);
    expect(me.body.favoriteGames[0].game.name).toBe('Catan');

    const hourly = await request(app).get('/api/stats/hourly').set(auth(adminT));
    expect(hourly.body.series).toHaveLength(24);

    const tables = await request(app).get('/api/stats/tables').set(auth(adminT));
    expect(tables.body.tables).toHaveLength(2);
  });
});
