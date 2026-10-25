import { db } from '../db.js';
import { uid, nowIso } from '../util.js';

export async function recordPaidOrderCommission(order) {
  if (!order.affiliateId || order.paymentStatus !== 'paid') return null;
  const affiliateRow = (await db.prepare('SELECT json FROM affiliates WHERE id = ?').get(order.affiliateId));
  if (!affiliateRow) return null;

  const affiliate = JSON.parse(affiliateRow.json);
  const configRow = (await db.prepare('SELECT value FROM aff_config WHERE key = ?').get('config'));
  const config = configRow ? JSON.parse(configRow.value) : {};
  const saleAmount = Math.max(0, Math.floor(
    Number(order.subtotal || 0) - Number(order.discountAmount || 0) - Number(order.loyaltyDiscountAmount || 0)
  ));
  const levelBonus = Number(config.levelBonus?.[affiliate.level] || 0);
  const tiers = Array.isArray(config.tiered)
    ? config.tiered
      .filter((tier) => Number.isFinite(Number(tier.min)) && Number.isFinite(Number(tier.rate)))
      .sort((a, b) => Number(a.min) - Number(b.min))
    : [];
  const tierRate = tiers.reduce(
    (rate, tier) => saleAmount >= Number(tier.min) ? Number(tier.rate) : rate,
    Number(config.baseRate || 0),
  );
  const categoryRates = config.categoryRates && typeof config.categoryRates === 'object' ? config.categoryRates : {};
  const orderItems = Array.isArray(order.items) ? order.items : [];
  const rateWeightedCommission = orderItems.length
    ? orderItems.reduce((sum, item) => {
      const lineGross = Math.max(0, Math.round(Number(item.price || 0) * (1 - (Number(item.discount) || 0) / 100)) * Number(item.qty || 0));
      const categoryRate = Number(categoryRates[item.category]);
      const rate = (Number.isFinite(categoryRate) && categoryRate >= 0 ? categoryRate : tierRate) + levelBonus;
      if (!Number.isFinite(rate) || rate < 0) return sum;
      return sum + lineGross * saleAmount / Math.max(1, Number(order.subtotal || 0)) * rate / 100;
    }, 0)
    : saleAmount * (tierRate + levelBonus) / 100;
  const rate = saleAmount > 0 ? (rateWeightedCommission / saleAmount) * 100 : 0;
  const maxPerOrder = Number(config.maxPerOrder || 0);
  const commissionAmount = Math.min(maxPerOrder, Math.round(rateWeightedCommission));
  if (!Number.isFinite(rate) || rate <= 0 || !Number.isSafeInteger(commissionAmount) || commissionAmount <= 0) return null;

  const createdAt = order.paidAt || nowIso();
  const result = (await db.prepare(
    `INSERT INTO affiliate_commissions(
       id, affiliate_id, order_id, sale_amount, commission_amount, rate, status, created_at, updated_at
     ) VALUES(?, ?, ?, ?, ?, ?, 'pending', ?, ?) ON CONFLICT(order_id) DO NOTHING`
  ).run(
    uid('commission'), affiliate.id, order.id, saleAmount, commissionAmount, rate, createdAt, createdAt,
  ));
  return result.changes ? { affiliateId: affiliate.id, orderId: order.id, saleAmount, commissionAmount, rate } : null;
}
