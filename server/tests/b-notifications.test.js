// Integration: ศูนย์การแจ้งเตือน (หน้า 10 ฝั่ง admin)
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { User } from '../src/models/user.model.js';
import { Game } from '../src/models/game.model.js';
import { Reservation } from '../src/models/reservation.model.js';

const MONGO = process.env.MONGODB_URI;
const describeIf = MONGO ? describe : describe.skip;

const H = 60 * 60 * 1000;
const MIN = 60 * 1000;
const inHours = (h) => new Date(Date.now() + h * H).toISOString();

describeIf('notification center (integration)', () => {
  let app;
  let adminT;
  let admin2T;
  let memberT;
  let memberId;
  let table;
  let table2;
  let catan;
  let session;

  const auth = (t) => ({ Authorization: `Bearer ${t}` });
  const list = (query = {}, token = adminT) =>
    request(app).get('/api/notifications').query(query).set(auth(token));
  const ofType = (body, type) => body.items.filter((n) => n.type === type);

  async function register(username) {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username, email: `${username}@bn-test.com`, password: 'secret123' });
    expect(res.status).toBe(201);
    return res.body;
  }

  beforeAll(async () => {
    await connectDb(MONGO);
    app = createApp();
    const db = mongoose.connection;
    await Promise.all(
      [
        'tables',
        'reservations',
        'games',
        'settings',
        'assistrequests',
        'maintenancetickets',
        'notifications',
        'notificationprefs',
      ].map((c) => db.collection(c).deleteMany({})),
    );
    await db.collection('users').deleteMany({ email: /@bn-test\.com$/ });

    adminT = (await register('bn_admin')).token;
    admin2T = (await register('bn_admin2')).token;
    const m = await register('bn_member');
    memberT = m.token;
    memberId = m.user.id;
    await User.updateMany({ email: /^bn_admin/ }, { role: 'admin' });

    const mk = (code) =>
      request(app).post('/api/tables').set(auth(adminT)).send({ code, zone: 'Main', capacity: 4 });
    table = (await mk('N1')).body;
    table2 = (await mk('N2')).body;
    catan = String((await Game.create({ name: 'Catan', minPlayers: 2, maxPlayers: 4 }))._id);
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('is admin only', async () => {
    expect((await list({}, memberT)).status).toBe(403);
    expect((await request(app).get('/api/notifications/unread-count')).status).toBe(401);
  });

  it('member booking and cancelling notify staff', async () => {
    const booked = await request(app)
      .post('/api/reservations')
      .set(auth(memberT))
      .send({ table: table._id, game: catan, players: 3, startAt: inHours(5), durationHours: 1 });
    expect(booked.status).toBe(201);

    let res = await list();
    expect(res.status).toBe(200);
    const [n] = ofType(res.body, 'booking_new');
    expect(n.message).toMatch(/bn_member จองโต๊ะ N1/);
    expect(n.read).toBe(false);
    expect(n.dayGroup).toBe('today');
    expect(n.actions[0].path).toBe(`/api/reservations/${booked.body._id}`);

    await request(app)
      .patch(`/api/reservations/${booked.body._id}/cancel`)
      .set(auth(memberT))
      .send({ reason: 'ติดธุระ' });
    res = await list();
    expect(ofType(res.body, 'booking_cancelled')[0].message).toMatch(/ติดธุระ/);
    expect(res.body.unread).toBe(2);
  });

  it('time alerts: ending soon once, then overdue (important); extend resolves them', async () => {
    session = (
      await request(app)
        .post('/api/reservations/admin')
        .set(auth(adminT))
        .send({ table: table2._id, players: 2, durationHours: 1, user: memberId })
    ).body;
    expect(session.status).toBe('playing');

    await Reservation.updateOne({ _id: session._id }, { endAt: new Date(Date.now() + 5 * MIN) });
    await list();
    let res = await list(); // เรียกซ้ำต้องไม่แจ้งซ้ำ
    const ending = ofType(res.body, 'time_ending');
    expect(ending).toHaveLength(1);
    expect(ending[0].title).toMatch(/N2 ใกล้หมดเวลา/);
    expect(ending[0].actions.map((a) => a.key)).toEqual(['extend', 'checkout']);

    await Reservation.updateOne({ _id: session._id }, { endAt: new Date(Date.now() - 5 * MIN) });
    res = await list({ filter: 'important' });
    const overdue = ofType(res.body, 'time_overdue');
    expect(overdue).toHaveLength(1);
    expect(overdue[0].important).toBe(true);
    expect(overdue[0].done).toBe(false);

    const ext = await request(app)
      .patch(`/api/reservations/${session._id}/extend`)
      .set(auth(adminT))
      .send({ hours: 1 });
    expect(ext.status).toBe(200);
    res = await list();
    expect(ofType(res.body, 'time_overdue')[0].done).toBe(true);
    expect(ofType(res.body, 'time_ending')[0].done).toBe(true);
  });

  it('assist call is important; acknowledging it resolves the notification', async () => {
    const call = await request(app)
      .post('/api/assist')
      .set(auth(memberT))
      .send({ reservation: session._id, topic: 'game_issue', note: 'การ์ดหาย' });
    expect(call.status).toBe(201);

    let res = await list({ filter: 'important' });
    const [n] = ofType(res.body, 'assist');
    expect(n.title).toMatch(/N2 เรียกพนักงาน/);
    expect(n.message).toMatch(/การ์ดหาย/);
    expect(n.actions[0]).toMatchObject({ key: 'acknowledge', body: { status: 'acknowledged' } });

    await request(app)
      .patch(`/api/assist/${call.body._id}`)
      .set(auth(adminT))
      .send({ status: 'acknowledged' });
    res = await list();
    expect(ofType(res.body, 'assist')[0].done).toBe(true);
  });

  it('maintenance: new ticket and repair done', async () => {
    const t = await request(app)
      .post('/api/maintenance')
      .set(auth(adminT))
      .send({ itemType: 'game', game: catan, title: 'Missing cards', priority: 'high' });
    expect(t.status).toBe(201);
    let res = await list();
    const [created] = ofType(res.body, 'maintenance_new');
    expect(created.important).toBe(true);
    expect(created.message).toMatch(/Catan: Missing cards/);

    await request(app)
      .patch(`/api/maintenance/${t.body._id}`)
      .set(auth(adminT))
      .send({ status: 'resolved', resolution: 'replaced' });
    res = await list();
    expect(ofType(res.body, 'maintenance_done')[0].message).toMatch(/replaced/);
    expect(ofType(res.body, 'maintenance_new')[0].done).toBe(true);
  });

  it('read state is per admin; mark one / mark all read', async () => {
    let res = await list({ filter: 'unread' });
    const before = res.body.unread;
    expect(before).toBeGreaterThan(2);

    const first = res.body.items[0];
    expect(
      (await request(app).patch(`/api/notifications/${first._id}/read`).set(auth(adminT))).status,
    ).toBe(200);
    res = await list({ filter: 'unread' });
    expect(res.body.unread).toBe(before - 1);
    expect(res.body.items.find((n) => n._id === first._id)).toBeUndefined();

    // admin อีกคนยังไม่ได้อ่าน
    const other = await request(app).get('/api/notifications/unread-count').set(auth(admin2T));
    expect(other.body.unread).toBe(before);

    const all = await request(app).patch('/api/notifications/read-all').set(auth(adminT));
    expect(all.status).toBe(200);
    const count = await request(app).get('/api/notifications/unread-count').set(auth(adminT));
    expect(count.body).toEqual({ unread: 0, important: 0 });
  });

  it('preferences mute notification types', async () => {
    const put = await request(app)
      .put('/api/notifications/preferences')
      .set(auth(admin2T))
      .send({ muted: ['booking_new', 'booking_cancelled'] });
    expect(put.status).toBe(200);
    expect(put.body.muted).toEqual(['booking_new', 'booking_cancelled']);

    const res = await list({}, admin2T);
    expect(ofType(res.body, 'booking_new')).toHaveLength(0);
    expect(ofType(res.body, 'assist')).toHaveLength(1);

    const bad = await request(app)
      .put('/api/notifications/preferences')
      .set(auth(admin2T))
      .send({ muted: ['pizza'] });
    expect(bad.status).toBe(400);
  });
});
