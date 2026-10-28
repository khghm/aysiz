import { Router } from 'express';
import { db } from '../db.js';
import { uid, nowIso } from '../util.js';
import { requireAdmin, requireCustomer } from '../middleware/auth.js';

const router = Router();
const parse = (row) => JSON.parse(row.json);
const transitions = {
  requested: ['approved', 'rejected'],
  approved: ['quality_check', 'rejected'],
  quality_check: ['returned', 'rejected'],
  returned: ['refunded'],
  refunded: [],
  rejected: [],
};

router.get('/', requireAdmin, async (_req, res) => {
  const items = (await db.prepare('SELECT json FROM rmas ORDER BY created_at DESC').all()).map(parse);
  res.json({ items });
});

router.get('/mine', requireCustomer, async (req, res) => {
  const items = (await db.prepare(
    `SELECT r.json FROM rmas r
     JOIN orders o ON o.id = (r.json::jsonb ->> 'orderId')
     WHERE o.customer_id = ?
     ORDER BY r.created_at DESC`
  ).all(req.user.id)).map(parse);
  res.json({ items });
});

router.post('/mine', requireCustomer, async (req, res) => {
  const orderId = typeof req.body?.orderId === 'string' ? req.body.orderId.trim() : '';
  const productId = typeof req.body?.productId === 'string' ? req.body.productId.trim() : '';
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  const quantity = Number(req.body?.quantity);
  if (!orderId || !productId || !reason || reason.length > 1000
    || !Number.isSafeInteger(quantity) || quantity < 1) {
    return res.status(400).json({ error: 'invalid_input', message: 'سفارش، کالا، تعداد و دلیل معتبر الزامی است' });
  }

  const id = uid('rma');
  const date = nowIso();
  (await db.exec('BEGIN IMMEDIATE'));
  try {
    const orderRow = (await db.prepare(
      'SELECT json, payment_status FROM orders WHERE id = ? AND customer_id = ? FOR UPDATE'
    ).get(orderId, req.user.id));
    if (!orderRow) {
      (await db.exec('ROLLBACK'));
      return res.status(404).json({ error: 'order_not_found', message: 'سفارش متعلق به حساب شما یافت نشد' });
    }
    if (orderRow.payment_status !== 'paid') {
      (await db.exec('ROLLBACK'));
      return res.status(409).json({ error: 'order_not_paid', message: 'برای سفارش پرداخت‌نشده درخواست مرجوعی ممکن نیست' });
    }
    const order = parse(orderRow);
    if (order.status !== 'delivered') {
      (await db.exec('ROLLBACK'));
      return res.status(409).json({ error: 'order_not_delivered', message: 'فقط سفارش تحویل‌شده قابل ثبت درخواست مرجوعی است' });
    }
    const line = (order.items || []).find((item) => item.productId === productId);
    if (!line) {
      (await db.exec('ROLLBACK'));
      return res.status(400).json({ error: 'product_not_in_order' });
    }
    const priorQuantityRow = (await db.prepare(
      "SELECT COALESCE(SUM((json::jsonb ->> 'quantity')::int), 0) AS qty FROM rmas WHERE (json::jsonb ->> 'orderId') = ? AND (json::jsonb ->> 'productId') = ? AND (json::jsonb ->> 'status') <> 'rejected'"
    ).get(orderId, productId));
    const priorQuantity = Number(priorQuantityRow?.qty || 0);
    if (priorQuantity + quantity > Number(line.qty || 0)) {
      (await db.exec('ROLLBACK'));
      return res.status(409).json({ error: 'return_quantity_exceeded', message: 'تعداد درخواستی از مقدار قابل مرجوعی بیشتر است' });
    }

    const rma = {
      id,
      orderId,
      orderCode: order.code,
      productId,
      productName: line.name,
      quantity,
      customer: order.customer,
      mobile: order.mobile,
      reason,
      status: 'requested',
      date,
      source: 'customer',
    };
    (await db.prepare('INSERT INTO rmas(id, json, created_at, updated_at) VALUES(?, ?, ?, ?)')
      .run(id, JSON.stringify(rma), date, date));
    (await db.exec('COMMIT'));
    return res.status(201).json(rma);
  } catch (error) {
    (await db.exec('ROLLBACK'));
    throw error;
  }
});

router.get('/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM rmas WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  res.json(parse(row));
});

