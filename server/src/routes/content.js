import { Router } from 'express';
import { db } from '../db.js';
import { uid, nowIso } from '../util.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const parse = (row) => JSON.parse(row.json);

// ─── صفحات ایستا ─────────────────────────────────────────────────────────────
router.get('/pages', requireAdmin, async (_req, res) => {
  const items = (await db.prepare('SELECT json FROM pages ORDER BY updated_at DESC').all()).map(parse);
  res.json({ items });
});

router.get('/pages/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM pages WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  res.json(parse(row));
});

router.post('/pages', requireAdmin, async (req, res) => {
  const p = req.body || {};
  if (!p.title) return res.status(400).json({ error: 'invalid_input', message: 'عنوان صفحه الزامی است' });
  const id = p.id || uid('pg');
  const page = { published: true, ...p, id };
  (await db.prepare('INSERT INTO pages(id, json, updated_at) VALUES(?, ?, ?)').run(id, JSON.stringify(page), nowIso()));
  res.status(201).json(page);
});

router.put('/pages/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM pages WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const updated = { ...parse(row), ...req.body, id: req.params.id };
  (await db.prepare('UPDATE pages SET json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(updated), nowIso(), req.params.id));
  res.json(updated);
});

router.delete('/pages/:id', requireAdmin, async (req, res) => {
  const info = (await db.prepare('DELETE FROM pages WHERE id = ?').run(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

// ─── بنرهای اسلایدر ──────────────────────────────────────────────────────────
router.get('/banners', requireAdmin, async (_req, res) => {
  const items = (await db.prepare('SELECT json FROM banners ORDER BY updated_at DESC').all()).map(parse);
  res.json({ items });
});

router.get('/banners/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM banners WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  res.json(parse(row));
});

router.post('/banners', requireAdmin, async (req, res) => {
  const b = req.body || {};
  if (!b.title) return res.status(400).json({ error: 'invalid_input', message: 'عنوان بنر الزامی است' });
  const id = b.id || uid('bn');
  const banner = { active: true, position: 'home', ...b, id };
  (await db.prepare('INSERT INTO banners(id, json, updated_at) VALUES(?, ?, ?)').run(id, JSON.stringify(banner), nowIso()));
  res.status(201).json(banner);
});

router.put('/banners/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM banners WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const updated = { ...parse(row), ...req.body, id: req.params.id };
  (await db.prepare('UPDATE banners SET json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(updated), nowIso(), req.params.id));
  res.json(updated);
});

router.delete('/banners/:id', requireAdmin, async (req, res) => {
  const info = (await db.prepare('DELETE FROM banners WHERE id = ?').run(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

// ─── پست‌های وبلاگ ──────────────────────────────────────────────────────────
router.get('/posts', requireAdmin, async (_req, res) => {
  const [articleRows, postRows] = await Promise.all([
    db.prepare('SELECT json FROM articles ORDER BY updated_at DESC').all(),
    db.prepare('SELECT json FROM posts ORDER BY updated_at DESC').all(),
  ]);
  const articles = articleRows.map(parse).map((article) => ({
    ...article,
    category: article.category || article.cat || '',
    published: article.published ?? true,
  }));
  const items = [...postRows.map(parse), ...articles];
  res.json({ items });
});

router.get('/posts/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM posts WHERE id = ?').get(req.params.id));
  if (row) return res.json(parse(row));
  const articleRow = (await db.prepare('SELECT json FROM articles WHERE id = ?').get(req.params.id));
  if (!articleRow) return res.status(404).json({ error: 'not_found' });
  const article = parse(articleRow);
  res.json({
    ...article,
    category: article.category || article.cat || '',
    published: article.published ?? true,
  });
});

router.post('/posts', requireAdmin, async (req, res) => {
  const p = req.body || {};
  if (!p.title) return res.status(400).json({ error: 'invalid_input', message: 'عنوان پست الزامی است' });
  const id = p.id || uid('pst');
  const post = { published: true, views: 0, comments: 0, ...p, id };
  (await db.prepare('INSERT INTO posts(id, json, updated_at) VALUES(?, ?, ?)').run(id, JSON.stringify(post), nowIso()));
  res.status(201).json(post);
});

router.put('/posts/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM posts WHERE id = ?').get(req.params.id));
  if (row) {
    const updated = { ...parse(row), ...req.body, id: req.params.id };
    (await db.prepare('UPDATE posts SET json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(updated), nowIso(), req.params.id));
    return res.json(updated);
  }
  const articleRow = (await db.prepare('SELECT json FROM articles WHERE id = ?').get(req.params.id));
  if (!articleRow) return res.status(404).json({ error: 'not_found' });
  const updated = { ...parse(articleRow), ...req.body, id: req.params.id };
  if (req.body?.category !== undefined) {
    updated.cat = req.body.category;
    delete updated.category;
  }
  (await db.prepare('UPDATE articles SET json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(updated), nowIso(), req.params.id));
  res.json({ ...updated, category: updated.cat || '' });
});

router.delete('/posts/:id', requireAdmin, async (req, res) => {
  const info = (await db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id));
  if (!info.changes) {
    const articleInfo = await db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
    if (articleInfo.changes) return res.json({ ok: true });
  }
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

export default router;