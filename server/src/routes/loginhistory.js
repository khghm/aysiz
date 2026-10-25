import { Router } from 'express';
import { db } from '../db.js';
import { uid, nowIso } from '../util.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const parse = (row) => JSON.parse(row.json);

// ─── تاریخچه ورود کاربران ────────────────────────────────────────────────────
router.get('/', requireAdmin, async (_req, res) => {
  const items = (await db.prepare('SELECT json FROM login_history ORDER BY created_at DESC LIMIT 200').all()).map(parse);
  res.json({ items });
});

router.post('/', requireAdmin, async (req, res) => {
  const l = req.body || {};
  if (!l.user) return res.status(400).json({ error: 'invalid_input', message: 'کاربر الزامی است' });
  const id = l.id || uid('lh');
  const entry = { success: true, role: '-', ip: '-', browser: '-', ...l, id };
  (await db.prepare('INSERT INTO login_history(id, json, created_at) VALUES(?, ?, ?)').run(id, JSON.stringify(entry), l.time || nowIso()));
  res.status(201).json(entry);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const info = (await db.prepare('DELETE FROM login_history WHERE id = ?').run(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

export default router;