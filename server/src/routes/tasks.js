import { Router } from 'express';
import { db } from '../db.js';
import { uid, nowIso } from '../util.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const parse = (row) => JSON.parse(row.json);

// ─── وظایف و تیم ─────────────────────────────────────────────────────────────
router.get('/', requireAdmin, async (_req, res) => {
  const items = (await db.prepare('SELECT json FROM tasks ORDER BY created_at DESC').all()).map(parse);
  res.json({ items });
});

router.post('/', requireAdmin, async (req, res) => {
  const t = req.body || {};
  if (!t.title) return res.status(400).json({ error: 'invalid_input', message: 'عنوان وظیفه الزامی است' });
  const id = t.id || uid('tsk');
  const task = { status: 'todo', priority: 'medium', ...t, id };
  (await db.prepare('INSERT INTO tasks(id, json, created_at, updated_at) VALUES(?, ?, ?, ?)').run(id, JSON.stringify(task), nowIso(), nowIso()));
  res.status(201).json(task);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM tasks WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const updated = { ...parse(row), ...req.body, id: req.params.id };
  (await db.prepare('UPDATE tasks SET json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(updated), nowIso(), req.params.id));
  res.json(updated);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const info = (await db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

export default router;