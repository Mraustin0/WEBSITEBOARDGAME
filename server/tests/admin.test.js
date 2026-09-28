import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { User } from '../src/models/user.model.js';
import { signToken } from '../src/middleware/auth.js';

const MONGO = process.env.MONGODB_URI;
const describeIf = MONGO ? describe : describe.skip;

describeIf('admin users (integration)', () => {
  let app;
  let adminToken;
  let userToken;
  let admin;
  let user;

  beforeAll(async () => {
    await connectDb(MONGO);
    app = createApp();
  });

  beforeEach(async () => {
    await mongoose.connection.collection('users').deleteMany({});
    const hash = await bcrypt.hash('secret123', 4);
    admin = await User.create({
      username: 'admin1',
      email: 'admin@e.com',
      passwordHash: hash,
      role: 'admin',
    });
    user = await User.create({
      username: 'user1',
      email: 'user@e.com',
      passwordHash: hash,
      role: 'user',
    });
    adminToken = signToken(admin);
    userToken = signToken(user);
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('non-admin cannot list users (403)', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('admin lists users paginated', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.items.some((u) => u.email === 'user@e.com')).toBe(true);
    // passwordHash must never leak
    expect(res.body.items.every((u) => !('passwordHash' in u))).toBe(true);
  });

  it('admin filters users by role', async () => {
    const res = await request(app)
      .get('/api/admin/users?role=admin')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].role).toBe('admin');
  });

  it('admin cannot change own role (400)', async () => {
    const res = await request(app)
      .put(`/api/admin/users/${admin._id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'user' });
    expect(res.status).toBe(400);
  });

  it('admin promotes user to admin', async () => {
    const res = await request(app)
      .put(`/api/admin/users/${user._id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
  });

  it('admin cannot delete self (400)', async () => {
    const res = await request(app)
      .delete(`/api/admin/users/${admin._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it('admin deletes another user', async () => {
    const res = await request(app)
      .delete(`/api/admin/users/${user._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const gone = await User.findById(user._id);
    expect(gone).toBeNull();
  });
});
