// ตรวจ route wiring + auth guard ของ module คน B (ไม่ต้องใช้ DB)
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('B routes require auth where expected', () => {
  const cases = [
    ['post', '/api/reservations'],
    ['get', '/api/reservations'],
    ['post', '/api/reservations/quote'],
    ['patch', '/api/reservations/64b000000000000000000000/return'],
    ['patch', '/api/reservations/64b000000000000000000000/cancel'],
    ['get', '/api/reservations/admin'],
    ['post', '/api/tables'],
    ['patch', '/api/tables/64b000000000000000000000/status'],
    ['delete', '/api/tables/64b000000000000000000000'],
    ['get', '/api/stats/overview'],
    ['get', '/api/stats/me'],
    ['get', '/api/reviews/my'],
    ['post', '/api/reservations/admin'],
    ['patch', '/api/reservations/admin/64b000000000000000000000/pay'],
    ['get', '/api/reservations/64b000000000000000000000/checkout'],
    ['patch', '/api/reservations/64b000000000000000000000/game'],
    ['get', '/api/tables/schedule'],
    ['put', '/api/settings'],
    ['get', '/api/maintenance'],
    ['post', '/api/maintenance'],
    ['get', '/api/maintenance/summary'],
    ['patch', '/api/reservations/admin/64b000000000000000000000/no-show'],
    ['get', '/api/stats/report'],
    ['get', '/api/stats/heatmap'],
    ['get', '/api/stats/export.csv'],
    ['get', '/api/stats/members/64b000000000000000000000'],
    ['get', '/api/stats/games/64b000000000000000000000'],
  ];
  it.each(cases)('%s %s → 401 without token', async (method, path) => {
    const res = await request(app)[method](path).send({});
    expect(res.status).toBe(401);
  });

  it('availability validates query before touching DB', async () => {
    const res = await request(app).get('/api/reservations/availability?durationHours=2.3');
    expect(res.status).toBe(400);
    expect(res.body.details).toHaveProperty('startAt');
    expect(res.body.details).toHaveProperty('durationHours');
  });
});
