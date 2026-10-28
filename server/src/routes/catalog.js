import { Router } from 'express';
import { db, getSetting, setSetting } from '../db.js';
import { uid, nowIso } from '../util.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

const parse = (row) => (row ? JSON.parse(row.json) : null);

// ─── دسته‌بندی‌ها و برندها ─────────────────────────────────────────────────
router.get('/meta', async (_req, res) => {
  const meta = await getSetting('meta') || { categories: [], brands: [] };
  res.json(meta);
});

router.put('/meta', requireAdmin, async (req, res) => {
  const { categories, brands } = req.body || {};
  if (!Array.isArray(categories) || categories.length === 0 || !Array.isArray(brands)) {
    return res.status(400).json({ error: 'invalid_meta', message: 'دسته‌بندی‌ها و برندها باید به‌صورت فهرست ارسال شوند' });
  }
  const categoryIds = new Set();
  const subcategoryIds = new Set();
  for (const category of categories) {
    if (!category || typeof category.id !== 'string' || !category.id.trim()
      || typeof category.name !== 'string' || !category.name.trim()
      || typeof category.icon !== 'string' || !Array.isArray(category.subs)) {
      return res.status(400).json({ error: 'invalid_category', message: 'اطلاعات یکی از دسته‌بندی‌ها معتبر نیست' });
    }
    if (categoryIds.has(category.id)) {
      return res.status(400).json({ error: 'duplicate_category', message: 'شناسه دسته‌بندی تکراری است' });
    }
    categoryIds.add(category.id);
    for (const sub of category.subs) {
      if (!sub || typeof sub.id !== 'string' || !sub.id.trim()
        || typeof sub.name !== 'string' || !sub.name.trim()) {
        return res.status(400).json({ error: 'invalid_subcategory', message: 'اطلاعات یکی از زیردسته‌ها معتبر نیست' });
      }
      if (subcategoryIds.has(sub.id)) {
        return res.status(400).json({ error: 'duplicate_subcategory', message: 'شناسه زیردسته تکراری است' });
      }
      subcategoryIds.add(sub.id);
    }
  }
  if (brands.some((brand) => typeof brand !== 'string' || !brand.trim())) {
    return res.status(400).json({ error: 'invalid_brands', message: 'فهرست برندها معتبر نیست' });
  }

  const current = await getSetting('meta') || {};
  const updated = { ...current, categories, brands };
  await setSetting('meta', updated);
  res.json(updated);
});

// ─── لیست محصولات (عمومی) ──────────────────────────────────────────────────
router.get('/products', (req, res, next) => {
  if (req.query.includeInactive === 'true') return requireAdmin(req, res, next);
  next();
}, async (req, res) => {
  const { category, subcategory, brand, search, inStock, sort, limit, offset } = req.query;
  const conditions = [];
  const params = [];
  const addCondition = (condition, value) => {
    params.push(value);
    conditions.push(condition.replace('?', `$${params.length}`));
  };
  if (req.query.includeInactive !== 'true') {
    conditions.push(`COALESCE((json::jsonb ->> 'effective')::boolean, true) = true`);
  }
  if (category) addCondition(`json::jsonb ->> 'category' = ?`, String(category));
  if (subcategory) addCondition(`json::jsonb ->> 'subcategory' = ?`, String(subcategory));
  if (brand) addCondition(`json::jsonb ->> 'brand' = ?`, String(brand));
  if (inStock === 'true') conditions.push(`COALESCE((json::jsonb ->> 'stock')::numeric, 0) > 0`);
  const searchTerm = String(search || '').trim().toLowerCase();
  if (searchTerm) {
    const value = `%${searchTerm}%`;
    params.push(value, value);
    conditions.push(`(
      LOWER(COALESCE(json::jsonb ->> 'name', '')) LIKE $${params.length - 1}
      OR LOWER(COALESCE(json::jsonb ->> 'sku', '')) LIKE $${params.length}
    )`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sortSql = {
    'price-asc': `(json::jsonb ->> 'price')::numeric ASC`,
    'price-desc': `(json::jsonb ->> 'price')::numeric DESC`,
    sales: `COALESCE((json::jsonb ->> 'sales')::numeric, 0) DESC`,
    newest: `COALESCE((json::jsonb ->> 'isNew')::boolean, false) DESC`,
  }[String(sort)] || '';
  const total = Number((await db.prepare(`SELECT COUNT(*) AS total FROM products ${where}`).all(...params))[0].total);
  const pageParams = [...params];
  let pageSql = `SELECT json FROM products ${where}${sortSql ? ` ORDER BY ${sortSql}` : ''}`;
  if (limit !== undefined || offset !== undefined) {
    const requestedOffset = Number(offset) || 0;
    const requestedLimit = limit === undefined ? null : Number(limit);
    if ((requestedLimit !== null && (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1))
      || !Number.isSafeInteger(requestedOffset) || requestedOffset < 0) {
      return res.status(400).json({ error: 'invalid_pagination', message: 'محدوده صفحه‌بندی معتبر نیست' });
    }
    if (requestedLimit !== null) {
      pageParams.push(Math.min(requestedLimit, 1000));
      pageSql += ` LIMIT $${pageParams.length}`;
    }
    pageParams.push(requestedOffset);
    pageSql += ` OFFSET $${pageParams.length}`;
  }
  const items = (await db.prepare(pageSql).all(...pageParams)).map(parse);
  res.json({ total, items });
});

router.get('/products/:id', async (req, res) => {
  const row = (await db.prepare('SELECT json FROM products WHERE id = ? OR slug = ?').get(req.params.id, req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const product = parse(row);
  if (product.effective === false) return res.status(404).json({ error: 'not_found' });
  res.json(product);
});

// ─── مدیریت محصولات (ادمین) ────────────────────────────────────────────────
router.post('/products', requireAdmin, async (req, res) => {
  const p = req.body || {};
  if (!p.name || !Number.isFinite(Number(p.price)) || Number(p.price) <= 0) {
    return res.status(400).json({ error: 'invalid_input', message: 'نام و قیمت معتبر محصول الزامی است' });
  }
  const id = p.id || uid('p');
  const product = { id, sales: 0, rating: 0, isNew: true, effective: true, ...p, id };
  const slug = String(product.sku || id).trim();
  if ((await db.prepare('SELECT id FROM products WHERE slug = ?').get(slug))) {
    return res.status(409).json({ error: 'duplicate_sku', message: 'کد محصول تکراری است' });
  }
  (await db.prepare('INSERT INTO products(id, slug, json, updated_at) VALUES(?, ?, ?, ?)')
    .run(id, slug, JSON.stringify(product), nowIso()));
  res.status(201).json(product);
});

router.put('/products/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM products WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const updated = { ...JSON.parse(row.json), ...req.body, id: req.params.id };
  if (!updated.name || !Number.isFinite(Number(updated.price)) || Number(updated.price) <= 0) {
    return res.status(400).json({ error: 'invalid_input', message: 'نام و قیمت معتبر محصول الزامی است' });
  }
  const slug = String(updated.sku || req.params.id).trim();
  if ((await db.prepare('SELECT id FROM products WHERE slug = ? AND id != ?').get(slug, req.params.id))) {
    return res.status(409).json({ error: 'duplicate_sku', message: 'کد محصول تکراری است' });
  }
  (await db.prepare('UPDATE products SET slug = ?, json = ?, updated_at = ? WHERE id = ?')
    .run(slug, JSON.stringify(updated), nowIso(), req.params.id));
  res.json(updated);
});

router.delete('/products/:id', requireAdmin, async (req, res) => {
  const info = (await db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

export default router;
