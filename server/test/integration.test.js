import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';
import { db } from '../src/db.js';

beforeAll(async () => {
  await db.initialize();
}, 30000);

afterAll(async () => {
  await db.close();
});

describe('integration: health', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('integration: OTP flow', () => {
  it('POST /api/auth/otp/request with invalid phone returns 400', async () => {
    const res = await request(app).post('/api/auth/otp/request').send({ phone: '123' });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/otp/verify with no otp returns 400', async () => {
    const res = await request(app).post('/api/auth/otp/verify').send({ phone: '09123456789', code: '0000' });
    expect(res.status).toBe(400);
  });
});

describe('integration: RBAC', () => {
  it('GET /api/orders without auth returns 401', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/me without auth returns 401', async () => {
    const res = await request(app).get('/api/admin/me');
    expect(res.status).toBe(401);
  });
});
