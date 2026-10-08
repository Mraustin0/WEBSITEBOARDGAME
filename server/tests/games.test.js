import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { User } from '../src/models/user.model.js';
import { Game } from '../src/models/game.model.js';
import { signToken } from '../src/middleware/auth.js';
import bcrypt from 'bcryptjs';

const MONGO = process.env.MONGODB_URI;
const describeIf = MONGO ? describe : describe.skip;

describeIf('games (integration)', () => {
  let app;
  let adminToken;
  let userToken;

  beforeAll(async () => {
    await connectDb(MONGO);
    app = createApp();
  });

  beforeEach(async () => {
    await Promise.all([
      mongoose.connection.collection('users').deleteMany({}),
      mongoose.connection.collection('games').deleteMany({}),
    ]);
    const hash = await bcrypt.hash('secret123', 4);
    const admin = await User.create({
      username: 'admin1',
      email: 'admin@e.com',
      passwordHash: hash,
      role: 'admin',
    });
    const user = await User.create({
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

  it('non-admin cannot create games (403)', async () => {
    const res = await request(app)
      .post('/api/games')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Catan' });
    expect(res.status).toBe(403);
  });

  it('admin creates, list returns paginated shape', async () => {
    const create = await request(app)
      .post('/api/games')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Catan', minPlayers: 3, maxPlayers: 4, yearPublished: 1995 });
    expect(create.status).toBe(201);
    expect(create.body.name).toBe('Catan');

    const list = await request(app).get('/api/games');
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.total).toBe(1);
    expect(list.body.page).toBe(1);
    expect(list.body.limit).toBe(50);
  });

  it('list filters by minPlayers/maxPlayers overlap', async () => {
    await Game.insertMany([
      { name: 'Solo', minPlayers: 1, maxPlayers: 1, yearPublished: 2020 },
      { name: 'Party', minPlayers: 4, maxPlayers: 8, yearPublished: 2015 },
      { name: 'Duo', minPlayers: 2, maxPlayers: 2, yearPublished: 2018 },
    ]);
    // ?minPlayers=4 → maxPlayers must be ≥ 4 (only Party qualifies)
    const res = await request(app).get('/api/games?minPlayers=4');
    expect(res.status).toBe(200);
    expect(res.body.items.map((g) => g.name)).toEqual(['Party']);
  });

  it('list search q filters by name substring', async () => {
    await Game.insertMany([{ name: 'Catan' }, { name: 'Catan Cities' }, { name: 'Pandemic' }]);
    const res = await request(app).get('/api/games?q=catan');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
  });

  it('list pagination + sort by year desc', async () => {
    await Game.insertMany([
      { name: 'A', yearPublished: 2000 },
      { name: 'B', yearPublished: 2010 },
      { name: 'C', yearPublished: 2020 },
    ]);
    const res = await request(app).get('/api/games?sort=year&order=desc&limit=2&page=1');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.items.map((g) => g.yearPublished)).toEqual([2020, 2010]);
  });

  it('admin updates game', async () => {
    const created = await Game.create({ name: 'X' });
    const res = await request(app)
      .put(`/api/games/${created._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'maintenance' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('maintenance');
  });

  it('admin deletes game', async () => {
    const created = await Game.create({ name: 'X' });
    const res = await request(app)
      .delete(`/api/games/${created._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const check = await Game.findById(created._id);
    expect(check).toBeNull();
  });
});
