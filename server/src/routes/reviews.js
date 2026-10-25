import { Router } from 'express';
import { db } from '../db.js';
import { uid, nowIso } from '../util.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const parse = (row) => JSON.parse(row.json);

// ─── نظرات محصولات ─────────────────────────────────────────────────────────
// GET /api/reviews?productId=p1&status=approved
router.get('/', async (req, res) => {
  const { productId, status } = req.query;
  let rows;
  if (productId) {
    rows = (await db.prepare('SELECT json FROM reviews WHERE product_id = ?').all(String(productId))).map(parse);
  } else {
    rows = (await db.prepare('SELECT json FROM reviews').all()).map(parse);
  }
  if (status) rows = rows.filter((r) => r.status === status);
  res.json({ items: rows });
});

// ثبت نظر توسط مشتری (با وضعیت pending)
router.post('/', async (req, res) => {
  const { productId, author, rating, text, pros = [], cons = [] } = req.body || {};
  if (!productId || !text) return res.status(400).json({ error: 'invalid_input', message: 'متن نظر و شناسه محصول الزامی است' });
  const exists = (await db.prepare('SELECT id FROM products WHERE id = ?').get(productId));
  if (!exists) return res.status(404).json({ error: 'product_not_found' });

  const review = {
    id: uid('rev'), productId, author: String(author || 'مشتری'), rating: Number(rating) || 5,
    text, pros, cons, status: 'pending', date: nowIso(),
  };
  (await db.prepare('INSERT INTO reviews(id, product_id, status, json, created_at) VALUES(?, ?, ?, ?, ?)')
    .run(review.id, productId, review.status, JSON.stringify(review), nowIso()));
  res.status(201).json(review);
});

// مدیریت نظر (ادمین): تأیید/رد/پاسخ
router.put('/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM reviews WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const review = { ...parse(row), ...req.body, id: req.params.id };
  (await db.prepare('UPDATE reviews SET status = ?, json = ? WHERE id = ?')
    .run(review.status, JSON.stringify(review), req.params.id));
  res.json(review);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const info = (await db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

export default router;
