import { Router } from 'express';
import { db, getSetting } from '../db.js';
import { uid, nowIso, orderCode, normalizePhone } from '../util.js';
import { optionalAuth, requireAdmin } from '../middleware/auth.js';
import { createRateLimit, limitIdentities } from '../middleware/rateLimit.js';
import { calculateRedemption, recordOrderRedemption, refundOrderRedemption } from '../services/loyalty.js';

const router = Router();
const parse = (row) => JSON.parse(row.json);
const createOrderByIp = createRateLimit({
  name: 'order-create-ip',
  limit: 20,
  windowMs: 15 * 60 * 1000,
  identity: limitIdentities.ip,
});
const createOrderByMobile = createRateLimit({
  name: 'order-create-mobile',
  limit: 10,
  windowMs: 60 * 60 * 1000,
  identity: (req) => {
    const mobile = normalizePhone(req.body?.mobile);
    return mobile ? `phone:${mobile}` : null;
  },
});

// ─── محاسبه مبالغ سفارش (همسان با منطق سبد خرید فرونت‌اند) ────────────────
export const finalPrice = (price, discount) => Math.round(price * (1 - (Number(discount) || 0) / 100));

export async function computeTotals({ items, couponCode, includeShipping = true, loyaltyDiscountAmount = 0 }) {
  const settings = await getSetting('store') || {};
  const subtotal = items.reduce((s, i) => s + finalPrice(i.price, i.discount) * i.qty, 0);

  let discountAmount = 0;
  let appliedCode = null;
  if (couponCode) {
    const row = (await db.prepare('SELECT json, active FROM discount_codes WHERE code = ?').get(String(couponCode).toUpperCase()));
    const c = row ? JSON.parse(row.json) : null;
    if (c && row.active && c.active && new Date(c.expiresAt) >= new Date() && (c.usedCount ?? 0) < (c.maxUses ?? 0)) {
      appliedCode = c;
      discountAmount = c.type === 'percent' ? Math.round((subtotal * c.value) / 100) : Math.min(c.value, subtotal);
    }
  }

  const shipping = !includeShipping || subtotal >= (settings.freeShippingThreshold ?? Infinity) ? 0 : (settings.shippingCost ?? 0);
  const taxRate = settings.showPricesWithTax ? ((settings.vatRate ?? 0) + (settings.levyRate ?? 0)) / 100 : 0;
  const appliedLoyaltyDiscount = Math.min(
    Math.max(0, Math.floor(loyaltyDiscountAmount)),
    Math.max(0, subtotal - discountAmount),
  );
  const taxBase = Math.max(0, subtotal - discountAmount - appliedLoyaltyDiscount);
  const tax = Math.round(taxBase * taxRate);
  const total = taxBase + shipping + tax;

  return { subtotal, discountAmount, loyaltyDiscountAmount: appliedLoyaltyDiscount, shipping, tax, total, appliedCode };
}

