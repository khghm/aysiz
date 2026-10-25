import { Router } from 'express';
import { db } from '../db.js';
import { uid, nowIso } from '../util.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const parse = (row) => JSON.parse(row.json);

// ─── فاکتورها ────────────────────────────────────────────────────────────────
router.get('/', requireAdmin, async (_req, res) => {
  const items = (await db.prepare('SELECT json FROM invoices ORDER BY created_at DESC').all()).map(parse);
  res.json({ items });
});

router.get('/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM invoices WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  res.json(parse(row));
});

router.post('/', requireAdmin, async (req, res) => {
  const inv = req.body || {};
  if (!inv.number || !Number.isFinite(Number(inv.amount)) || Number(inv.amount) <= 0
    || (inv.status === 'paid' && !String(inv.paymentReference || '').trim())) {
    return res.status(400).json({ error: 'invalid_input', message: 'شماره، مبلغ معتبر و مرجع پرداخت برای فاکتور تسویه‌شده الزامی است' });
  }
  const id = inv.id || uid('inv');
  const invoice = { status: 'pending', ...inv, id };
  (await db.prepare('INSERT INTO invoices(id, json, created_at, updated_at) VALUES(?, ?, ?, ?)').run(id, JSON.stringify(invoice), inv.date || nowIso(), nowIso()));
  res.status(201).json(invoice);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM invoices WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const updated = { ...parse(row), ...req.body, id: req.params.id };
  if (!Number.isFinite(Number(updated.amount)) || Number(updated.amount) <= 0
    || (updated.status === 'paid' && !String(updated.paymentReference || '').trim())) {
    return res.status(400).json({ error: 'invalid_input', message: 'مبلغ معتبر و مرجع پرداخت برای فاکتور تسویه‌شده الزامی است' });
  }
  (await db.prepare('UPDATE invoices SET json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(updated), nowIso(), req.params.id));
  res.json(updated);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const info = (await db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

export default router;