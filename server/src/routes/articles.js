import { Router } from 'express';
import { db } from '../db.js';
import { uid, nowIso } from '../util.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const parse = (row) => JSON.parse(row.json);

// ─── مقالات وبلاگ ──────────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  const articles = (await db.prepare('SELECT json FROM articles').all()).map(parse);
  const posts = (await db.prepare('SELECT json FROM posts').all()).map(parse)
    .filter((post) => post.published)
    .map((post) => ({
      ...post,
      summary: post.summary || post.title,
      cat: post.category || '',
      readTime: post.readTime || '',
      colors: [post.color1 || '#667eea', post.color2 || '#764ba2'],
      target: post.target || 'all',
      tags: post.tags || [],
    }));
  const items = [...articles, ...posts];
  res.json({ items });
});

router.get('/:id', async (req, res) => {
  const row = (await db.prepare('SELECT json FROM articles WHERE id = ?').get(req.params.id));
  if (row) return res.json(parse(row));
  const post = (await db.prepare('SELECT json FROM posts WHERE id = ?').get(req.params.id));
  if (!post) return res.status(404).json({ error: 'not_found' });
  const article = parse(post);
  if (!article.published) return res.status(404).json({ error: 'not_found' });
  res.json({
    ...article,
    summary: article.summary || article.title,
    cat: article.category || '',
    readTime: article.readTime || '',
    colors: [article.color1 || '#667eea', article.color2 || '#764ba2'],
    target: article.target || 'all',
    tags: article.tags || [],
  });
});

router.post('/', requireAdmin, async (req, res) => {
  const a = req.body || {};
  if (!a.title) return res.status(400).json({ error: 'invalid_input', message: 'عنوان الزامی است' });
  const id = a.id || uid('a');
  const article = { views: 0, ...a, id };
  (await db.prepare('INSERT INTO articles(id, json, updated_at) VALUES(?, ?, ?)').run(id, JSON.stringify(article), nowIso()));
  res.status(201).json(article);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM articles WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const updated = { ...parse(row), ...req.body, id: req.params.id };
  (await db.prepare('UPDATE articles SET json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(updated), nowIso(), req.params.id));
  res.json(updated);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const info = (await db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

export default router;