// ─── ثبت سفارش جدید (عمومی؛ کاربر مهمان هم مجاز است) ──────────────────────
// POST /api/orders  { name, mobile, city, address, postalCode?, items:[{productId, qty, size, color}], couponCode? }
router.post('/', createOrderByIp, createOrderByMobile, optionalAuth('customer'), async (req, res) => {
  const body = req.body || {};
  const mobile = normalizePhone(body.mobile);
  const requestedPoints = body.redeemPoints === undefined ? 0 : Number(body.redeemPoints);
  const affiliateVisitorId = body.affiliateVisitorId ? String(body.affiliateVisitorId) : '';
  const errors = {};
  if (!body.name) errors.name = 'نام الزامی است';
  if (!mobile) errors.mobile = 'شماره موبایل معتبر وارد کنید';
  if (!body.city) errors.city = 'شهر الزامی است';
  if (!body.address) errors.address = 'آدرس الزامی است';
  if (!Array.isArray(body.items) || body.items.length === 0) errors.items = 'سبد خرید خالی است';
  else if (body.items.some((item) => !Number.isInteger(Number(item.qty)) || Number(item.qty) < 1 || Number(item.qty) > 99)) errors.items = 'تعداد کالا نامعتبر است';
  if (!Number.isSafeInteger(requestedPoints) || requestedPoints < 0) errors.redeemPoints = 'مقدار امتیاز درخواستی نامعتبر است';
  if (affiliateVisitorId && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(affiliateVisitorId)) {
    errors.affiliateVisitorId = 'شناسه انتساب بازاریابی نامعتبر است';
  }
  if (Object.keys(errors).length) return res.status(400).json({ error: 'invalid_input', fields: errors });

  // اقلام از سمت سرور بازخوانی می‌شوند تا قیمت/تخفیف قابل جعل نباشد
  const getStmt = db.prepare('SELECT json FROM products WHERE id = ?');
  const items = [];
  for (const it of body.items) {
    const row = await getStmt.get(it.productId);
    if (!row) return res.status(400).json({ error: 'invalid_input', message: `محصول ${it.productId} یافت نشد` });
    const p = JSON.parse(row.json);
    if (!p.effective) return res.status(409).json({ error: 'product_unavailable', message: `محصول ${p.name} در دسترس نیست` });
    const qty = Math.max(1, Math.min(Number(it.qty) || 1, 99));
    items.push({
      productId: p.id, name: p.name, category: p.category || '', qty, size: it.size || '', color: it.color || '',
      price: p.price, discount: p.discount, image: p.image,
    });
  }

  const customerId = req.user?.id || null;
  const baseTotals = await computeTotals({ items, couponCode: body.couponCode });
  const redemption = await calculateRedemption({
    customerId,
    points: requestedPoints,
    eligibleAmount: baseTotals.subtotal - baseTotals.discountAmount,
  });
  if (!redemption.ok) return res.status(redemption.status).json({ error: redemption.error, message: redemption.message });
  const totals = await computeTotals({
    items,
    couponCode: body.couponCode,
    loyaltyDiscountAmount: redemption.discountAmount,
  });
  let affiliateId = null;
  let affiliateRefCode = null;
  if (affiliateVisitorId) {
    const visit = (await db.prepare('SELECT affiliate_id FROM affiliate_visits WHERE visitor_id = ? AND expires_at > ?')
      .get(affiliateVisitorId, nowIso()));
    const affiliateRow = visit && (await db.prepare('SELECT json FROM affiliates WHERE id = ?').get(visit.affiliate_id));
    if (affiliateRow) {
      const affiliate = JSON.parse(affiliateRow.json);
      if (affiliate.active && normalizePhone(affiliate.mobile) !== mobile) {
        affiliateId = affiliate.id;
        affiliateRefCode = affiliate.refCode;
      }
    }
  }
  const id = uid('ord');
  const order = {
    id, code: orderCode(),
    customer: body.name, mobile, city: body.city,
    items, ...totals,
    couponCode: totals.appliedCode?.code,
    status: 'pending', payment: 'online', paymentStatus: 'unpaid', channel: 'website',
    createdAt: nowIso(), address: body.address, postalCode: body.postalCode || '',
    customerId,
    loyaltyRedemption: { points: redemption.points, discountAmount: redemption.discountAmount },
    affiliateId,
    affiliateRefCode,
  };

  (await db.exec('BEGIN IMMEDIATE'));
  try {
    const confirmedRedemption = await calculateRedemption({
      customerId,
      points: requestedPoints,
      eligibleAmount: baseTotals.subtotal - baseTotals.discountAmount,
    });
    if (!confirmedRedemption.ok) {
      (await db.exec('ROLLBACK'));
      return res.status(confirmedRedemption.status).json({ error: confirmedRedemption.error, message: confirmedRedemption.message });
    }
    for (const item of [...items].sort((left, right) => left.productId.localeCompare(right.productId))) {
      const row = (await db.prepare('SELECT json FROM products WHERE id = ? FOR UPDATE').get(item.productId));
      const product = row && JSON.parse(row.json);
      if (!product?.effective) {
        (await db.exec('ROLLBACK'));
        return res.status(409).json({ error: 'product_unavailable', message: `محصول ${item.name} دیگر در دسترس نیست` });
      }
      if (Number(product.stock || 0) < item.qty) {
        (await db.exec('ROLLBACK'));
        return res.status(409).json({ error: 'insufficient_stock', message: `موجودی ${item.name} کافی نیست` });
      }
      (await db.prepare('UPDATE products SET json = ? WHERE id = ?')
        .run(JSON.stringify({ ...product, stock: Number(product.stock || 0) - item.qty }), item.productId));
    }

    if (totals.appliedCode) {
      const couponRow = (await db.prepare('SELECT json, active FROM discount_codes WHERE code = ? FOR UPDATE').get(totals.appliedCode.code));
      const coupon = couponRow && JSON.parse(couponRow.json);
      if (!couponRow || !couponRow.active || !coupon.active || (coupon.usedCount ?? 0) >= (coupon.maxUses ?? 0)) {
        (await db.exec('ROLLBACK'));
        return res.status(409).json({ error: 'coupon_unavailable', message: 'کد تخفیف دیگر قابل استفاده نیست' });
      }
      const updatedCoupon = { ...coupon, usedCount: (coupon.usedCount ?? 0) + 1 };
      (await db.prepare('UPDATE discount_codes SET json = ? WHERE code = ?')
        .run(JSON.stringify(updatedCoupon), coupon.code));
    }

    (await db.prepare('INSERT INTO orders(id, code, customer_id, mobile, status, payment_status, total, json, created_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, order.code, order.customerId, mobile, order.status, 'unpaid', totals.total, JSON.stringify(order), order.createdAt));
    await recordOrderRedemption(order);
    (await db.exec('COMMIT'));
  } catch (error) {
    (await db.exec('ROLLBACK'));
    throw error;
  }

  res.status(201).json({ ok: true, order });
});

router.post('/pos', requireAdmin, async (req, res) => {
  const { saleId, customer, paymentMethod, paymentReference } = req.body || {};
  const lines = req.body?.items;
  if (typeof saleId !== 'string' || !/^[a-z0-9-]{1,80}$/i.test(saleId)) {
    return res.status(400).json({ error: 'invalid_input', message: 'شناسه فروش نامعتبر است' });
  }
  if (!Array.isArray(lines) || !lines.length || lines.some((line) => !line.productId || !Number.isInteger(Number(line.qty)) || Number(line.qty) < 1 || Number(line.qty) > 99)) {
    return res.status(400).json({ error: 'invalid_input', message: 'اقلام فاکتور نامعتبر است' });
  }
  if (!['cash', 'card'].includes(paymentMethod) || (paymentMethod === 'card' && !String(paymentReference || '').trim())) {
    return res.status(400).json({ error: 'invalid_payment', message: 'روش پرداخت یا شماره پیگیری معتبر نیست' });
  }

  const orderId = `pos-${saleId}`;
  const existing = (await db.prepare('SELECT json FROM orders WHERE id = ?').get(orderId));
  if (existing) {
    const order = parse(existing);
    const invoice = (await db.prepare('SELECT json FROM invoices WHERE id = ?').get(`inv-${saleId}`));
    return res.json({ ok: true, order, invoice: invoice ? JSON.parse(invoice.json) : null, replayed: true });
  }

  const items = [];
  for (const line of lines) {
    const row = (await db.prepare('SELECT json FROM products WHERE id = ?').get(line.productId));
    if (!row) return res.status(404).json({ error: 'product_not_found', message: `محصول ${line.productId} یافت نشد` });
    const product = JSON.parse(row.json);
    if (!product.effective || Number(product.stock || 0) < Number(line.qty)) {
      return res.status(409).json({ error: 'insufficient_stock', message: `موجودی ${product.name} کافی نیست` });
    }
    const existingLine = items.find((item) => item.productId === product.id);
    if (existingLine) {
      existingLine.qty += Number(line.qty);
      if (Number(product.stock || 0) < existingLine.qty) {
        return res.status(409).json({ error: 'insufficient_stock', message: `موجودی ${product.name} کافی نیست` });
      }
    } else {
      items.push({ productId: product.id, name: product.name, qty: Number(line.qty), size: '', color: '', price: product.price, discount: product.discount, image: product.image });
    }
  }

  const totals = await computeTotals({ items, includeShipping: false });
  const now = nowIso();
  const order = {
    id: orderId, code: orderCode(), customer: String(customer || 'مشتری حضوری').trim(),
    mobile: '', city: '', items, ...totals, status: 'delivered', payment: paymentMethod,
    paymentStatus: 'paid', paymentReference: String(paymentReference || '').trim(),
    channel: 'pos', createdAt: now, address: '', postalCode: '',
  };
  const invoiceId = `inv-${saleId}`;
  const invoice = {
    id: invoiceId, number: `POS-${now.replace(/\D/g, '').slice(0, 14)}`,
    orderId, customer: order.customer, amount: totals.total, status: 'paid',
    date: now, paymentMethod, paymentReference: order.paymentReference,
  };
  const transaction = {
    id: `pos-tx-${saleId}`, type: 'in', method: paymentMethod === 'cash' ? 'نقدی' : 'کارتخوان',
    amount: totals.total, date: now, ref: order.paymentReference || invoice.number,
    matched: true, orderId,
  };

  (await db.exec('BEGIN IMMEDIATE'));
  try {
    if ((await db.prepare('SELECT id FROM orders WHERE id = ?').get(orderId))) {
      (await db.exec('ROLLBACK'));
      return res.status(409).json({ error: 'duplicate_sale', message: 'این فروش قبلاً ثبت شده است' });
    }
    for (const item of [...items].sort((left, right) => left.productId.localeCompare(right.productId))) {
      const row = (await db.prepare('SELECT json FROM products WHERE id = ? FOR UPDATE').get(item.productId));
      const product = row && JSON.parse(row.json);
      if (!product?.effective || Number(product.stock || 0) < item.qty) {
        (await db.exec('ROLLBACK'));
        return res.status(409).json({ error: 'insufficient_stock', message: `موجودی ${item.name} کافی نیست` });
      }
      (await db.prepare('UPDATE products SET json = ? WHERE id = ?')
        .run(JSON.stringify({ ...product, stock: Number(product.stock || 0) - item.qty }), item.productId));
    }
    (await db.prepare('INSERT INTO orders(id, code, customer_id, mobile, status, payment_status, total, json, created_at) VALUES(?, ?, NULL, ?, ?, ?, ?, ?, ?)')
      .run(order.id, order.code, '', order.status, 'paid', order.total, JSON.stringify(order), now));
    (await db.prepare('INSERT INTO invoices(id, json, created_at, updated_at) VALUES(?, ?, ?, ?)')
      .run(invoice.id, JSON.stringify(invoice), now, now));
    (await db.prepare('INSERT INTO bank_tx(id, json, created_at, updated_at) VALUES(?, ?, ?, ?)')
      .run(transaction.id, JSON.stringify(transaction), now, now));
    (await db.exec('COMMIT'));
  } catch (error) {
    (await db.exec('ROLLBACK'));
    throw error;
  }

  res.status(201).json({ ok: true, order, invoice });
});

// ─── سفارش‌های مشتری جاری ──────────────────────────────────────────────────
router.get('/mine', optionalAuth('customer'), async (req, res) => {
  if (!req.user) return res.json({ items: [] });
  const rows = (await db.prepare('SELECT json FROM orders WHERE customer_id = ? ORDER BY created_at DESC').all(req.user.id));
  res.json({ items: rows.map(parse) });
});

// جستجوی سفارش با کد پیگیری + موبایل (برای پیگیری مهمان)
// GET /api/orders/track?code=SQ-123&mobile=09...
router.get('/track', async (req, res) => {
  const code = String(req.query.code || '').toUpperCase();
  const mobile = normalizePhone(req.query.mobile);
  if (!code || !mobile) return res.status(400).json({ error: 'invalid_input', message: 'کد پیگیری و موبایل الزامی است' });
  const row = (await db.prepare('SELECT json FROM orders WHERE code = ? AND mobile = ?').get(code, mobile));
  if (!row) return res.status(404).json({ error: 'not_found', message: 'سفارشی با این مشخصات یافت نشد' });
  const order = parse(row);
  const shipment = order.shipment ? {
    carrierName: order.shipment.carrierName,
    trackingCode: order.shipment.trackingCode,
    status: order.shipment.status,
    shippedAt: order.shipment.shippedAt,
    deliveredAt: order.shipment.deliveredAt,
    events: (order.shipment.events || []).map(({ id, status, label, note, createdAt }) => ({ id, status, label, note, createdAt })),
  } : null;
  res.json({
    code: order.code,
    status: order.status,
    createdAt: order.createdAt,
    items: (order.items || []).map(({ name, qty }) => ({ name, qty })),
    shipment,
  });
});

// ─── لیست کل سفارش‌ها (ادمین) ──────────────────────────────────────────────
router.get('/', requireAdmin, async (req, res) => {
  const { status, mobile } = req.query;
  let rows = (await db.prepare('SELECT json FROM orders ORDER BY created_at DESC').all()).map(parse);
  if (status) rows = rows.filter((o) => o.status === status);
  if (mobile) rows = rows.filter((o) => o.mobile === mobile);
  res.json({ items: rows });
});

router.get('/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json, payment_status FROM orders WHERE id = ? OR code = ?').get(req.params.id, req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  res.json(parse(row));
});

// تغییر وضعیت سفارش (ادمین)
const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
router.patch('/:id/status', requireAdmin, async (req, res) => {
  const status = String(req.body?.status || '');
  if (!allowedStatuses.includes(status)) return res.status(400).json({ error: 'invalid_status', message: 'وضعیت نامعتبر است' });
  const row = (await db.prepare('SELECT json, payment_status FROM orders WHERE id = ? OR code = ?').get(req.params.id, req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  let current = parse(row);
  if (current.status === status) return res.json(current);
  if (['shipped', 'delivered'].includes(status)) {
    const shipmentStatus = current.shipment?.status;
    const shipmentMatches = status === 'shipped'
      ? ['shipped', 'in_transit', 'exception'].includes(shipmentStatus)
      : shipmentStatus === 'delivered';
    if (!current.shipment?.trackingCode || !shipmentMatches) {
      return res.status(409).json({ error: 'shipment_required', message: 'وضعیت ارسال و تحویل را از گردش ثبت مرسوله به‌روزرسانی کنید' });
    }
  }
  if (current.status === 'cancelled') {
    return res.status(409).json({ error: 'order_cancelled', message: 'سفارش لغوشده قابل فعال‌سازی مجدد نیست' });
  }
  if ((row.payment_status === 'paid' || current.paymentStatus === 'paid') && status === 'cancelled') {
    return res.status(409).json({ error: 'refund_required', message: 'برای لغو سفارش پرداخت‌شده ابتدا وجه را مسترد کنید' });
  }
  if (status !== 'cancelled' && row.payment_status !== 'paid' && current.paymentStatus !== 'paid') {
    return res.status(409).json({ error: 'payment_required', message: 'فقط سفارش پرداخت‌شده قابل پردازش یا ارسال است' });
  }
  (await db.exec('BEGIN IMMEDIATE'));
  try {
    const latestRow = (await db.prepare('SELECT json, payment_status FROM orders WHERE id = ? FOR UPDATE').get(current.id));
    if (!latestRow) {
      (await db.exec('ROLLBACK'));
      return res.status(404).json({ error: 'not_found' });
    }
    current = parse(latestRow);
    if (current.status === 'cancelled') {
      (await db.exec('ROLLBACK'));
      return res.status(409).json({ error: 'order_cancelled', message: 'سفارش لغوشده قابل فعال‌سازی مجدد نیست' });
    }
    if (['shipped', 'delivered'].includes(status)) {
      const shipmentStatus = current.shipment?.status;
      const shipmentMatches = status === 'shipped'
        ? ['shipped', 'in_transit', 'exception'].includes(shipmentStatus)
        : shipmentStatus === 'delivered';
      if (!current.shipment?.trackingCode || !shipmentMatches) {
        (await db.exec('ROLLBACK'));
        return res.status(409).json({ error: 'shipment_required', message: 'وضعیت ارسال و تحویل را از گردش ثبت مرسوله به‌روزرسانی کنید' });
      }
    }
    if (status === 'cancelled' && (latestRow.payment_status === 'paid' || current.paymentStatus === 'paid')) {
      (await db.exec('ROLLBACK'));
      return res.status(409).json({ error: 'refund_required', message: 'برای لغو سفارش پرداخت‌شده ابتدا وجه را مسترد کنید' });
    }
    if (status !== 'cancelled' && latestRow.payment_status !== 'paid' && current.paymentStatus !== 'paid') {
      (await db.exec('ROLLBACK'));
      return res.status(409).json({ error: 'payment_required', message: 'فقط سفارش پرداخت‌شده قابل پردازش یا ارسال است' });
    }
    if (status === 'cancelled' && (await db.prepare("SELECT id FROM payment_transactions WHERE order_id = ? AND status = 'pending' LIMIT 1").get(current.id))) {
      (await db.exec('ROLLBACK'));
      return res.status(409).json({ error: 'payment_pending', message: 'تا تعیین تکلیف پرداخت درگاه، سفارش قابل لغو نیست' });
    }
    const order = { ...current, status };
    if (status === 'cancelled' && current.status !== 'cancelled') {
      const items = [...(current.items || [])].sort((left, right) => left.productId.localeCompare(right.productId));
      for (const item of items) {
        const productRow = (await db.prepare('SELECT json FROM products WHERE id = ? FOR UPDATE').get(item.productId));
        if (productRow) {
          const product = JSON.parse(productRow.json);
          (await db.prepare('UPDATE products SET json = ? WHERE id = ?')
            .run(JSON.stringify({ ...product, stock: Number(product.stock || 0) + Number(item.qty || 0) }), item.productId));
        }
      }
      if (current.couponCode) {
        const couponRow = (await db.prepare('SELECT json FROM discount_codes WHERE code = ? FOR UPDATE').get(current.couponCode));
        if (couponRow) {
          const coupon = JSON.parse(couponRow.json);
          (await db.prepare('UPDATE discount_codes SET json = ? WHERE code = ?')
            .run(JSON.stringify({ ...coupon, usedCount: Math.max(0, (coupon.usedCount || 0) - 1) }), current.couponCode));
        }
      }
    }
    (await db.prepare('UPDATE orders SET status = ?, json = ? WHERE id = ?').run(status, JSON.stringify(order), order.id));
    if (status === 'cancelled') await refundOrderRedemption(current);
    (await db.exec('COMMIT'));
    return res.json(order);
  } catch (error) {
    (await db.exec('ROLLBACK'));
    throw error;
  }
});

export default router;
