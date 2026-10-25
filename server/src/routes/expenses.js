import { Router } from 'express';
import { db } from '../db.js';
import { uid, nowIso } from '../util.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const parse = (row) => JSON.parse(row.json);

// ─── هزینه‌ها ────────────────────────────────────────────────────────────────
router.get('/', requireAdmin, async (_req, res) => {
  const items = (await db.prepare('SELECT json FROM expenses ORDER BY created_at DESC').all()).map(parse);
  res.json({ items });
});

router.post('/', requireAdmin, async (req, res) => {
  const e = req.body || {};
  if (!e.title || !Number.isFinite(Number(e.amount)) || Number(e.amount) < 0) {
    return res.status(400).json({ error: 'invalid_input', message: 'عنوان و مبلغ معتبر هزینه الزامی است' });
  }
  const id = e.id || uid('exp');
  const expense = { category: 'سایر', amount: 0, ...e, id };
  (await db.prepare('INSERT INTO expenses(id, json, created_at, updated_at) VALUES(?, ?, ?, ?)').run(id, JSON.stringify(expense), e.date || nowIso(), nowIso()));
  res.status(201).json(expense);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM expenses WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const updated = { ...parse(row), ...req.body, id: req.params.id };
  if (!updated.title || !Number.isFinite(Number(updated.amount)) || Number(updated.amount) < 0) {
    return res.status(400).json({ error: 'invalid_input', message: 'عنوان و مبلغ معتبر هزینه الزامی است' });
  }
  (await db.prepare('UPDATE expenses SET json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(updated), nowIso(), req.params.id));
  res.json(updated);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const info = (await db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

export default router;