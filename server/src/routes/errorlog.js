import { Router } from 'express';
import { db } from '../db.js';
import { uid, nowIso } from '../util.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const parse = (row) => JSON.parse(row.json);

// ─── خطاهای فنی ──────────────────────────────────────────────────────────────
router.get('/', requireAdmin, async (_req, res) => {
  const items = (await db.prepare('SELECT json FROM error_log ORDER BY created_at DESC LIMIT 200').all()).map(parse);
  res.json({ items });
});

router.post('/', requireAdmin, async (req, res) => {
  const e = req.body || {};
  if (!e.message) return res.status(400).json({ error: 'invalid_input', message: 'پیام خطای الزامی است' });
  const id = e.id || uid('err');
  const entry = { resolved: false, ...e, id };
  (await db.prepare('INSERT INTO error_log(id, json, created_at) VALUES(?, ?, ?)').run(id, JSON.stringify(entry), e.time || nowIso()));
  res.status(201).json(entry);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM error_log WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const updated = { ...parse(row), ...req.body, id: req.params.id };
  (await db.prepare('UPDATE error_log SET json = ? WHERE id = ?').run(JSON.stringify(updated), req.params.id));
  res.json(updated);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const info = (await db.prepare('DELETE FROM error_log WHERE id = ?').run(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

router.delete('/', requireAdmin, async (_req, res) => {
  (await db.prepare('DELETE FROM error_log').run());
  res.json({ ok: true });
});

export default router;