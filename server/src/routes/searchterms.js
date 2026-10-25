import { Router } from 'express';
import { db } from '../db.js';
import { uid, nowIso } from '../util.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const parse = (row) => JSON.parse(row.json);

// ─── عبارات جستجو شده ────────────────────────────────────────────────────────
router.get('/', requireAdmin, async (_req, res) => {
  const items = (await db.prepare('SELECT json FROM search_terms ORDER BY updated_at DESC').all()).map(parse);
  res.json({ items });
});

router.post('/', requireAdmin, async (req, res) => {
  const s = req.body || {};
  if (!s.term) return res.status(400).json({ error: 'invalid_input', message: 'عبارت جستجو الزامی است' });
  const id = s.id || uid('st');
  const item = { count: 0, trending: false, ...s, id };
  (await db.prepare('INSERT INTO search_terms(id, json, updated_at) VALUES(?, ?, ?)').run(id, JSON.stringify(item), nowIso()));
  res.status(201).json(item);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM search_terms WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const updated = { ...parse(row), ...req.body, id: req.params.id };
  (await db.prepare('UPDATE search_terms SET json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(updated), nowIso(), req.params.id));
  res.json(updated);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const info = (await db.prepare('DELETE FROM search_terms WHERE id = ?').run(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

export default router;