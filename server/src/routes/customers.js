import { Router } from 'express';
import { db } from '../db.js';
import { uid, nowIso, normalizePhone } from '../util.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const parse = (row) => JSON.parse(row.json);

// ─── مدیریت مشتریان (ادمین) ────────────────────────────────────────────────
router.get('/', requireAdmin, async (_req, res) => {
  const customers = (await db.prepare(
    `SELECT c.id, c.phone, c.name, c.created_at, c.last_login, c.is_blocked,
            COALESCE(SUM(CASE l.type WHEN 'redeem' THEN -l.points ELSE l.points END), 0) AS loyalty
     FROM customers c LEFT JOIN loyalty_transactions l ON l.customer_id = c.id
     GROUP BY c.id ORDER BY c.created_at DESC`
  ).all());
  const orderMetrics = (await db.prepare(
    `SELECT customer_id, COUNT(*) AS "orderCount", SUM(total) AS "totalSpent", MAX(created_at) AS "lastOrder"
     FROM orders WHERE customer_id IS NOT NULL AND payment_status = 'paid' GROUP BY customer_id`
  ).all());
  const byId = Object.fromEntries(orderMetrics.map((row) => [row.customer_id, row]));
  res.json({
    items: customers.map((customer) => ({
      ...customer,
      orderCount: byId[customer.id]?.orderCount || 0,
      totalSpent: byId[customer.id]?.totalSpent || 0,
      lastOrder: byId[customer.id]?.lastOrder || null,
    })),
  });
});

router.get('/:mobile/notes', requireAdmin, async (req, res) => {
  const mobile = normalizePhone(req.params.mobile);
  if (!mobile) return res.status(400).json({ error: 'invalid_input', message: 'شماره موبایل معتبر نیست' });
  const items = (await db.prepare('SELECT id, note, created_at AS "createdAt" FROM customer_notes WHERE customer_mobile = ? ORDER BY created_at DESC')
    .all(mobile));
  res.json({ items });
});

router.post('/:mobile/notes', requireAdmin, async (req, res) => {
  const mobile = normalizePhone(req.params.mobile);
  const note = String(req.body?.note || '').trim();
  if (!mobile || !note || note.length > 2000) {
    return res.status(400).json({ error: 'invalid_input', message: 'شماره مشتری و یادداشت معتبر الزامی است' });
  }
  const item = { id: uid('note'), note, createdAt: nowIso() };
  (await db.prepare('INSERT INTO customer_notes(id, customer_mobile, note, created_at) VALUES(?, ?, ?, ?)')
    .run(item.id, mobile, item.note, item.createdAt));
  res.status(201).json(item);
});

router.patch('/:id/block', requireAdmin, async (req, res) => {
  const blocked = req.body?.blocked ? 1 : 0;
  const info = (await db.prepare('UPDATE customers SET is_blocked = ? WHERE id = ?').run(blocked, req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true, blocked: !!blocked });
});

export default router;
