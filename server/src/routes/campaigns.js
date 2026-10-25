import { Router } from 'express';
import { db } from '../db.js';
import { uid, nowIso } from '../util.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const parse = (row) => JSON.parse(row.json);

// ─── کمپین‌های بازاریابی ──────────────────────────────────────────────────────
router.get('/', requireAdmin, async (_req, res) => {
  const items = (await db.prepare('SELECT json FROM campaigns ORDER BY updated_at DESC').all())
    .map(parse)
    .map((campaign) => ({ ...campaign, active: false, uses: 0, executionStatus: 'disabled' }));
  res.json({ items });
});

router.post('/', requireAdmin, async (req, res) => {
  const c = req.body || {};
  if (!c.name) return res.status(400).json({ error: 'invalid_input', message: 'نام کمپین الزامی است' });
  const id = c.id || uid('cmp');
  const campaign = { ...c, id, uses: 0, active: false, executionStatus: 'disabled' };
  (await db.prepare('INSERT INTO campaigns(id, json, updated_at) VALUES(?, ?, ?)').run(id, JSON.stringify(campaign), nowIso()));
  res.status(201).json(campaign);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM campaigns WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const updated = { ...parse(row), ...req.body, id: req.params.id, uses: 0, active: false, executionStatus: 'disabled' };
  (await db.prepare('UPDATE campaigns SET json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(updated), nowIso(), req.params.id));
  res.json(updated);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const info = (await db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

export default router;