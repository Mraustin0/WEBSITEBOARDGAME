// Integration: ระหว่างเล่น — ขอต่อเวลา + เรียกพนักงาน (GM) ตาม FE ฝั่ง user ชุดใหม่ (FE_new)
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

describeIf('in-session: extend time + call staff (integration)', () => {
  let app;
  let adminT;
  let memberT;
  let otherT;
  let session;
  let nextBooking;
  let tutorial;
  let issue;

  const auth = (t) => ({ Authorization: `Bearer ${t}` });

  async function register(username) {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username, email: `${username}@bs-test.com`, password: 'secret123' });
    expect(res.status).toBe(201);
    return res.body;
  }

  beforeAll(async () => {
    await connectDb(MONGO);
    app = createApp();
    const db = mongoose.connection;
    await Promise.all(
      ['tables', 'reservations', 'games', 'settings', 'assistrequests'].map((c) =>
        db.collection(c).deleteMany({}),
      ),
    );
    await db.collection('users').deleteMany({ email: /@bs-test\.com$/ });

    adminT = (await register('bs_admin')).token;
    const member = await register('bs_member');
    const other = await register('bs_other');
    memberT = member.token;
    otherT = other.token;
    await User.updateOne({ email: 'bs_admin@bs-test.com' }, { role: 'admin' });

    const table = (
      await request(app)
        .post('/api/tables')
        .set(auth(adminT))
        .send({ code: 'S1', zone: 'Main', capacity: 4 })
    ).body;
    const catan = await Game.create({ name: 'Catan', minPlayers: 2, maxPlayers: 4 });

    // สมาชิกมาถึงร้าน → admin เปิดโต๊ะให้ เล่นทันที 1 ชม.
    session = (
      await request(app)
        .post('/api/reservations/admin')
        .set(auth(adminT))
        .send({
          table: table._id,
          game: String(catan._id),
          players: 2,
          durationHours: 1,
          user: member.user.id,
        })
    ).body;
    expect(session.status).toBe('playing');
    expect(session.price.total).toBe(100);

    // มีคนจองโต๊ะเดียวกันต่อจากนั้น (เริ่มอีก 2.5 ชม.)
    nextBooking = (
      await request(app)
        .post('/api/reservations/admin')
        .set(auth(adminT))
        .send({
          table: table._id,
          players: 2,
          startAt: inHours(2.5),
          durationHours: 1,
          user: other.user.id,
        })
    ).body;
    expect(nextBooking.status).toBe('booked');
  });

  afterAll(async () => {
    await mongoose.connection.collection('assistrequests').deleteMany({});
    await disconnectDb();
  });

  describe('extend time', () => {
    it('member extends 1 hour → price and end time updated', async () => {
      const res = await request(app)
        .patch(`/api/reservations/${session._id}/extend`)
        .set(auth(memberT))
        .send({ hours: 1 });
      expect(res.status).toBe(200);
      expect(res.body.durationHours).toBe(2);
      expect(new Date(res.body.endAt) - new Date(session.endAt)).toBe(H);
      expect(res.body.price.total).toBe(200);
      expect(res.body.extensions).toHaveLength(1);
      expect(res.body.extensions[0].charge).toBe(100);
      session = res.body;
    });

    it('cannot extend into the next booking, beyond max hours, or someone else’s session', async () => {
      const clash = await request(app)
        .patch(`/api/reservations/${session._id}/extend`)
        .set(auth(memberT))
        .send({ hours: 1 });
      expect(clash.status).toBe(409);

      const tooLong = await request(app)
        .patch(`/api/reservations/${session._id}/extend`)
        .set(auth(memberT))
        .send({ hours: 5 });
      expect(tooLong.status).toBe(400);

      const badStep = await request(app)
        .patch(`/api/reservations/${session._id}/extend`)
        .set(auth(memberT))
        .send({ hours: 0.25 });
      expect(badStep.status).toBe(400);

      const notMine = await request(app)
        .patch(`/api/reservations/${session._id}/extend`)
        .set(auth(otherT))
        .send({ hours: 0.5 });
      expect(notMine.status).toBe(404);
    });

    it('checkout bill uses the extended duration (no overtime)', async () => {
      const res = await request(app)
        .get(`/api/reservations/${session._id}/checkout`)
        .set(auth(memberT));
      expect(res.status).toBe(200);
      expect(res.body.bill.bookedHours).toBe(2);
      expect(res.body.bill.overtimeCharge).toBe(0);
      expect(res.body.bill.total).toBe(200);
    });
  });

  describe('call staff (GM)', () => {
    it('only the owner of a playing session can call staff', async () => {
      const notMine = await request(app)
        .post('/api/assist')
        .set(auth(otherT))
        .send({ reservation: session._id, topic: 'tutorial' });
      expect(notMine.status).toBe(404);

      const notPlaying = await request(app)
        .post('/api/assist')
        .set(auth(otherT))
        .send({ reservation: nextBooking._id, topic: 'tutorial' });
      expect(notPlaying.status).toBe(409);

      const badTopic = await request(app)
        .post('/api/assist')
        .set(auth(memberT))
        .send({ reservation: session._id, topic: 'pizza' });
      expect(badTopic.status).toBe(400);
    });

    it('member calls staff; duplicate topic is blocked while open', async () => {
      const res = await request(app)
        .post('/api/assist')
        .set(auth(memberT))
        .send({ reservation: session._id, topic: 'tutorial', note: 'สอนกติกาหน่อย' });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('open');
      expect(res.body.table.code).toBe('S1');
      tutorial = res.body;

      const dup = await request(app)
        .post('/api/assist')
        .set(auth(memberT))
        .send({ reservation: session._id, topic: 'tutorial' });
      expect(dup.status).toBe(409);

      const other = await request(app)
        .post('/api/assist')
        .set(auth(memberT))
        .send({ reservation: session._id, topic: 'game_issue', note: 'การ์ดหาย' });
      expect(other.status).toBe(201);
      issue = other.body;

      const mine = await request(app)
        .get('/api/assist/my')
        .query({ reservation: session._id })
        .set(auth(memberT));
      expect(mine.status).toBe(200);
      expect(mine.body).toHaveLength(2);
    });

    it('admin sees the queue (oldest first) and handles it', async () => {
      const denied = await request(app).get('/api/assist').set(auth(memberT));
      expect(denied.status).toBe(403);

      const queue = await request(app).get('/api/assist').set(auth(adminT));
      expect(queue.status).toBe(200);
      expect(queue.body.total).toBe(2);
      expect(queue.body.counts).toEqual({ open: 2, acknowledged: 0 });
      expect(queue.body.items[0]._id).toBe(tutorial._id);

      const ack = await request(app)
        .patch(`/api/assist/${tutorial._id}`)
        .set(auth(adminT))
        .send({ status: 'acknowledged' });
      expect(ack.status).toBe(200);
      expect(ack.body.acknowledgedBy.username).toBe('bs_admin');

      const ackAgain = await request(app)
        .patch(`/api/assist/${tutorial._id}`)
        .set(auth(adminT))
        .send({ status: 'acknowledged' });
      expect(ackAgain.status).toBe(409);

      const done = await request(app)
        .patch(`/api/assist/${tutorial._id}`)
        .set(auth(adminT))
        .send({ status: 'resolved', resolution: 'สอนแล้ว' });
      expect(done.status).toBe(200);
      expect(done.body.status).toBe('resolved');
      expect(done.body.resolvedBy.username).toBe('bs_admin');
    });

    it('member cancels an open request', async () => {
      const res = await request(app).patch(`/api/assist/${issue._id}/cancel`).set(auth(memberT));
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');

      const again = await request(app).patch(`/api/assist/${issue._id}/cancel`).set(auth(memberT));
      expect(again.status).toBe(409);

      const queue = await request(app).get('/api/assist').set(auth(adminT));
      expect(queue.body.total).toBe(0);
      const history = await request(app)
        .get('/api/assist')
        .query({ status: 'resolved' })
        .set(auth(adminT));
      expect(history.body.total).toBe(1);
    });

    it('after returning the game, extending or calling staff is refused', async () => {
      const ret = await request(app)
        .patch(`/api/reservations/${session._id}/return`)
        .set(auth(memberT));
      expect(ret.status).toBe(200);
      expect(ret.body.checkout.total).toBe(200);

      const ext = await request(app)
        .patch(`/api/reservations/${session._id}/extend`)
        .set(auth(memberT))
        .send({ hours: 0.5 });
      expect(ext.status).toBe(409);

      const call = await request(app)
        .post('/api/assist')
        .set(auth(memberT))
        .send({ reservation: session._id, topic: 'other' });
      expect(call.status).toBe(409);
    });
  });
});
