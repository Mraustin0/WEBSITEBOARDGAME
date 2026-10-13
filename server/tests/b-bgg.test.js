// BGG: error ชัดเจนเมื่อ token มีปัญหา, ดึงหลายเกมทีเดียว, import ลงคลังในคำสั่งเดียว
// ไม่ยิง BGG จริง — mock global fetch ทั้งหมด
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/lib/db.js';
import { signToken } from '../src/middleware/auth.js';
import { User } from '../src/models/user.model.js';
import { Game } from '../src/models/game.model.js';
import * as bgg from '../src/modules/bgg/bgg.service.js';

const thingXml = (id, name, extra = '') => `
  <item type="boardgame" id="${id}">
    <thumbnail>https://img.test/${id}__thumb.jpg</thumbnail>
    <image>https://img.test/${id}__original.jpg</image>
    <name type="primary" sortindex="1" value="${name}" />
    <description>Line1&amp;#10;Line2</description>
    <yearpublished value="2010" />
    <minplayers value="2" />
    <maxplayers value="5" />
    <playingtime value="75" />
    <link type="boardgamecategory" id="1" value="Economic" />
    <link type="boardgamemechanic" id="2" value="Dice Rolling" />
    <link type="boardgamedesigner" id="3" value="Someone" />
    <statistics><ratings>
      <usersrated value="1000" />
      <average value="7.5" />
      <bayesaverage value="7.1" />
      <averageweight value="2.4" />
    </ratings></statistics>
    ${extra}
  </item>`;

const itemsXml = (...items) => `<?xml version="1.0"?><items>${items.join('')}</items>`;
const xmlResponse = (body, status = 200) => new Response(body, { status });

let savedToken;
beforeEach(() => {
  savedToken = env.BGG_TOKEN;
  env.BGG_TOKEN = 'test-token';
  bgg._internal.cache.clear();
});
afterEach(() => {
  env.BGG_TOKEN = savedToken;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('BGG errors', () => {
  it('no BGG_TOKEN → 503 BGG_TOKEN_MISSING without calling BGG', async () => {
    env.BGG_TOKEN = '';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(bgg.search('catan')).rejects.toMatchObject({
      status: 503,
      details: { code: 'BGG_TOKEN_MISSING' },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([401, 403])('BGG %i → 503 BGG_TOKEN_INVALID', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => xmlResponse('denied', status)),
    );
    await expect(bgg.detail(13)).rejects.toMatchObject({
      status: 503,
      details: { code: 'BGG_TOKEN_INVALID' },
    });
  });

  it('BGG 429 → 429 BGG_RATE_LIMIT', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => xmlResponse('slow down', 429)),
    );
    await expect(bgg.hot()).rejects.toMatchObject({
      status: 429,
      details: { code: 'BGG_RATE_LIMIT' },
    });
  });

  it('network failure → 502 BGG_UNREACHABLE', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );
    await expect(bgg.search('x')).rejects.toMatchObject({
      status: 502,
      details: { code: 'BGG_UNREACHABLE' },
    });
  });

  it('202 (queued) → retries then returns data', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(xmlResponse('', 202))
      .mockResolvedValueOnce(xmlResponse(itemsXml(thingXml(13, 'Catan'))));
    vi.stubGlobal('fetch', fetchMock);
    const p = bgg.detail(13);
    await vi.runAllTimersAsync();
    expect((await p).name).toBe('Catan');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('sends Bearer token and caches successful responses only', async () => {
    const fetchMock = vi.fn(async () => xmlResponse(itemsXml(thingXml(13, 'Catan'))));
    vi.stubGlobal('fetch', fetchMock);
    await bgg.detail(13);
    await bgg.detail(13);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token');
  });
});