router.post('/', requireAdmin, async (req, res) => {
  const { orderId, productId, reason } = req.body || {};
  const quantity = Number(req.body?.quantity);
  if (typeof orderId !== 'string' || !orderId || typeof productId !== 'string' || !productId ||
      typeof reason !== 'string' || !reason.trim() || reason.length > 1000 ||
      !Number.isSafeInteger(quantity) || quantity < 1) {
    return res.status(400).json({ error: 'invalid_input', message: 'سفارش، کالا، تعداد و دلیل معتبر الزامی است' });
  }

  const id = typeof req.body?.id === 'string' && /^[a-z0-9_-]{1,100}$/i.test(req.body.id) ? req.body.id : uid('rma');
  const date = nowIso();
  (await db.exec('BEGIN IMMEDIATE'));
  try {
    const orderRow = (await db.prepare('SELECT json, payment_status FROM orders WHERE id = ? FOR UPDATE').get(orderId));
    if (!orderRow) {
      (await db.exec('ROLLBACK'));
      return res.status(404).json({ error: 'order_not_found' });
    }
    if (orderRow.payment_status !== 'paid') {
      (await db.exec('ROLLBACK'));
      return res.status(409).json({ error: 'order_not_paid' });
    }

    const order = parse(orderRow);
    const line = (order.items || []).find((item) => item.productId === productId);
    if (!line) {
      (await db.exec('ROLLBACK'));
      return res.status(400).json({ error: 'product_not_in_order' });
    }

    const priorQuantityRow = (await db.prepare(
      "SELECT COALESCE(SUM((json::jsonb ->> 'quantity')::int), 0) AS qty FROM rmas WHERE (json::jsonb ->> 'orderId') = ? AND (json::jsonb ->> 'productId') = ? AND (json::jsonb ->> 'status') <> 'rejected'"
    ).get(orderId, productId));
    const priorQuantity = Number(priorQuantityRow?.qty || 0);
    if (priorQuantity + quantity > Number(line.qty || 0)) {
      (await db.exec('ROLLBACK'));
      return res.status(409).json({ error: 'return_quantity_exceeded' });
    }

    const rma = {
      id,
      orderId,
      orderCode: order.code,
      productId,
      productName: line.name,
      quantity,
      customer: order.customer,
      mobile: order.mobile,
      reason: reason.trim(),
      status: 'requested',
      date,
    };
    (await db.prepare('INSERT INTO rmas(id, json, created_at, updated_at) VALUES(?, ?, ?, ?)')
      .run(id, JSON.stringify(rma), date, date));
    (await db.exec('COMMIT'));
    return res.status(201).json(rma);
  } catch (error) {
    (await db.exec('ROLLBACK'));
    if (error.code === '23505') {
      return res.status(409).json({ error: 'duplicate_rma' });
    }
    throw error;
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM rmas WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const current = parse(row);
  const nextStatus = req.body?.status;
  if (typeof nextStatus !== 'string' || !Object.hasOwn(transitions, current.status)) {
    return res.status(400).json({ error: 'invalid_status' });
  }
  if (nextStatus === current.status) return res.json(current);
  if (!transitions[current.status].includes(nextStatus)) {
    return res.status(409).json({ error: 'invalid_transition', message: 'تغییر وضعیت مرجوعی مجاز نیست' });
  }

  const timestamp = nowIso();
  if (nextStatus === 'refunded') {
    const amount = Number(req.body?.refundAmount);
    const reference = typeof req.body?.refundReference === 'string' ? req.body.refundReference.trim() : '';
    if (!Number.isSafeInteger(amount) || amount <= 0 || !reference || reference.length > 200) {
      return res.status(400).json({ error: 'invalid_refund', message: 'مبلغ صحیح و مرجع حواله واقعی الزامی است' });
    }

    (await db.exec('BEGIN IMMEDIATE'));
    try {
      const latestRmaRow = (await db.prepare('SELECT json FROM rmas WHERE id = ? FOR UPDATE').get(req.params.id));
      const latestRma = latestRmaRow && parse(latestRmaRow);
      if (latestRma?.status === 'refunded'
        && latestRma.refundAmount === amount
        && latestRma.refundReference === reference) {
        (await db.exec('ROLLBACK'));
        return res.json(latestRma);
      }
      if (!latestRma || latestRma.status !== 'returned') {
        (await db.exec('ROLLBACK'));
        return res.status(409).json({ error: 'invalid_transition' });
      }

      const orderRow = (await db.prepare('SELECT json, payment_status, total FROM orders WHERE id = ? FOR UPDATE').get(latestRma.orderId));
      if (!orderRow) {
        (await db.exec('ROLLBACK'));
        return res.status(404).json({ error: 'order_not_found' });
      }
      if (orderRow.payment_status !== 'paid') {
        (await db.exec('ROLLBACK'));
        return res.status(409).json({ error: 'order_not_paid' });
      }

      const alreadyRefunded = (await db.prepare('SELECT COALESCE(SUM(amount), 0) AS amount FROM rma_refunds WHERE order_id = ?')
        .get(latestRma.orderId)).amount;
      if (amount > Number(orderRow.total) - alreadyRefunded) {
        (await db.exec('ROLLBACK'));
        return res.status(409).json({ error: 'refund_exceeds_paid_total', message: 'مبلغ بازپرداخت از مانده پرداخت‌شده سفارش بیشتر است' });
      }

      const updated = { ...latestRma, status: 'refunded', refundAmount: amount, refundReference: reference, refundedAt: timestamp };
      const refundId = uid('refund');
      (await db.prepare('INSERT INTO rma_refunds(id, rma_id, order_id, amount, reference, created_at) VALUES(?, ?, ?, ?, ?, ?)')
        .run(refundId, latestRma.id, latestRma.orderId, amount, reference, timestamp));
      (await db.prepare('INSERT INTO bank_tx(id, json, created_at, updated_at) VALUES(?, ?, ?, ?)')
        .run(refundId, JSON.stringify({
          id: refundId,
          date: timestamp,
          type: 'out',
          category: 'refund',
          description: `بازپرداخت مرجوعی ${latestRma.id}`,
          amount,
          method: 'manual_transfer',
          reference,
          orderId: latestRma.orderId,
          rmaId: latestRma.id,
          source: 'rma_refund',
          matched: false,
        }), timestamp, timestamp));

      const order = parse(orderRow);
      order.refundedAmount = Number(order.refundedAmount || 0) + amount;
      (await db.prepare('UPDATE orders SET json = ? WHERE id = ?').run(JSON.stringify(order), latestRma.orderId));
      (await db.prepare('UPDATE rmas SET json = ?, updated_at = ? WHERE id = ?')
        .run(JSON.stringify(updated), timestamp, latestRma.id));
      (await db.prepare(
        `UPDATE affiliate_commissions SET review_status = 'review', reviewed_at = NULL, reviewed_by = NULL, updated_at = ?
         WHERE order_id = ? AND status = 'pending' AND review_status IN ('none', 'approved')`
      ).run(timestamp, latestRma.orderId));
      const pendingPayouts = (await db.prepare(
        `SELECT DISTINCT p.id, p.json FROM payouts p
         JOIN affiliate_commissions ac ON ac.payout_id = p.id
         WHERE ac.order_id = ? AND ac.status = 'pending'`
      ).all(latestRma.orderId));
      for (const payout of pendingPayouts) {
        const payoutData = JSON.parse(payout.json);
        (await db.prepare('UPDATE payouts SET json = ?, updated_at = ? WHERE id = ?')
          .run(JSON.stringify({ ...payoutData, reviewRequired: true }), timestamp, payout.id));
      }
      const auditId = uid('log');
      (await db.prepare('INSERT INTO audit_log(id, json, created_at) VALUES(?, ?, ?)')
        .run(auditId, JSON.stringify({
          id: auditId,
          action: 'ثبت بازپرداخت مرجوعی',
          actor: req.user.username,
          role: req.user.roleName,
          target: latestRma.id,
          severity: 'warning',
          at: timestamp,
        }), timestamp));
      (await db.exec('COMMIT'));
      return res.json(updated);
    } catch (error) {
      (await db.exec('ROLLBACK'));
      if (error.code === '23505') return res.status(409).json({ error: 'refund_already_recorded' });
      throw error;
    }
  }

  (await db.exec('BEGIN IMMEDIATE'));
  try {
    const latestRow = (await db.prepare('SELECT json FROM rmas WHERE id = ? FOR UPDATE').get(req.params.id));
    if (!latestRow) {
      (await db.exec('ROLLBACK'));
      return res.status(404).json({ error: 'not_found' });
    }
    const latest = parse(latestRow);
    if (latest.status === nextStatus) {
      (await db.exec('ROLLBACK'));
      return res.json(latest);
    }
    if (!Object.hasOwn(transitions, latest.status) || !transitions[latest.status].includes(nextStatus)) {
      (await db.exec('ROLLBACK'));
      return res.status(409).json({ error: 'invalid_transition', message: 'تغییر وضعیت مرجوعی مجاز نیست' });
    }
    const updated = { ...latest, status: nextStatus };
    (await db.prepare('UPDATE rmas SET json = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(updated), timestamp, req.params.id));
    (await db.exec('COMMIT'));
    return res.json(updated);
  } catch (error) {
    (await db.exec('ROLLBACK'));
    throw error;
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM rmas WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  if (parse(row).status === 'refunded') return res.status(409).json({ error: 'refund_is_immutable' });
  (await db.prepare('DELETE FROM rmas WHERE id = ?').run(req.params.id));
  res.json({ ok: true });
});

export default router;
