// Integration: ระบบหลังร้านที่ขยายตามดีไซน์ Admin
// สิทธิ์ละเอียด (roles), ผู้ใช้, คลังเกมรายกล่อง, dashboard/alerts, ยืนยันการจอง, กะพนักงาน,
// ราคา peak, audit trail + hash chain
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { User } from '../src/models/user.model.js';
import { Reservation } from '../src/models/reservation.model.js';
import { AuditLog } from '../src/models/audit.model.js';
import { ensureSystemRoles } from '../src/modules/roles/roles.service.js';
import { flushAudit, resetAuditHead } from '../src/lib/audit.js';
import { toLocalDateString } from '../src/lib/time.js';

const MONGO = process.env.MONGODB_URI;
const describeIf = MONGO ? describe : describe.skip;

const H = 60 * 60 * 1000;
const inHours = (h) => new Date(Date.now() + h * H).toISOString();

describeIf('admin extensions (integration)', () => {
  let app;
  const t = {}; // tokens
  const u = {}; // users
  let tables;
  let catan;

  const auth = (who) => ({ Authorization: `Bearer ${t[who]}` });
  const get = (who, path) => request(app).get(path).set(auth(who));
  const send = (who, method, path, body = {}) =>
    request(app)[method](path).set(auth(who)).send(body);

  async function register(name, role = 'user') {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: name, email: `${name}@ax-test.com`, password: 'secret123' });
    expect(res.status).toBe(201);
    if (role !== 'user') await User.updateOne({ _id: res.body.user.id }, { role });
    t[name] = res.body.token;
    u[name] = res.body.user;
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
        'roles',
        'auditlogs',
        'shifts',
        'maintenancetickets',
        'notifications',
        'assistrequests',
      ].map((c) => db.collection(c).deleteMany({})),
    );
    resetAuditHead();
    await db.collection('users').deleteMany({ email: /@ax-test\.com$/ });
    await ensureSystemRoles();

    await register('ax_admin', 'admin');
    await register('ax_staff', 'staff');
    await register('ax_manager', 'manager');
    await register('ax_member');

    tables = [];
    for (const code of ['X1', 'X2', 'X3']) {
      tables.push(
        (await send('ax_admin', 'post', '/api/tables', { code, zone: 'Main', capacity: 4 })).body,
      );
    }
    const g = await send('ax_admin', 'post', '/api/games', {
      name: 'Catan',
      minPlayers: 2,
      maxPlayers: 4,
      copies: 3,
      shelf: 'A-1',
    });
    expect(g.status).toBe(201);
    catan = g.body;
  });

  afterAll(async () => {
    await disconnectDb();
  });

  describe('roles & permissions (หน้า 16)', () => {
    it('system and starter roles exist with live member counts', async () => {
      const res = await get('ax_admin', '/api/roles');
      expect(res.status).toBe(200);
      const slugs = res.body.items.map((r) => r.slug);
      expect(slugs).toEqual(expect.arrayContaining(['admin', 'user', 'staff', 'manager']));
      expect(res.body.items.find((r) => r.slug === 'staff').memberCount).toBe(1);
      expect(res.body.catalog.map((c) => c.key)).toContain('audit');
    });

    it('staff (Game Master) can use the floor but not users / reports / settings', async () => {
      expect((await get('ax_staff', '/api/reservations/admin')).status).toBe(200);
      expect((await get('ax_staff', '/api/notifications')).status).toBe(200);
      expect((await get('ax_staff', '/api/admin/users')).status).toBe(403);
      expect((await get('ax_staff', '/api/stats/overview')).status).toBe(403);
      expect((await get('ax_staff', '/api/audit')).status).toBe(403);
      expect(
        (await send('ax_staff', 'put', '/api/settings', { store: { name: 'x' } })).status,
      ).toBe(403);
      expect((await get('ax_member', '/api/reservations/admin')).status).toBe(403);
    });

    it('staff runs a walk-in end to end (open table, check out, take payment)', async () => {
      const open = await send('ax_staff', 'post', '/api/reservations/admin', {
        table: tables[0]._id,
        players: 2,
        durationHours: 1,
        customer: { name: 'Walk-in' },
      });
      expect(open.status).toBe(201);
      const ret = await send('ax_staff', 'patch', `/api/reservations/${open.body._id}/return`, {
        paymentMethod: 'cash',
      });
      expect(ret.status).toBe(200);
      expect(ret.body.payment.status).toBe('paid');
      expect(ret.body.checkout.inspectedBy).toBeTruthy();
    });

    it('changing the permission matrix takes effect immediately', async () => {
      const roles = (await get('ax_admin', '/api/roles')).body.items;
      const staff = roles.find((r) => r.slug === 'staff');
      const res = await send('ax_admin', 'put', `/api/roles/${staff._id}/permissions`, {
        permissions: [...staff.permissions, { key: 'reports', view: true }],
      });
      expect(res.status).toBe(200);
      expect((await get('ax_staff', '/api/stats/overview')).status).toBe(200);
    });

    it('roles cannot be misassigned and the last admin is protected', async () => {
      const ghost = await send('ax_admin', 'put', `/api/admin/users/${u.ax_member.id}/role`, {
        role: 'ghost',
      });
      expect(ghost.status).toBe(400);

      // admin ของเทสไฟล์อื่นในฐานเดียวกัน → พักไว้ชั่วคราว ให้ ax_admin เป็น admin คนสุดท้าย
      const others = await User.find({
        role: 'admin',
        status: 'active',
        _id: { $ne: u.ax_admin.id },
      }).distinct('_id');
      await User.updateMany({ _id: { $in: others } }, { status: 'suspended' });

      // manager (มีสิทธิ์ users) ลด admin คนสุดท้ายไม่ได้
      const demote = await send('ax_manager', 'put', `/api/admin/users/${u.ax_admin.id}/role`, {
        role: 'user',
      });
      expect(demote.status).toBe(400);
      expect(demote.body.error).toMatch(/last active admin/);
      const suspend = await send(
        'ax_manager',
        'patch',
        `/api/admin/users/${u.ax_admin.id}/suspend`,
      );
      expect(suspend.status).toBe(400);
      await User.updateMany({ _id: { $in: others } }, { status: 'active' });
    });

    it('renaming a role slug moves its members along', async () => {
      const created = await send('ax_admin', 'post', '/api/roles', {
        name: 'Cashier',
        slug: 'cashier',
        permissions: [{ key: 'checkout', view: true, edit: true }],
      });
      expect(created.status).toBe(201);
      await send('ax_admin', 'post', `/api/roles/${created.body._id}/members`, {
        userIds: [u.ax_member.id],
      });
      const renamed = await send('ax_admin', 'put', `/api/roles/${created.body._id}`, {
        slug: 'cashier2',
      });
      expect(renamed.status).toBe(200);
      expect((await User.findById(u.ax_member.id)).role).toBe('cashier2');
      // คืนเป็นสมาชิก
      await send('ax_admin', 'put', `/api/admin/users/${u.ax_member.id}/role`, { role: 'user' });
    });
  });

  describe('users (หน้า 5, 11)', () => {
    it('list shows real play / no-show counts and suspend candidates', async () => {
      await send('ax_admin', 'put', '/api/settings', { noShow: { suspendAfter: 1 } });
      const base = { table: tables[1]._id, players: 2, durationHours: 1, price: { total: 100 } };
      await Reservation.create([
        {
          ...base,
          user: u.ax_member.id,
          startAt: new Date(Date.now() - 50 * H),
          endAt: new Date(Date.now() - 49 * H),
          status: 'completed',
        },
        {
          ...base,
          user: u.ax_member.id,
          startAt: new Date(Date.now() - 30 * H),
          endAt: new Date(Date.now() - 29 * H),
          status: 'no_show',
        },
      ]);
      const res = await get('ax_admin', '/api/admin/users?q=ax_member');
      const m = res.body.items[0];
      expect(m.playCount).toBe(1);
      expect(m.noShowCount).toBe(1);
      expect(m.shouldSuspend).toBe(true);

      const alerts = await get('ax_admin', '/api/stats/alerts');
      expect(alerts.body.items.map((a) => a.type)).toContain('suspend_candidate');
      await send('ax_admin', 'put', '/api/settings', { noShow: { suspendAfter: 3 } });
    });

    it('pending accounts need approval; suspended accounts are locked out', async () => {
      const created = await send('ax_admin', 'post', '/api/admin/users', {
        username: 'ax_pending',
        email: 'ax_pending@ax-test.com',
        password: 'secret123',
        status: 'pending',
      });
      expect(created.status).toBe(201);
      const login = () =>
        request(app)
          .post('/api/auth/login')
          .send({ email: 'ax_pending@ax-test.com', password: 'secret123' });
      expect((await login()).status).toBe(403);
      expect(
        (await send('ax_admin', 'patch', `/api/admin/users/${created.body.id}/approve`)).status,
      ).toBe(200);
      expect(
        (await send('ax_admin', 'patch', `/api/admin/users/${created.body.id}/approve`)).status,
      ).toBe(409);
      const ok = await login();
      expect(ok.status).toBe(200);

      await send('ax_admin', 'patch', `/api/admin/users/${created.body.id}/suspend`, {
        reason: 'spam',
      });
      const me = await request(app)
        .get('/api/auth/me')
        .set({ Authorization: `Bearer ${ok.body.token}` });
      expect(me.status).toBe(403);
    });

    it('members with active bookings cannot be deleted', async () => {
      const booked = await send('ax_member', 'post', '/api/reservations', {
        table: tables[2]._id,
        players: 2,
        startAt: inHours(30),
        durationHours: 1,
      });
      expect(booked.status).toBe(201);
      const del = await send('ax_admin', 'delete', `/api/admin/users/${u.ax_member.id}`);
      expect(del.status).toBe(409);
    });

    it('profile can be edited via PUT /api/auth/me', async () => {
      const res = await send('ax_member', 'put', '/api/auth/me', {
        displayName: 'Member X',
        phone: '0812345678',
      });
      expect(res.status).toBe(200);
      expect(res.body.displayName).toBe('Member X');
      expect(res.body.phone).toBe('0812345678');
    });
  });

  describe('inventory by copies (หน้า 2–3)', () => {
    it('counts copies on the shelf, in play and in repair', async () => {
      expect(
        (await send('ax_admin', 'post', '/api/games', { name: 'Bad', copies: 0 })).status,
      ).toBe(400);

      const play = await send('ax_admin', 'post', '/api/reservations/admin', {
        table: tables[1]._id,
        game: catan._id,
        players: 2,
        durationHours: 1,
        customer: { name: 'Walk-in 2' },
      });
      expect(play.body.status).toBe('playing');
      await send('ax_admin', 'post', '/api/maintenance', {
        itemType: 'game',
        game: catan._id,
        title: 'Torn box',
        copies: 1,
      });

      const stats = await get('ax_admin', '/api/games/stats');
      expect(stats.body).toMatchObject({ totalCopies: 3, inVault: 1, inPlay: 1, maintenance: 1 });
      const detail = await get('ax_admin', `/api/games/${catan._id}`);
      expect(detail.body).toMatchObject({ copiesInVault: 1, copiesInPlay: 1, copiesInRepair: 1 });
      const list = await get('ax_admin', '/api/games?shelf=A-1');
      expect(list.body.items[0].copiesInVault).toBe(1);
      expect(list.body.counts.availableCopies).toBe(1);
    });

    it('changing copies recomputes the game status', async () => {
      const one = await send('ax_admin', 'patch', `/api/games/${catan._id}/copies`, { copies: 1 });
      expect(one.status).toBe(200);
      expect(one.body.status).toBe('maintenance'); // 1 กล่อง ซ่อมอยู่ 1
      const three = await send('ax_admin', 'patch', `/api/games/${catan._id}/copies`, {
        copies: 3,
      });
      expect(three.body.status).toBe('available');
    });

    it('games with active bookings cannot be deleted; CSV has a BOM', async () => {
      expect((await send('ax_admin', 'delete', `/api/games/${catan._id}`)).status).toBe(409);
      const csv = await get('ax_admin', '/api/games/export.csv')
        .buffer(true)
        .parse((res, cb) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => cb(null, Buffer.concat(chunks)));
        });
      expect(csv.status).toBe(200);
      expect([...csv.body.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // UTF-8 BOM
    });
  });

  describe('dashboard, confirm, shifts, peak (หน้า 4, 12, 6)', () => {
    let online;

    it('online bookings wait for confirmation', async () => {
      online = (
        await send('ax_member', 'post', '/api/reservations', {
          table: tables[2]._id,
          players: 2,
          startAt: inHours(5),
          durationHours: 1,
        })
      ).body;
      const pending = await get('ax_admin', '/api/reservations/admin?confirmed=false');
      expect(pending.body.items.map((r) => r._id)).toContain(online._id);

      const dash = await get('ax_admin', '/api/stats/dashboard');
      expect(dash.status).toBe(200);
      expect(dash.body.revenueTrend.series).toHaveLength(7);
      expect(dash.body.alerts.map((a) => a.type)).toContain('pending_confirm');

      const ok = await send('ax_staff', 'patch', `/api/reservations/admin/${online._id}/confirm`);
      expect(ok.status).toBe(200);
      expect(ok.body.confirmedBy.username).toBe('ax_staff');
      expect(
        (await send('ax_staff', 'patch', `/api/reservations/admin/${online._id}/confirm`)).status,
      ).toBe(409);
      const after = await get('ax_admin', '/api/reservations/admin?confirmed=false');
      expect(after.body.items.map((r) => r._id)).not.toContain(online._id);
    });

    it('shifts: staff roster with on-duty flag', async () => {
      const today = toLocalDateString(new Date());
      const bad = await send('ax_admin', 'post', '/api/shifts', {
        user: u.ax_member.id,
        date: today,
        start: '00:00',
        end: '23:59',
      });
      expect(bad.status).toBe(400);
      const shift = await send('ax_admin', 'post', '/api/shifts', {
        user: u.ax_staff.id,
        date: today,
        start: '00:00',
        end: '00:00', // ทั้งวัน
        position: 'Game Master',
      });
      expect(shift.status).toBe(201);
      expect(shift.body.onDuty).toBe(true);

      expect((await get('ax_staff', '/api/shifts')).status).toBe(200);
      expect(
        (
          await send('ax_staff', 'post', '/api/shifts', {
            user: u.ax_staff.id,
            date: today,
            start: '10:00',
            end: '12:00',
          })
        ).status,
      ).toBe(403);

      const dash = await get('ax_admin', '/api/stats/dashboard');
      expect(dash.body.shifts).toHaveLength(1);
      expect(dash.body.onDutyNow).toBe(1);
    });

    it('peak pricing from settings applies to quotes', async () => {
      await send('ax_admin', 'put', '/api/settings', {
        pricing: { peakEnabled: true, peakPerPersonHour: 80, peakStart: '00:00', peakEnd: '00:00' },
      });
      const q = await send('ax_member', 'post', '/api/reservations/quote', {
        table: tables[0]._id,
        players: 2,
        startAt: inHours(6),
        durationHours: 1,
      });
      expect(q.status).toBe(200);
      expect(q.body.price.total).toBe(160);
      expect(q.body.price.peakHours).toBe(1);
      await send('ax_admin', 'put', '/api/settings', { pricing: { peakEnabled: false } });
    });
  });

  describe('audit trail (หน้า 9)', () => {
    it('records staff actions across modules', async () => {
      await flushAudit();
      const res = await get('ax_admin', '/api/audit?module=reservations');
      expect(res.status).toBe(200);
      const actions = res.body.items.map((i) => i.action);
      expect(actions).toEqual(expect.arrayContaining(['create', 'return', 'confirm']));
      const settings = await get('ax_admin', '/api/audit?module=settings');
      expect(settings.body.total).toBeGreaterThan(0);
      const summary = await get('ax_admin', '/api/audit/summary');
      expect(summary.body.total).toBeGreaterThan(0);
    });

    it('hash chain verifies and detects tampering', async () => {
      await flushAudit();
      const ok = await get('ax_admin', '/api/audit/verify');
      expect(ok.status).toBe(200);
      expect(ok.body.valid).toBe(true);
      expect(ok.body.checked).toBeGreaterThan(5);

      const victim = await AuditLog.findOne().sort({ seq: 1 }).skip(2);
      await AuditLog.updateOne({ _id: victim._id }, { summary: 'แก้ย้อนหลัง' });
      const bad = await get('ax_admin', '/api/audit/verify');
      expect(bad.body.valid).toBe(false);
      expect(bad.body.brokenAt.seq).toBe(victim.seq);
    });
  });
});
