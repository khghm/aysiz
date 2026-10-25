import { Router } from 'express';
import { db } from '../db.js';
import { uid, nowIso } from '../util.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const parse = (row) => JSON.parse(row.json);

// ─── تیکت‌های پشتیبانی ──────────────────────────────────────────────────────
router.get('/', requireAdmin, async (_req, res) => {
  const items = (await db.prepare('SELECT json FROM tickets ORDER BY created_at DESC').all()).map(parse);
  res.json({ items });
});

router.get('/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM tickets WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  res.json(parse(row));
});

router.post('/', requireAdmin, async (req, res) => {
  const t = req.body || {};
  if (!t.subject) return res.status(400).json({ error: 'invalid_input', message: 'عنوان تیکت الزامی است' });
  const id = t.id || uid('tk');
  const ticket = { status: 'open', priority: 'medium', assignee: '', replies: [], ...t, id };
  (await db.prepare('INSERT INTO tickets(id, json, created_at, updated_at) VALUES(?, ?, ?, ?)').run(id, JSON.stringify(ticket), ticket.createdAt || nowIso(), nowIso()));
  res.status(201).json(ticket);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM tickets WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const updated = { ...parse(row), ...req.body, id: req.params.id };
  (await db.prepare('UPDATE tickets SET json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(updated), nowIso(), req.params.id));
  res.json(updated);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const info = (await db.prepare('DELETE FROM tickets WHERE id = ?').run(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

export default router;