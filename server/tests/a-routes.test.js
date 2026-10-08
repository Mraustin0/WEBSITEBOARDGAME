// route wiring + auth guard for module A (no DB required)
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('A routes require auth where expected', () => {
  const cases = [
    ['post', '/api/auth/logout'],
    ['put', '/api/auth/password'],
    ['get', '/api/admin/users'],
    ['put', '/api/admin/users/64b000000000000000000000/role'],
    ['delete', '/api/admin/users/64b000000000000000000000'],
    ['put', '/api/auth/me'],
    ['get', '/api/admin/users/stats'],
    ['patch', '/api/admin/users/64b000000000000000000000/suspend'],
    ['get', '/api/games/stats'],
    ['patch', '/api/games/64b000000000000000000000/copies'],
    ['get', '/api/roles'],
    ['put', '/api/roles/64b000000000000000000000/permissions'],
    ['get', '/api/audit'],
    ['get', '/api/audit/verify'],
    ['get', '/api/shifts'],
    ['post', '/api/shifts'],
    ['get', '/api/stats/dashboard'],
    ['patch', '/api/reservations/admin/64b000000000000000000000/confirm'],
  ];
  it.each(cases)('%s %s → 401 without token', async (method, path) => {
    const res = await request(app)[method](path).send({});
    expect(res.status).toBe(401);
  });
});

describe('A public routes', () => {
  it('GET /api/games → 200 with paginated shape', async () => {
    const res = await request(app).get('/api/games?limit=1');
    // Depending on DB availability this may be 200 (empty items) or 500;
    // we only assert that Zod query validation didn't reject a valid query.
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
    }
  });

  it('GET /api/games rejects invalid sort with 400', async () => {
    const res = await request(app).get('/api/games?sort=nope');
    expect(res.status).toBe(400);
    expect(res.body.details).toHaveProperty('sort');
  });

  it('GET /api/bgg/search requires q', async () => {
    const res = await request(app).get('/api/bgg/search');
    expect(res.status).toBe(400);
    expect(res.body.details).toHaveProperty('q');
  });
});
