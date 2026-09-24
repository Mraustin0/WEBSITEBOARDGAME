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

  beforeAll(async () => {
    await connectDb(MONGO);
    app = createApp();
    // clean users collection so re-runs are stable
    await mongoose.connection.collection('users').deleteMany({});
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('register + login + me returns same user', async () => {
    const creds = { username: 'tester', email: 'tester@example.com', password: 'secret123' };

    const reg = await request(app).post('/api/auth/register').send(creds);
    expect(reg.status).toBe(201);
    expect(reg.body.token).toBeTruthy();

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: creds.email, password: creds.password });
    expect(login.status).toBe(200);

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);
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
      .send({ email: 'tester@example.com', password: 'wrongwrong' });
    expect(res.status).toBe(401);
  });
});
