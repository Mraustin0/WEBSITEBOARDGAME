// แก้บั๊ก/ช่องโหว่ฝั่ง auth / admin / roles / pricing (Oat ช่วย A)
//  - พนักงานที่มีสิทธิ์ users สร้าง/ตั้ง/แก้/ระงับ/ลบบัญชี admin ไม่ได้ (กันยกระดับสิทธิ์)
//  - รหัสผ่านเดิมผิด → 400 (ไม่ใช่ 401 ที่ทำให้หน้าเว็บเตะออก) · เปลี่ยนรหัสแล้ว token เก่าใช้ไม่ได้
//  - JSON เสีย → 400, body ใหญ่เกิน → 413 (เดิม 500)
//  - role ชื่อภาษาไทยสร้างได้ · ส่วนลดนักศึกษา + มัดจำคิดเข้าราคา
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { User } from '../src/models/user.model.js';
import { ensureSystemRoles } from '../src/modules/roles/roles.service.js';
import { clearSettingsCache } from '../src/modules/settings/settings.service.js';
import { calcCheckout, calcPrice, RULES } from '../src/modules/reservations/reservations.rules.js';

describe('error handler (no DB)', () => {
  const app = createApp();

  it('invalid JSON body → 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid JSON/);
  });

  it('body over 1mb → 413', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: 'x'.repeat(1_100_000) }));
    expect(res.status).toBe(413);
  });

  it('does not trust X-Forwarded-For by default (TRUST_PROXY=0)', () => {
    expect(app.get('trust proxy')).toBe(0);
  });
});

describe('pricing: student discount + deposit (pure)', () => {
  const rules = {
    ...RULES,
    STUDENT: { enabled: true, percent: 10 },
    DEPOSIT: { perPerson: 20, perTable: 50 },
  };
  const startAt = new Date('2026-10-14T06:00:00Z'); // 13:00 ไทย (ไม่ทับ peak)

  it('no student flag → no discount, deposit still applied', () => {
    const p = calcPrice({ players: 4, durationHours: 2, rules, startAt });
    expect(p.total).toBe(400); // 4 × 50 × 2
    expect(p.discount).toBeUndefined();
    expect(p).toMatchObject({ deposit: 130, dueAtCounter: 270 }); // 4 × 20 + 50
  });

  it('student → discount from subtotal', () => {
    const p = calcPrice({ players: 4, durationHours: 2, rules, startAt, student: true });
    expect(p).toMatchObject({
      subtotal: 400,
      studentDiscountPercent: 10,
      discount: 40,
      total: 360,
      deposit: 130,
      dueAtCounter: 230,
    });
  });

  it('discount disabled in settings → student flag ignored', () => {
    const off = { ...rules, STUDENT: { enabled: false, percent: 10 } };
    expect(
      calcPrice({ players: 2, durationHours: 1, rules: off, startAt, student: true }).total,
    ).toBe(100);
  });

  it('defaults (no deposit, no discount) keep the old price shape', () => {
    const p = calcPrice({ players: 2, durationHours: 1, startAt });
    expect(p.deposit).toBeUndefined();
    expect(p.total).toBe(100);
  });

  it('checkout subtracts the deposit from what is due', () => {
    const bill = calcCheckout({
      startedAt: new Date('2026-10-14T06:00:00Z'),
      now: new Date('2026-10-14T08:00:00Z'),
      durationHours: 2,
      players: 4,
      bookedTotal: 400,
      deposit: 130,
    });
    expect(bill).toMatchObject({ total: 400, deposit: 130, balanceDue: 270 });
  });
});

const MONGO = process.env.MONGODB_URI;
const describeIf = MONGO ? describe : describe.skip;

