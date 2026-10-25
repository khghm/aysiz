import { db } from '../db.js';
import { uid, nowIso } from '../util.js';

export async function getLoyaltyConfig() {
  const row = (await db.prepare('SELECT value FROM loyalty WHERE key = ?').get('config'));
  const stored = row ? JSON.parse(row.value) : {};
  return {
    pointsPerThousand: Number(stored.pointsPerThousand) || 0,
    pointValue: Number(stored.pointValue) || 0,
    redemptionCapPercent: Number.isInteger(stored.redemptionCapPercent) ? stored.redemptionCapPercent : 10,
  };
}

export async function getLoyaltyBalance(customerId) {
  const row = (await db.prepare(
    `SELECT COALESCE(SUM(CASE type WHEN 'redeem' THEN -points ELSE points END), 0) AS balance
     FROM loyalty_transactions WHERE customer_id = ?`
  ).get(customerId));
  return Math.max(0, row.balance);
}

export async function calculateRedemption({ customerId, points, eligibleAmount }) {
  if (!Number.isSafeInteger(points) || points < 0) {
    return { ok: false, status: 400, error: 'invalid_loyalty_points', message: 'تعداد امتیاز درخواستی نامعتبر است' };
  }
  if (points === 0) return { ok: true, points: 0, discountAmount: 0 };
  if (!customerId) {
    return { ok: false, status: 401, error: 'login_required', message: 'برای استفاده از امتیاز وفاداری وارد حساب خود شوید' };
  }

  const config = await getLoyaltyConfig();
  if (!Number.isSafeInteger(config.pointValue) || config.pointValue <= 0) {
    return { ok: false, status: 409, error: 'redemption_disabled', message: 'ارزش امتیاز برای بازخرید تنظیم نشده است' };
  }
  const cap = Math.floor(Math.max(0, eligibleAmount) * config.redemptionCapPercent / 100);
  const maxPoints = Math.floor(cap / config.pointValue);
  if (points > maxPoints) {
    return { ok: false, status: 400, error: 'redemption_limit_exceeded', message: `حداکثر امتیاز قابل استفاده در این سفارش ${maxPoints} است` };
  }
  const balance = await getLoyaltyBalance(customerId);
  if (points > balance) {
    return { ok: false, status: 409, error: 'insufficient_loyalty_points', message: 'موجودی امتیاز برای این بازخرید کافی نیست' };
  }
  return { ok: true, points, discountAmount: points * config.pointValue };
}

export async function recordOrderRedemption(order) {
  const points = order.loyaltyRedemption?.points || 0;
  if (!order.customerId || points <= 0) return null;
  const result = (await db.prepare(
    `INSERT INTO loyalty_transactions(id, customer_id, order_id, type, points, eligible_amount, created_at)
     VALUES(?, ?, ?, 'redeem', ?, ?, ?) ON CONFLICT(order_id, type) DO NOTHING`
  ).run(
    uid('loyalty'), order.customerId, order.id, points,
    order.loyaltyRedemption.discountAmount, nowIso(),
  ));
  return result.changes ? points : null;
}

export async function refundOrderRedemption(order) {
  const points = order.loyaltyRedemption?.points || 0;
  if (!order.customerId || points <= 0) return null;
  const result = (await db.prepare(
    `INSERT INTO loyalty_transactions(id, customer_id, order_id, type, points, eligible_amount, created_at)
     VALUES(?, ?, ?, 'refund', ?, ?, ?) ON CONFLICT(order_id, type) DO NOTHING`
  ).run(
    uid('loyalty'), order.customerId, order.id, points,
    order.loyaltyRedemption.discountAmount, nowIso(),
  ));
  return result.changes ? points : null;
}

export async function awardOrderPoints(order) {
  if (!order.customerId || order.paymentStatus !== 'paid') return null;
  const config = await getLoyaltyConfig();
  const eligibleAmount = Math.max(0, Math.floor(
    Number(order.subtotal || 0) - Number(order.discountAmount || 0) - Number(order.loyaltyDiscountAmount || 0)
  ));
  const points = Number.isFinite(config.pointsPerThousand) && config.pointsPerThousand > 0
    ? Math.floor((eligibleAmount * config.pointsPerThousand) / 1000)
    : 0;
  if (!Number.isSafeInteger(points) || points <= 0) return null;

  const createdAt = order.paidAt || nowIso();
  const result = (await db.prepare(
    `INSERT INTO loyalty_transactions(id, customer_id, order_id, type, points, eligible_amount, created_at)
     VALUES(?, ?, ?, 'earn', ?, ?, ?) ON CONFLICT(order_id, type) DO NOTHING`
  ).run(uid('loyalty'), order.customerId, order.id, points, eligibleAmount, createdAt));
  return result.changes ? { customerId: order.customerId, orderId: order.id, points, eligibleAmount, createdAt } : null;
}
