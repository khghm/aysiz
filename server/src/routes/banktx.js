import { Router } from 'express';
import { db } from '../db.js';
import { uid, nowIso } from '../util.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const parse = (row) => JSON.parse(row.json);

// ─── تراکنش‌های بانکی ────────────────────────────────────────────────────────
router.get('/', requireAdmin, async (_req, res) => {
  const items = (await db.prepare('SELECT json FROM bank_tx ORDER BY created_at DESC').all()).map(parse);
  res.json({ items });
});

router.post('/', requireAdmin, async (req, res) => {
  const t = req.body || {};
  if (Object.hasOwn(t, 'rmaId') || Object.hasOwn(t, 'source')) {
    return res.status(400).json({ error: 'invalid_input', message: 'متادیتای تراکنش مرجوعی فقط توسط گردش بازپرداخت ثبت می‌شود' });
  }
  if (!Number.isFinite(Number(t.amount)) || Number(t.amount) <= 0 || !['in', 'out'].includes(t.type || 'in')) {
    return res.status(400).json({ error: 'invalid_input', message: 'نوع و مبلغ تراکنش معتبر الزامی است' });
  }
  const id = t.id || uid('btx');
  const tx = { type: 'in', matched: false, ...t, id };
  (await db.prepare('INSERT INTO bank_tx(id, json, created_at, updated_at) VALUES(?, ?, ?, ?)').run(id, JSON.stringify(tx), t.date || nowIso(), nowIso()));
  res.status(201).json(tx);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM bank_tx WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const current = parse(row);
  if (current.source === 'rma_refund') {
    return res.status(409).json({ error: 'immutable_refund', message: 'سند بازپرداخت مرجوعی قابل ویرایش نیست' });
  }
  const updated = { ...current, ...req.body, id: req.params.id };
  if (!Number.isFinite(Number(updated.amount)) || Number(updated.amount) <= 0 || !['in', 'out'].includes(updated.type)) {
    return res.status(400).json({ error: 'invalid_input', message: 'نوع و مبلغ تراکنش معتبر الزامی است' });
  }
  (await db.prepare('UPDATE bank_tx SET json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(updated), nowIso(), req.params.id));
  res.json(updated);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM bank_tx WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  if (parse(row).source === 'rma_refund') {
    return res.status(409).json({ error: 'immutable_refund', message: 'سند بازپرداخت مرجوعی قابل حذف نیست' });
  }
  (await db.prepare('DELETE FROM bank_tx WHERE id = ?').run(req.params.id));
  res.json({ ok: true });
});

export default router;