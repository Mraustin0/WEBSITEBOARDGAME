import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDb, disconnectDb } from '../src/lib/db.js';

const MONGO = process.env.MONGODB_URI;
const runIntegration = !!MONGO;

const describeIf = runIntegration ? describe : describe.skip;

describeIf('auth flow (integration)', () => {
  let app;
  let token;
  const creds = { username: 'tester', email: 'tester@example.com', password: 'secret123' };

  beforeAll(async () => {
    await connectDb(MONGO);
    app = createApp();
    await mongoose.connection.collection('users').deleteMany({});
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('register + login + me returns same user', async () => {
    const reg = await request(app).post('/api/auth/register').send(creds);
    expect(reg.status).toBe(201);
    expect(reg.body.token).toBeTruthy();

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: creds.email, password: creds.password });
    expect(login.status).toBe(200);
    token = login.body.token;

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(creds.email);
    expect(me.body.role).toBe('user');
  });

  it('rejects short password with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'x', email: 'bad@e.com', password: '1' });
    expect(res.status).toBe(400);
  });

  it('rejects bad credentials with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: creds.email, password: 'wrongwrong' });
    expect(res.status).toBe(401);
  });

  it('rejects duplicate register with 409', async () => {
    const res = await request(app).post('/api/auth/register').send(creds);
    expect(res.status).toBe(409);
  });

  it('logout returns 204', async () => {
    const res = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });

  it('change password: wrong old password → 401', async () => {
    const res = await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: 'wrongwrong', newPassword: 'newSecret1' });
    expect(res.status).toBe(401);
  });

  it('change password: same as old → 400', async () => {
    const res = await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: creds.password, newPassword: creds.password });
    expect(res.status).toBe(400);
  });

  it('change password: works, old password stops working, new one logs in', async () => {
    const newPassword = 'newSecret1';
    const change = await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: creds.password, newPassword });
    expect(change.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: creds.email, password: creds.password });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: creds.email, password: newPassword });
    expect(newLogin.status).toBe(200);
  });
});
