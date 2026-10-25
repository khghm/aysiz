import { Router } from 'express';
import { db } from '../db.js';
import { uid, nowIso } from '../util.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const parse = (row) => JSON.parse(row.json);

// ─── دارایی‌های ثابت ─────────────────────────────────────────────────────────
router.get('/', requireAdmin, async (_req, res) => {
  const items = (await db.prepare('SELECT json FROM assets ORDER BY updated_at DESC').all()).map(parse);
  res.json({ items });
});

router.post('/', requireAdmin, async (req, res) => {
  const a = req.body || {};
  if (!a.name) return res.status(400).json({ error: 'invalid_input', message: 'نام دارایی الزامی است' });
  const id = a.id || uid('ast');
  const asset = { value: 0, lifeYears: 5, purchaseDate: new Date().toISOString().slice(0, 10), ...a, id };
  (await db.prepare('INSERT INTO assets(id, json, updated_at) VALUES(?, ?, ?)').run(id, JSON.stringify(asset), nowIso()));
  res.status(201).json(asset);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM assets WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const updated = { ...parse(row), ...req.body, id: req.params.id };
  (await db.prepare('UPDATE assets SET json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(updated), nowIso(), req.params.id));
  res.json(updated);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const info = (await db.prepare('DELETE FROM assets WHERE id = ?').run(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

export default router;