describe('BGG detailMany', () => {
  it('fetches several ids in one call and maps full image + stats', async () => {
    const fetchMock = vi.fn(async () =>
      xmlResponse(itemsXml(thingXml(13, 'Catan'), thingXml(30549, 'Pandemic'))),
    );
    vi.stubGlobal('fetch', fetchMock);
    const list = await bgg.detailMany([13, 30549, 13]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain('/thing?id=13,30549&stats=1');
    expect(list.map((g) => g.bggId)).toEqual([13, 30549]);
    expect(list[0]).toMatchObject({
      image: 'https://img.test/13__original.jpg',
      thumbnail: 'https://img.test/13__thumb.jpg',
      bggAverage: 7.5,
      bggRating: 7.1,
      bggWeight: 2.4,
      categories: ['Economic'],
      mechanics: ['Dice Rolling'],
      designers: ['Someone'],
    });
  });

  it('rejects more than 20 ids', async () => {
    const ids = Array.from({ length: 21 }, (_, i) => i + 1);
    await expect(bgg.detailMany(ids)).rejects.toMatchObject({ status: 400 });
  });
});

describe('BGG routes (no DB)', () => {
  const app = createApp();

  it('GET /api/bgg/search without token → 503 with code', async () => {
    env.BGG_TOKEN = '';
    const res = await request(app).get('/api/bgg/search?q=catan');
    expect(res.status).toBe(503);
    expect(res.body.details.code).toBe('BGG_TOKEN_MISSING');
  });

  it('POST /api/bgg/import/:bggId requires auth', async () => {
    const res = await request(app).post('/api/bgg/import/13');
    expect(res.status).toBe(401);
  });
});

const MONGO = process.env.MONGODB_URI;
const describeIf = MONGO ? describe : describe.skip;

describeIf('POST /api/bgg/import/:bggId (integration)', () => {
  let app;
  let adminT;
  let userT;
  const auth = (t) => ({ Authorization: `Bearer ${t}` });

  beforeAll(async () => {
    await connectDb(MONGO);
    app = createApp();
  });

  beforeEach(async () => {
    await Promise.all([
      mongoose.connection.collection('users').deleteMany({}),
      mongoose.connection.collection('games').deleteMany({}),
    ]);
    const passwordHash = await bcrypt.hash('secret123', 4);
    const admin = await User.create({
      username: 'bgg_admin',
      email: 'bgg_admin@e.com',
      passwordHash,
      role: 'admin',
    });
    const user = await User.create({
      username: 'bgg_user',
      email: 'bgg_user@e.com',
      passwordHash,
      role: 'user',
    });
    adminT = signToken(admin);
    userT = signToken(user);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => xmlResponse(itemsXml(thingXml(13, 'Catan')))),
    );
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it('member cannot import', async () => {
    const res = await request(app).post('/api/bgg/import/13').set(auth(userT));
    expect(res.status).toBe(403);
  });

  it('creates a new game with full image, ratings and categories (201)', async () => {
    const res = await request(app).post('/api/bgg/import/13').set(auth(adminT));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      bggId: 13,
      name: 'Catan',
      minPlayers: 2,
      maxPlayers: 5,
      playtimeMin: 75,
      image: 'https://img.test/13__original.jpg',
      thumbnail: 'https://img.test/13__thumb.jpg',
      bggAverage: 7.5,
      bggWeight: 2.4,
      categories: ['Economic'],
      copies: 1,
      status: 'available',
    });
    expect(res.body.description).toContain('Line1\nLine2');
  });

  it('re-import updates BGG data but keeps shop fields (200)', async () => {
    await Game.create({
      bggId: 13,
      name: 'คาทาน',
      description: 'ของร้าน',
      playtimeMin: 120,
      copies: 3,
      shelf: 'A1',
    });
    const res = await request(app).post('/api/bgg/import/13').set(auth(adminT)).send({});
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      name: 'คาทาน',
      description: 'ของร้าน',
      playtimeMin: 120,
      copies: 3,
      shelf: 'A1',
      image: 'https://img.test/13__original.jpg',
      bggWeight: 2.4,
    });
    expect(await Game.countDocuments({ bggId: 13 })).toBe(1);
  });

  it('overwrite=true also replaces name/description/playtime', async () => {
    await Game.create({ bggId: 13, name: 'คาทาน', playtimeMin: 120, copies: 3 });
    const res = await request(app)
      .post('/api/bgg/import/13')
      .set(auth(adminT))
      .send({ overwrite: true });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Catan', playtimeMin: 75, copies: 3 });
  });

  it('unknown bggId → 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => xmlResponse(itemsXml())),
    );
    const res = await request(app).post('/api/bgg/import/999999').set(auth(adminT));
    expect(res.status).toBe(404);
  });
});
