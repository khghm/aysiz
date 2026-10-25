import { Router } from 'express';
import { db } from '../db.js';
import { uid, nowIso } from '../util.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const parse = (row) => JSON.parse(row.json);

// ─── اتوماسیون‌ها ────────────────────────────────────────────────────────────
router.get('/', requireAdmin, async (_req, res) => {
  const items = (await db.prepare('SELECT json FROM automations ORDER BY updated_at DESC').all())
    .map(parse)
    .map((automation) => ({ ...automation, active: false, sent: 0, executionStatus: 'disabled' }));
  res.json({ items });
});

router.post('/', requireAdmin, async (req, res) => {
  const a = req.body || {};
  if (!a.name) return res.status(400).json({ error: 'invalid_input', message: 'نام اتوماسیون الزامی است' });
  const id = a.id || uid('aut');
  const automation = { ...a, id, active: false, sent: 0, executionStatus: 'disabled' };
  (await db.prepare('INSERT INTO automations(id, json, updated_at) VALUES(?, ?, ?)').run(id, JSON.stringify(automation), nowIso()));
  res.status(201).json(automation);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM automations WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const updated = { ...parse(row), ...req.body, id: req.params.id, active: false, sent: 0, executionStatus: 'disabled' };
  (await db.prepare('UPDATE automations SET json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(updated), nowIso(), req.params.id));
  res.json(updated);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const info = (await db.prepare('DELETE FROM automations WHERE id = ?').run(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

export default router;