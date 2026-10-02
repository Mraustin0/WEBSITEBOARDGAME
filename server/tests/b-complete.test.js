// Integration: ตั้งค่าร้าน, เวลาทำการ, no-show, ติดตามการซ่อม, สถิติสมาชิก/เกม, รายงาน, heatmap, export
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
const allDays = (patch) =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '10:00', close: '24:00', ...patch }));

describeIf('store settings, maintenance, reports (integration)', () => {
  let app;
  let adminT;
  let memberT;
  let memberId;
  let t1;
  let t2;
  let catan;

  const auth = (t) => ({ Authorization: `Bearer ${t}` });
  const admin = () => ({ ...auth(adminT) });

  async function register(username) {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username, email: `${username}@bc-test.com`, password: 'secret123' });
    expect(res.status).toBe(201);
    return res.body;
  }

  beforeAll(async () => {
    await connectDb(MONGO);
    app = createApp();
    const db = mongoose.connection;
    await Promise.all(
      ['tables', 'reservations', 'reviews', 'games', 'maintenancetickets', 'settings'].map((c) =>
        db.collection(c).deleteMany({}),
      ),
    );
    await db.collection('users').deleteMany({ email: /@bc-test\.com$/ });

    adminT = (await register('bc_admin')).token;
    const m = await register('bc_member');
    memberT = m.token;
    memberId = m.user.id;
    await User.updateOne({ email: 'bc_admin@bc-test.com' }, { role: 'admin' });

    const mk = (code) =>
      request(app).post('/api/tables').set(admin()).send({ code, zone: 'Main', capacity: 4 });
    t1 = (await mk('T1')).body;
    t2 = (await mk('T2')).body;
    catan = (
      await Game.create({ name: 'Catan', minPlayers: 2, maxPlayers: 4, categories: ['Strategy'] })
    ).toObject();
    catan._id = String(catan._id);
  });

  afterAll(async () => {
    await mongoose.connection.collection('settings').deleteMany({});
    await disconnectDb();
  });

  describe('store settings (หน้า 6)', () => {
    it('is public to read, admin-only to change', async () => {
      const get = await request(app).get('/api/settings');
      expect(get.status).toBe(200);
      expect(get.body.pricing.perPersonHour).toBe(50);
      expect(get.body.operatingHours.days).toHaveLength(7);

      const denied = await request(app)
        .put('/api/settings')
        .set(auth(memberT))
        .send({ pricing: { perPersonHour: 1 } });
      expect(denied.status).toBe(403);
    });

    it('price changes apply to new quotes and to /rules', async () => {
      const put = await request(app)
        .put('/api/settings')
        .set(admin())
        .send({ pricing: { perPersonHour: 60 }, store: { name: 'BG Cafe' } });
      expect(put.status).toBe(200);
      expect(put.body.pricing.perPersonHour).toBe(60);
      expect(put.body.pricing.flat3hPerPerson).toBe(130); // ไม่ถูกทับ
      expect(put.body.booking.maxAdvanceDays).toBe(3);

      const rules = await request(app).get('/api/reservations/rules');
      expect(rules.body.PRICE_PER_PERSON_HOUR).toBe(60);

      const quote = await request(app)
        .post('/api/reservations/quote')
        .set(auth(memberT))
        .send({ table: t1._id, players: 2, startAt: inHours(2), durationHours: 1 });
      expect(quote.status).toBe(200);
      expect(quote.body.price.total).toBe(120);
    });

    it('validates settings input', async () => {
      const badHours = await request(app)
        .put('/api/settings')
        .set(admin())
        .send({ booking: { minHours: 5, maxHours: 2 } });
      expect(badHours.status).toBe(400);

      const badTime = await request(app)
        .put('/api/settings')
        .set(admin())
        .send({ operatingHours: { days: allDays({ open: '9am' }) } });
      expect(badTime.status).toBe(400);
    });
  });

  describe('operating hours + no-show', () => {
    let noShow;

    it('members cannot book while the store is closed; admin still can', async () => {
      const close = await request(app)
        .put('/api/settings')
        .set(admin())
        .send({ operatingHours: { enforce: true, days: allDays({ closed: true }) } });
      expect(close.status).toBe(200);

      const member = await request(app)
        .post('/api/reservations')
        .set(auth(memberT))
        .send({ table: t1._id, players: 2, startAt: inHours(2), durationHours: 1 });
      expect(member.status).toBe(400);
      expect(member.body.error).toMatch(/closed/);

      const avail = await request(app)
        .get('/api/reservations/availability')
        .query({ startAt: inHours(2), durationHours: 1 });
      expect(avail.body.bookable).toBe(false);

      const staff = await request(app)
        .post('/api/reservations/admin')
        .set(admin())
        .send({ table: t1._id, game: catan._id, players: 2, durationHours: 1, user: memberId });
      expect(staff.status).toBe(201);
      expect(staff.body.status).toBe('playing');
      noShow = staff.body;

      await request(app)
        .put('/api/settings')
        .set(admin())
        .send({ operatingHours: { enforce: false, days: allDays({}) } });
    });

    it('admin marks no-show → table and game are released', async () => {
      const res = await request(app)
        .patch(`/api/reservations/admin/${noShow._id}/no-show`)
        .set(admin());
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('no_show');

      const game = await Game.findById(catan._id);
      expect(game.status).toBe('available');

      const again = await request(app)
        .patch(`/api/reservations/admin/${noShow._id}/no-show`)
        .set(admin());
      expect(again.status).toBe(409);

      const denied = await request(app)
        .patch(`/api/reservations/admin/${noShow._id}/no-show`)
        .set(auth(memberT));
      expect(denied.status).toBe(403);

      const past = await request(app).get('/api/reservations?scope=past').set(auth(memberT));
      expect(past.body.items.map((r) => r.status)).toContain('no_show');
    });
  });

  describe('maintenance tracking (หน้า 8)', () => {
    let tableTicket;
    let gameTicket;

    it('is admin only and validates the item', async () => {
      const denied = await request(app).get('/api/maintenance').set(auth(memberT));
      expect(denied.status).toBe(403);

      const bad = await request(app)
        .post('/api/maintenance')
        .set(admin())
        .send({ itemType: 'game', title: 'x' });
      expect(bad.status).toBe(400);
    });

    it('reporting a table closes it until resolved', async () => {
      const res = await request(app)
        .post('/api/maintenance')
        .set(admin())
        .send({ itemType: 'table', table: t2._id, title: 'Wobbly leg', priority: 'high' });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('pending');
      tableTicket = res.body;

      const floor = await request(app).get('/api/tables/floor');
      expect(floor.body.tables.find((t) => t.code === 'T2').state).toBe('closed');

      const progress = await request(app)
        .patch(`/api/maintenance/${tableTicket._id}`)
        .set(admin())
        .send({ status: 'in_progress' });
      expect(progress.body.startedAt).toBeTruthy();

      const summary = await request(app).get('/api/maintenance/summary').set(admin());
      expect(summary.body.in_progress).toBe(1);

      const done = await request(app)
        .patch(`/api/maintenance/${tableTicket._id}`)
        .set(admin())
        .send({ status: 'resolved', cost: 200, resolution: 'replaced leg' });
      expect(done.status).toBe(200);
      expect(done.body.resolvedBy.username).toBe('bc_admin');

      const table = await request(app).get(`/api/tables/${t2._id}`);
      expect(table.body.status).toBe('active');
    });

    it('reporting a game blocks bookings; deleting the ticket releases it', async () => {
      const res = await request(app)
        .post('/api/maintenance')
        .set(admin())
        .send({ itemType: 'game', game: catan._id, title: 'Missing cards' });
      expect(res.status).toBe(201);
      gameTicket = res.body;
      expect((await Game.findById(catan._id)).status).toBe('maintenance');

      const book = await request(app)
        .post('/api/reservations')
        .set(auth(memberT))
        .send({
          table: t1._id,
          game: catan._id,
          players: 2,
          startAt: inHours(3),
          durationHours: 1,
        });
      expect(book.status).toBe(409);

      const del = await request(app).delete(`/api/maintenance/${gameTicket._id}`).set(admin());
      expect(del.status).toBe(200);
      expect((await Game.findById(catan._id)).status).toBe('available');
    });

    it('returning a damaged game opens a ticket automatically', async () => {
      const open = await request(app)
        .post('/api/reservations/admin')
        .set(admin())
        .send({
          table: t1._id,
          game: catan._id,
          players: 3,
          durationHours: 1,
          customer: { name: 'Walk-in Ann' },
        });
      expect(open.status).toBe(201);

      await request(app)
        .patch(`/api/reservations/${open.body._id}/return`)
        .set(admin())
        .send({ condition: 'damaged', damageNote: 'torn board', paymentMethod: 'card' });

      const list = await request(app)
        .get(`/api/maintenance?game=${catan._id}&status=pending`)
        .set(admin());
      expect(list.body.total).toBe(1);
      expect(list.body.items[0].title).toMatch(/damaged/);
      expect(list.body.items[0].description).toBe('torn board');

      await request(app)
        .patch(`/api/maintenance/${list.body.items[0]._id}`)
        .set(admin())
        .send({ status: 'resolved' });
      expect((await Game.findById(catan._id)).status).toBe('available');

      const history = await request(app).get('/api/maintenance?status=resolved').set(admin());
      expect(history.body.total).toBe(2);
    });
  });

  describe('member & game details (หน้า 7, 3)', () => {
    it('member summary counts visits, no-shows and favourites', async () => {
      const open = await request(app)
        .post('/api/reservations/admin')
        .set(admin())
        .send({ table: t2._id, players: 2, durationHours: 1, user: memberId });
      await request(app)
        .patch(`/api/reservations/${open.body._id}/return`)
        .set(admin())
        .send({ paymentMethod: 'cash' });

      await request(app)
        .post('/api/reviews')
        .set(auth(memberT))
        .send({ game: catan._id, rating: 8 });

      const res = await request(app).get(`/api/stats/members/${memberId}`).set(admin());
      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('bc_member');
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.visits).toBe(1);
      expect(res.body.reservations.no_show).toBe(1);
      expect(res.body.totalSpent).toBe(120);
      expect(res.body.favoriteTable.code).toBe('T2');

      const me = await request(app).get('/api/stats/me').set(auth(memberT));
      expect(me.body.reservations.no_show).toBe(1);

      const history = await request(app)
        .get(`/api/reservations/admin?user=${memberId}`)
        .set(admin());
      expect(history.body.total).toBe(2);

      const denied = await request(app).get(`/api/stats/members/${memberId}`).set(auth(memberT));
      expect(denied.status).toBe(403);
    });

    it('game stats show sessions, rating, damage and maintenance history', async () => {
      const res = await request(app).get(`/api/stats/games/${catan._id}`).set(admin());
      expect(res.status).toBe(200);
      expect(res.body.sessions).toBe(1); // no-show ไม่นับ
      expect(res.body.rating.average).toBe(8);
      expect(res.body.damageReports).toBe(1);
      expect(res.body.maintenance.length).toBe(1); // อีกใบถูกลบไปแล้ว
      expect(res.body.recentSessions.length).toBe(2);
    });
  });

  describe('reports (หน้า 12-13)', () => {
    it('overview includes utilization, no-shows, walk-ins and open maintenance', async () => {
      const res = await request(app).get('/api/stats/overview').set(admin());
      expect(res.status).toBe(200);
      expect(res.body.reservations.no_show).toBe(1);
      expect(res.body.walkIns).toBeGreaterThanOrEqual(2);
      expect(res.body.utilizationPct).toBeGreaterThan(0);
      expect(res.body.openMaintenance).toBe(0);
      expect(res.body.unpaid).toBe(0);
    });

    it('report returns KPIs, comparison, categories and top games', async () => {
      const res = await request(app).get('/api/stats/report').set(admin());
      expect(res.status).toBe(200);
      expect(res.body.kpis.sessions).toBe(2);
      expect(res.body.kpis.revenue).toBeGreaterThan(0);
      expect(res.body.revenueTrend).toHaveLength(7);
      expect(res.body.categories.find((c) => c.category === 'Strategy').sessions).toBe(1);
      expect(res.body.topGames[0].game.name).toBe('Catan');
      expect(res.body.changePct).toHaveProperty('revenue');
    });

    it('heatmap is 7 × 24', async () => {
      const res = await request(app).get('/api/stats/heatmap').set(admin());
      expect(res.body.matrix).toHaveLength(7);
      expect(res.body.matrix[0]).toHaveLength(24);
      const sum = res.body.matrix.flat().reduce((a, b) => a + b, 0);
      expect(sum).toBe(2);
    });

    it('exports reservations as CSV', async () => {
      const res = await request(app).get('/api/stats/export.csv').set(admin());
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/reservations_.*\.csv/);
      expect(res.text).toContain('date,start,end,table');
      expect(res.text).toContain('Walk-in Ann');
      expect(res.text).toContain('no_show');
    });
  });
});
