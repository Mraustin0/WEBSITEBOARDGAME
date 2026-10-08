// Integration: admin walk-in / จองแทนลูกค้า, เลือกเกมทีหลัง, เช็คบิล, รับชำระ, ตารางเวลาโต๊ะ
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { User } from '../src/models/user.model.js';
import { Reservation } from '../src/models/reservation.model.js';

const MONGO = process.env.MONGODB_URI;
const describeIf = MONGO ? describe : describe.skip;

const H = 60 * 60 * 1000;
const inHours = (h) => new Date(Date.now() + h * H).toISOString();

describeIf('walk-in + checkout (integration)', () => {
  let app;
  let adminT;
  let memberT;
  let memberId;
  let table;
  let azul;
  let walkIn;
  let memberWalkIn;

  const auth = (t) => ({ Authorization: `Bearer ${t}` });

  async function register(username) {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username, email: `${username}@wc-test.com`, password: 'secret123' });
    expect(res.status).toBe(201);
    return res.body;
  }

  beforeAll(async () => {
    await connectDb(MONGO);
    app = createApp();
    const db = mongoose.connection;
    await Promise.all(
      ['tables', 'reservations', 'reviews', 'games'].map((c) => db.collection(c).deleteMany({})),
    );
    await db.collection('users').deleteMany({ email: /@wc-test\.com$/ });

    adminT = (await register('wc_admin')).token;
    const member = await register('wc_member');
    memberT = member.token;
    memberId = member.user.id;
    await User.updateOne({ email: 'wc_admin@wc-test.com' }, { role: 'admin' });

    table = (
      await request(app)
        .post('/api/tables')
        .set(auth(adminT))
        .send({ code: 'W-01', zone: 'Main', capacity: 4 })
    ).body;
    azul = (
      await request(app)
        .post('/api/games')
        .set(auth(adminT))
        .send({ name: 'Azul', minPlayers: 2, maxPlayers: 4, playtimeMin: 45 })
    ).body;
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('only admin can open a table for someone else', async () => {
    const res = await request(app)
      .post('/api/reservations/admin')
      .set(auth(memberT))
      .send({ table: table._id, players: 2, durationHours: 1, customer: { name: 'x' } });
    expect(res.status).toBe(403);
  });

  it('validates walk-in input (customer required, seats ≤ capacity + 2)', async () => {
    const noCustomer = await request(app)
      .post('/api/reservations/admin')
      .set(auth(adminT))
      .send({ table: table._id, players: 2, durationHours: 1 });
    expect(noCustomer.status).toBe(400);

    const tooMany = await request(app)
      .post('/api/reservations/admin')
      .set(auth(adminT))
      .send({ table: table._id, players: 7, durationHours: 1, customer: { name: 'Big group' } });
    expect(tooMany.status).toBe(400);
  });

  it('walk-in without a game starts immediately', async () => {
    const res = await request(app)
      .post('/api/reservations/admin')
      .set(auth(adminT))
      .send({
        table: table._id,
        players: 4,
        durationHours: 2,
        customer: { name: 'Walk-in Joe', phone: '0812345678' },
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('playing');
    expect(res.body.source).toBe('walk_in');
    expect(res.body.game).toBeNull();
    expect(res.body.user).toBeNull();
    expect(res.body.customer.name).toBe('Walk-in Joe');
    expect(res.body.createdBy.username).toBe('wc_admin');
    walkIn = res.body;
  });

  it('picks a game after the session started → game in_use', async () => {
    const res = await request(app)
      .patch(`/api/reservations/${walkIn._id}/game`)
      .set(auth(adminT))
      .send({ game: azul._id });
    expect(res.status).toBe(200);
    expect(res.body.game.name).toBe('Azul');

    const game = await request(app).get(`/api/games/${azul._id}`);
    expect(game.body.status).toBe('in_use');
  });

  it('checkout preview charges overtime beyond the grace period', async () => {
    const preview = await request(app)
      .get(`/api/reservations/${walkIn._id}/checkout`)
      .set(auth(adminT));
    expect(preview.status).toBe(200);
    expect(preview.body.bill.overtimeCharge).toBe(0);
    expect(preview.body.bill.total).toBe(2 * 4 * 50);

    // จำลองว่าเล่นมาแล้ว 2 ชม. 15 นาที (เกิน 15 นาที → คิดเพิ่มครึ่งชั่วโมง)
    await Reservation.updateOne(
      { _id: walkIn._id },
      { startedAt: new Date(Date.now() - (2 * H + 15 * 60 * 1000)) },
    );
    const late = await request(app)
      .get(`/api/reservations/${walkIn._id}/checkout`)
      .set(auth(adminT));
    expect(late.body.bill.overtimeHours).toBe(0.5);
    expect(late.body.bill.overtimeCharge).toBe(100);
    expect(late.body.bill.total).toBe(400 + 100);
  });

  it('return with damage + cash payment → completed, paid, game maintenance', async () => {
    const res = await request(app)
      .patch(`/api/reservations/${walkIn._id}/return`)
      .set(auth(adminT))
      .send({ condition: 'damaged', damageNote: 'missing 2 tiles', paymentMethod: 'cash' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.checkout.total).toBe(500);
    expect(res.body.checkout.condition).toBe('damaged');
    expect(res.body.payment.status).toBe('paid');
    expect(res.body.payment.amount).toBe(500);
    expect(res.body.returnedBy.username).toBe('wc_admin');

    const game = await request(app).get(`/api/games/${azul._id}`);
    expect(game.body.status).toBe('maintenance');
  });

  it('admin books ahead for a member with the flat 3h package', async () => {
    const bad = await request(app)
      .post('/api/reservations/admin')
      .set(auth(adminT))
      .send({
        table: table._id,
        players: 2,
        startAt: inHours(3),
        durationHours: 2,
        package: 'flat3h',
        user: memberId,
      });
    expect(bad.status).toBe(400);

    const res = await request(app)
      .post('/api/reservations/admin')
      .set(auth(adminT))
      .send({
        table: table._id,
        players: 2,
        startAt: inHours(3),
        durationHours: 3,
        package: 'flat3h',
        user: memberId,
      });
    expect(res.status).toBe(201);
    expect(res.body.source).toBe('admin');
    expect(res.body.status).toBe('booked');
    expect(res.body.price.total).toBe(2 * 130);

    const mine = await request(app).get('/api/reservations?scope=upcoming').set(auth(memberT));
    expect(mine.body.total).toBe(1);
  });

  it('member returns without paying; admin collects payment later', async () => {
    const open = await request(app)
      .post('/api/reservations/admin')
      .set(auth(adminT))
      .send({ table: table._id, players: 2, durationHours: 1, user: memberId });
    expect(open.status).toBe(201);
    expect(open.body.status).toBe('playing');
    memberWalkIn = open.body;

    const ret = await request(app)
      .patch(`/api/reservations/${memberWalkIn._id}/return`)
      .set(auth(memberT))
      .send({ paymentMethod: 'cash' }); // สมาชิกกดจ่ายเองไม่ได้ → ถูกเมิน
    expect(ret.status).toBe(200);
    expect(ret.body.payment.status).toBe('unpaid');

    const denied = await request(app)
      .patch(`/api/reservations/admin/${memberWalkIn._id}/pay`)
      .set(auth(memberT))
      .send({ method: 'qr' });
    expect(denied.status).toBe(403);

    const pay = await request(app)
      .patch(`/api/reservations/admin/${memberWalkIn._id}/pay`)
      .set(auth(adminT))
      .send({ method: 'qr' });
    expect(pay.status).toBe(200);
    expect(pay.body.payment.status).toBe('paid');
    expect(pay.body.payment.amount).toBe(100);

    const again = await request(app)
      .patch(`/api/reservations/admin/${memberWalkIn._id}/pay`)
      .set(auth(adminT))
      .send({ method: 'qr' });
    expect(again.status).toBe(409);
  });

  it('admin list filters: search, source, payment, range', async () => {
    const byName = await request(app).get('/api/reservations/admin?q=joe').set(auth(adminT));
    expect(byName.body.total).toBe(1);
    expect(byName.body.items[0]._id).toBe(walkIn._id);

    const byPhone = await request(app).get('/api/reservations/admin?q=0812').set(auth(adminT));
    expect(byPhone.body.total).toBe(1);

    const byMember = await request(app)
      .get('/api/reservations/admin?q=wc_member')
      .set(auth(adminT));
    expect(byMember.body.total).toBe(2);

    const walkIns = await request(app)
      .get('/api/reservations/admin?source=walk_in')
      .set(auth(adminT));
    expect(walkIns.body.total).toBe(2);

    const unpaid = await request(app)
      .get('/api/reservations/admin?payment=unpaid')
      .set(auth(adminT));
    expect(unpaid.body.total).toBe(1); // การจองล่วงหน้าของสมาชิก

    const today = new Date(Date.now() + 7 * H).toISOString().slice(0, 10);
    const range = await request(app)
      .get(`/api/reservations/admin?from=${today}&to=${today}`)
      .set(auth(adminT));
    expect(range.body.total).toBeGreaterThanOrEqual(2);
  });

  it('table schedule timeline groups reservations by zone and table', async () => {
    const res = await request(app).get('/api/tables/schedule').set(auth(adminT));
    expect(res.status).toBe(200);
    const main = res.body.zones.find((z) => z.zone === 'Main');
    const w1 = main.tables.find((t) => t.code === 'W-01');
    expect(w1.reservations.length).toBeGreaterThanOrEqual(2);
    expect(w1.reservations.some((r) => r.customer === 'Walk-in Joe' && r.paid)).toBe(true);

    const denied = await request(app).get('/api/tables/schedule').set(auth(memberT));
    expect(denied.status).toBe(403);
  });

  it('revenue stats use the checkout total (incl. overtime)', async () => {
    const res = await request(app).get('/api/stats/overview').set(auth(adminT));
    expect(res.status).toBe(200);
    expect(res.body.revenue).toBeGreaterThanOrEqual(500 + 100);
  });
});
