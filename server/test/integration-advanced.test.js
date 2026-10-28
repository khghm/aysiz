import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';
import { db } from '../src/db.js';

beforeAll(async () => {
  await db.initialize();
}, 30000);

afterAll(async () => {
  await db.close();
});

describe('integration: payment idempotency', () => {
  let productId;
  let orderId;

  beforeAll(async () => {
    // Create a test product
    const now = new Date().toISOString();
    productId = 'test-prod-' + Date.now();
    await db.prepare('INSERT INTO products(id, slug, json, updated_at) VALUES(?, ?, ?, ?)')
      .run(productId, productId, JSON.stringify({
        id: productId, name: 'Test Product', category: 'tshirt', subcategory: 'tshirt-m',
        brand: 'Test', price: 100000, discount: 0, rating: 4, image: '', book: [],
        colors: [], sizes: ['M'], stock: 10, sales: 0, isNew: true, effective: true,
        description: 'test', features: [], specs: {}, sku: 'TEST-001', commission: 8,
      }), now);

    // Create an order
    const items = [{ productId, name: 'Test Product', category: 'tshirt', qty: 2, size: 'M', color: '', price: 100000, discount: 0, image: '' }];
    const orderRes = await request(app).post('/api/orders').send({
      name: 'Test User', mobile: '09123456789', city: 'Tehran', address: 'Test Addr',
      items: [{ productId, qty: 2, size: 'M', color: '' }],
    });
    expect(orderRes.status).toBe(201);
    orderId = orderRes.body.order.id;
  });

  it('first payment start returns authority', async () => {
    const res = await request(app).post('/api/payment/start').send({ orderId });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.authority).toBeTruthy();
    expect(res.body.reused).toBeUndefined();
  });

  it('second payment start reuses same authority (idempotent)', async () => {
    const res1 = await request(app).post('/api/payment/start').send({ orderId });
    const res2 = await request(app).post('/api/payment/start').send({ orderId });
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.authority).toBe(res2.body.authority);
    expect(res2.body.reused).toBe(true);
  });

  it('already paid order returns 400', async () => {
    // Mark as paid manually
    const orderRow = await db.prepare('SELECT json FROM orders WHERE id = ?').get(orderId);
    const order = JSON.parse(orderRow.json);
    order.paymentStatus = 'paid';
    order.payment_status = 'paid';
    order.status = 'processing';
    await db.prepare('UPDATE orders SET payment_status = ?, json = ? WHERE id = ?')
      .run('paid', JSON.stringify(order), orderId);

    const res = await request(app).post('/api/payment/start').send({ orderId });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('already_paid');
  });
});

describe('integration: stock rollback on failed payment', () => {
  let productId;
  let orderId;

  beforeAll(async () => {
    const now = new Date().toISOString();
    productId = 'test-prod-stock-' + Date.now();
    await db.prepare('INSERT INTO products(id, slug, json, updated_at) VALUES(?, ?, ?, ?)')
      .run(productId, productId, JSON.stringify({
        id: productId, name: 'Stock Test Product', category: 'tshirt', subcategory: 'tshirt-m',
        brand: 'Test', price: 50000, discount: 0, rating: 4, image: '', book: [],
        colors: [], sizes: ['M'], stock: 5, sales: 0, isNew: true, effective: true,
        description: 'test', features: [], specs: {}, sku: 'STOCK-001', commission: 8,
      }), now);

    const orderRes = await request(app).post('/api/orders').send({
      name: 'Stock User', mobile: '09123456780', city: 'Tehran', address: 'Test Addr',
      items: [{ productId, qty: 2, size: 'M', color: '' }],
    });
    expect(orderRes.status).toBe(201);
    orderId = orderRes.body.order.id;
  });

  it('stock is deducted after order creation', async () => {
    const row = await db.prepare('SELECT json FROM products WHERE id = ?').get(productId);
    const product = JSON.parse(row.json);
    expect(product.stock).toBe(3); // 5 - 2
  });

  it('payment callback with NOK restores stock', async () => {
    // Start payment
    const startRes = await request(app).post('/api/payment/start').send({ orderId });
    expect(startRes.status).toBe(200);
    const authority = startRes.body.authority;

    // Callback with NOK (failed)
    const cbRes = await request(app).get(`/api/payment/callback?Authority=${authority}&Status=NOK`);
    expect(cbRes.status).toBe(302);

    // Check stock restored
    const row = await db.prepare('SELECT json FROM products WHERE id = ?').get(productId);
    const product = JSON.parse(row.json);
    expect(product.stock).toBe(5); // restored
  });
});

describe('integration: OTP flow end-to-end', () => {
  it('request OTP for valid phone succeeds', async () => {
    const res = await request(app).post('/api/auth/otp/request').send({ phone: '09120000001' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('verify OTP with wrong code returns 400', async () => {
    const res = await request(app).post('/api/auth/otp/verify').send({ phone: '09120000001', code: '0000' });
    expect(res.status).toBe(400);
  });

  it('verify OTP with blocked customer returns 403', async () => {
    // Block the customer
    await db.prepare("INSERT INTO customers(id, phone, name, created_at, is_blocked) VALUES(?, ?, ?, ?, 1) ON CONFLICT(phone) DO UPDATE SET is_blocked=1")
      .run('blk-' + Date.now(), '09120000002', 'Blocked', new Date().toISOString());

    const res = await request(app).post('/api/auth/otp/request').send({ phone: '09120000002' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('blocked');
  });
});

describe('integration: RBAC', () => {
  it('admin endpoints require auth', async () => {
    const endpoints = ['/api/orders', '/api/customers', '/api/admin/me'];
    for (const ep of endpoints) {
      const res = await request(app).get(ep);
      expect(res.status).toBe(401);
    }
  });

  it('invalid admin credentials return 401', async () => {
    const res = await request(app).post('/api/auth/admin-login').send({ username: 'admin', password: 'wrongpassword123' });
    expect(res.status).toBe(401);
  });
});
