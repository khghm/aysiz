import { Router } from 'express';
import { db } from '../db.js';
import { uid, nowIso } from '../util.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const parse = (row) => JSON.parse(row.json);
const shipmentStatuses = new Set(['preparing', 'shipped', 'in_transit', 'delivered', 'exception']);
const shipmentTransitions = {
  preparing: new Set(['preparing', 'shipped']),
  shipped: new Set(['shipped', 'in_transit', 'delivered', 'exception']),
  in_transit: new Set(['in_transit', 'delivered', 'exception']),
  exception: new Set(['exception', 'shipped', 'in_transit', 'delivered']),
  delivered: new Set(['delivered']),
};

router.get('/shipments', requireAdmin, async (_req, res) => {
  const items = (await db.prepare("SELECT json FROM orders WHERE payment_status = 'paid' ORDER BY created_at DESC")
    .all())
    .map(parse)
    .filter((order) => order.status !== 'cancelled');
  res.json({ items });
});

router.put('/shipments/:orderId', requireAdmin, async (req, res) => {
  const body = req.body || {};
  const orderRow = (await db.prepare('SELECT id, json, payment_status FROM orders WHERE id = ? OR code = ?')
    .get(req.params.orderId, req.params.orderId));
  if (!orderRow) return res.status(404).json({ error: 'order_not_found', message: 'سفارش یافت نشد' });
  const current = parse(orderRow);
  if (current.status === 'cancelled' || (orderRow.payment_status !== 'paid' && current.paymentStatus !== 'paid')) {
    return res.status(409).json({ error: 'order_not_shippable', message: 'فقط سفارش پرداخت‌شده و لغونشده قابل ثبت مرسوله است' });
  }

  const status = String(body.status || '');
  const trackingCode = String(body.trackingCode || '').trim();
  const carrierId = String(body.carrierId || '');
  const note = String(body.note || '').trim();
  if (!shipmentStatuses.has(status) || trackingCode.length > 120 || note.length > 240
    || (status !== 'preparing' && !trackingCode)) {
    return res.status(400).json({ error: 'invalid_shipment', message: 'وضعیت، کد رهگیری یا یادداشت مرسوله معتبر نیست' });
  }

  const existing = current.shipment;
  if (existing && !shipmentTransitions[existing.status]?.has(status)) {
    return res.status(409).json({ error: 'invalid_shipment_transition', message: 'تغییر وضعیت مرسوله با گردش فعلی سازگار نیست' });
  }
  if (!existing && !(current.status === 'delivered' ? status === 'delivered' : ['preparing', 'shipped'].includes(status))) {
    return res.status(409).json({ error: 'invalid_initial_shipment_status', message: 'مرسوله باید با آماده‌سازی یا ارسال آغاز شود' });
  }

  let carrier = null;
  if (carrierId) {
    const carrierRow = (await db.prepare('SELECT json FROM carriers WHERE id = ?').get(carrierId));
    if (!carrierRow) return res.status(404).json({ error: 'carrier_not_found', message: 'حامل ارسال یافت نشد' });
    carrier = parse(carrierRow);
    if (!carrier.active && carrierId !== existing?.carrierId) {
      return res.status(409).json({ error: 'carrier_inactive', message: 'حامل غیرفعال برای مرسوله جدید قابل انتخاب نیست' });
    }
  } else if (status !== 'preparing') {
    return res.status(400).json({ error: 'carrier_required', message: 'برای ثبت ارسال، حامل فعال را انتخاب کنید' });
  }

  const now = nowIso();
  const statusLabel = {
    preparing: 'آماده‌سازی مرسوله',
    shipped: 'تحویل به حامل',
    in_transit: 'در مسیر',
    delivered: 'تحویل‌شده',
    exception: 'نیازمند پیگیری',
  }[status];
  const previous = existing || {};
  const changed = !existing || previous.status !== status || previous.trackingCode !== trackingCode
    || previous.carrierId !== carrierId || Boolean(note);
  const events = Array.isArray(previous.events) ? [...previous.events] : [];
  if (changed) {
    events.push({
      id: uid('ship-event'),
      status,
      label: statusLabel,
      note,
      createdAt: now,
      createdBy: req.user.name || req.user.username,
    });
  }
  const shipment = {
    id: previous.id || uid('shipment'),
    orderId: current.id,
    carrierId,
    carrierName: carrier?.name || (carrierId ? previous.carrierName || '' : ''),
    trackingCode,
    status,
    createdAt: previous.createdAt || now,
    updatedAt: now,
    shippedAt: ['shipped', 'in_transit', 'delivered', 'exception'].includes(status) ? (previous.shippedAt || now) : '',
    deliveredAt: status === 'delivered' ? (previous.deliveredAt || now) : '',
    events: events.slice(-100),
  };
  const orderStatus = status === 'preparing' ? 'processing'
    : status === 'delivered' ? 'delivered'
      : status === 'exception' && current.status === 'processing' ? 'processing' : 'shipped';
  const updatedOrder = {
    ...current,
    status: orderStatus,
    carrier: shipment.carrierName,
    tracking: shipment.trackingCode,
    trackingCode: shipment.trackingCode,
    shipment,
  };

  (await db.exec('BEGIN IMMEDIATE'));
  try {
    const latest = (await db.prepare('SELECT json, payment_status FROM orders WHERE id = ? FOR UPDATE').get(current.id));
    if (!latest) {
      (await db.exec('ROLLBACK'));
      return res.status(404).json({ error: 'order_not_found', message: 'سفارش یافت نشد' });
    }
    const latestOrder = parse(latest);
    if (latestOrder.status === 'cancelled' || (latest.payment_status !== 'paid' && latestOrder.paymentStatus !== 'paid')) {
      (await db.exec('ROLLBACK'));
      return res.status(409).json({ error: 'order_not_shippable', message: 'وضعیت پرداخت یا سفارش تغییر کرده است' });
    }
    if (latestOrder.status !== current.status
      || JSON.stringify(latestOrder.shipment || null) !== JSON.stringify(existing || null)
      || (latestOrder.shipment?.status && !shipmentTransitions[latestOrder.shipment.status]?.has(status))) {
      (await db.exec('ROLLBACK'));
      return res.status(409).json({ error: 'invalid_shipment_transition', message: 'وضعیت مرسوله هم‌زمان تغییر کرده است؛ دوباره بارگذاری کنید' });
    }
    (await db.prepare('UPDATE orders SET status = ?, json = ? WHERE id = ?')
      .run(orderStatus, JSON.stringify(updatedOrder), current.id));
    (await db.exec('COMMIT'));
  } catch (error) {
    (await db.exec('ROLLBACK'));
    throw error;
  }
  res.json({ order: updatedOrder, shipment });
});

// ─── حامل‌های ارسال ─────────────────────────────────────────────────────────
router.get('/', requireAdmin, async (_req, res) => {
  const items = (await db.prepare('SELECT json FROM carriers ORDER BY updated_at DESC').all()).map(parse);
  res.json({ items });
});

router.post('/', requireAdmin, async (req, res) => {
  const c = req.body || {};
  if (!c.name) return res.status(400).json({ error: 'invalid_input', message: 'نام حامل الزامی است' });
  const id = c.id || uid('cr');
  const carrier = { active: true, ...c, id };
  (await db.prepare('INSERT INTO carriers(id, json, updated_at) VALUES(?, ?, ?)').run(id, JSON.stringify(carrier), nowIso()));
  res.status(201).json(carrier);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM carriers WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const updated = { ...parse(row), ...req.body, id: req.params.id };
  (await db.prepare('UPDATE carriers SET json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(updated), nowIso(), req.params.id));
  res.json(updated);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const info = (await db.prepare('DELETE FROM carriers WHERE id = ?').run(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

export default router;