describeIf('admin escalation + password (integration)', () => {
  let app;
  const t = {};
  const u = {};
  const auth = (who) => ({ Authorization: `Bearer ${t[who]}` });

  async function register(name, role = 'user') {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: name, email: `${name}@oa-test.com`, password: 'secret123' });
    expect(res.status).toBe(201);
    if (role !== 'user') await User.updateOne({ _id: res.body.user.id }, { role });
    t[name] = res.body.token;
    u[name] = res.body.user;
  }

  beforeAll(async () => {
    await connectDb(MONGO);
    app = createApp();
    const db = mongoose.connection;
    await Promise.all(['roles', 'settings'].map((c) => db.collection(c).deleteMany({})));
    await db.collection('users').deleteMany({ email: /@oa-test\.com$/ });
    clearSettingsCache();
    await ensureSystemRoles();
    await register('oa_admin', 'admin');
    await register('oa_manager', 'manager');
    await register('oa_member');
    await register('oa_member2');
  });

  afterAll(async () => {
    await mongoose.connection.collection('users').deleteMany({ email: /@oa-test\.com$/ });
    await disconnectDb();
  });

  it('manager can manage normal members', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${u.oa_member2.id}`)
      .set(auth('oa_manager'))
      .send({ displayName: 'ok' });
    expect(res.status).toBe(200);
  });

  it('manager cannot create an admin account', async () => {
    const res = await request(app).post('/api/admin/users').set(auth('oa_manager')).send({
      username: 'oa_evil',
      email: 'oa_evil@oa-test.com',
      password: 'secret123',
      role: 'admin',
    });
    expect(res.status).toBe(403);
    expect(await User.exists({ email: 'oa_evil@oa-test.com' })).toBeNull();
  });

  it('manager cannot promote anyone to admin', async () => {
    const viaRole = await request(app)
      .put(`/api/admin/users/${u.oa_member.id}/role`)
      .set(auth('oa_manager'))
      .send({ role: 'admin' });
    expect(viaRole.status).toBe(403);
    const viaPatch = await request(app)
      .patch(`/api/admin/users/${u.oa_member.id}`)
      .set(auth('oa_manager'))
      .send({ role: 'admin' });
    expect(viaPatch.status).toBe(403);
    expect((await User.findById(u.oa_member.id)).role).toBe('user');
  });

  it('manager cannot suspend, edit or delete an admin', async () => {
    const id = u.oa_admin.id;
    const calls = [
      request(app).patch(`/api/admin/users/${id}/suspend`).set(auth('oa_manager')).send({}),
      request(app).patch(`/api/admin/users/${id}`).set(auth('oa_manager')).send({ phone: '1' }),
      request(app)
        .put(`/api/admin/users/${id}/role`)
        .set(auth('oa_manager'))
        .send({ role: 'user' }),
      request(app).delete(`/api/admin/users/${id}`).set(auth('oa_manager')),
    ];
    for (const res of await Promise.all(calls)) expect(res.status).toBe(403);
    expect((await User.findById(id)).status).toBe('active');
  });

  it('admin can still promote', async () => {
    const res = await request(app)
      .put(`/api/admin/users/${u.oa_member2.id}/role`)
      .set(auth('oa_admin'))
      .send({ role: 'staff' });
    expect(res.status).toBe(200);
  });

  it('a staff role with roles:edit cannot add/remove admins via role membership', async () => {
    const created = await request(app)
      .post('/api/roles')
      .set(auth('oa_admin'))
      .send({
        name: 'OA Role Manager',
        slug: 'oa-rolemgr',
        permissions: [{ key: 'roles', view: true, edit: true, del: false, approve: false }],
      });
    expect(created.status).toBe(201);
    await register('oa_rolemgr', 'oa-rolemgr');
    const roles = await request(app).get('/api/roles').set(auth('oa_admin'));
    const adminRole = roles.body.items.find((r) => r.slug === 'admin');

    const promote = await request(app)
      .post(`/api/roles/${adminRole._id}/members`)
      .set(auth('oa_rolemgr'))
      .send({ userIds: [u.oa_member.id] });
    expect(promote.status).toBe(403);
    const demote = await request(app)
      .delete(`/api/roles/${adminRole._id}/members/${u.oa_admin.id}`)
      .set(auth('oa_rolemgr'));
    expect(demote.status).toBe(403);
    const moveAdmin = await request(app)
      .post(`/api/roles/${created.body._id}/members`)
      .set(auth('oa_rolemgr'))
      .send({ userIds: [u.oa_admin.id] });
    expect(moveAdmin.status).toBe(403);
    expect((await User.findById(u.oa_member.id)).role).toBe('user');
    expect((await User.findById(u.oa_admin.id)).role).toBe('admin');
  });

  it('role with a Thai-only name gets an auto slug', async () => {
    const res = await request(app)
      .post('/api/roles')
      .set(auth('oa_admin'))
      .send({ name: 'แคชเชียร์', permissions: [] });
    expect(res.status).toBe(201);
    expect(res.body.slug).toMatch(/^role-/);
  });

  it('wrong old password → 400 (stays logged in)', async () => {
    const res = await request(app)
      .put('/api/auth/password')
      .set(auth('oa_member'))
      .send({ oldPassword: 'nope', newPassword: 'secret456' });
    expect(res.status).toBe(400);
    const me = await request(app).get('/api/auth/me').set(auth('oa_member'));
    expect(me.status).toBe(200);
  });

  it('changing password revokes old tokens and returns a fresh one', async () => {
    // token เก่าต้องออกก่อนวินาทีที่เปลี่ยนรหัส
    await new Promise((r) => setTimeout(r, 1100));
    const res = await request(app)
      .put('/api/auth/password')
      .set(auth('oa_member'))
      .send({ oldPassword: 'secret123', newPassword: 'secret456' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();

    const old = await request(app).get('/api/auth/me').set(auth('oa_member'));
    expect(old.status).toBe(401);
    const fresh = await request(app)
      .get('/api/auth/me')
      .set({ Authorization: `Bearer ${res.body.token}` });
    expect(fresh.status).toBe(200);
  });

  it('public game list does not expose createdBy', async () => {
    const created = await request(app)
      .post('/api/games')
      .set(auth('oa_admin'))
      .send({ name: 'OA Test Game', minPlayers: 2, maxPlayers: 4, playtimeMin: 30 });
    expect(created.status).toBe(201);
    const list = await request(app).get('/api/games').query({ q: 'OA Test Game' });
    expect(list.status).toBe(200);
    for (const g of list.body.items) expect(g.createdBy).toBeUndefined();
    const one = await request(app).get(`/api/games/${created.body._id}`);
    expect(one.body.createdBy).toBeUndefined();
    await request(app).delete(`/api/games/${created.body._id}`).set(auth('oa_admin'));
  });
});
