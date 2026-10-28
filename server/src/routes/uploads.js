import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import { config } from '../config.js';
import { db } from '../db.js';
import { uid, nowIso } from '../util.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const uploadDir = config.imageUploadDir;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.mimetype);
    cb(ok ? null : new Error('invalid_mime'), ok);
  },
});

const VARIANTS = [
  { name: 'thumb', width: 200 },
  { name: 'medium', width: 800 },
  { name: 'large', width: 1600 },
];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

router.post('/products/:id/images', requireAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file', message: 'فایل تصویر الزامی است' });
  const productId = req.params.id;
  const row = await db.prepare('SELECT json FROM products WHERE id = ?').get(productId);
  if (!row) return res.status(404).json({ error: 'not_found', message: 'محصول یافت نشد' });

  const id = uid('img');
  const baseDir = path.join(uploadDir, productId);
  await ensureDir(baseDir);
  const urls = {};
  for (const v of VARIANTS) {
    const filename = `${id}-${v.name}.webp`;
    const outPath = path.join(baseDir, filename);
    await sharp(req.file.buffer)
      .resize({ width: v.width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(outPath);
    urls[v.name] = `/images/${productId}/${filename}`;
  }

  const product = JSON.parse(row.json);
  const images = Array.isArray(product.images) ? product.images : (product.image ? [{ url: product.image }] : []);
  const entry = {
    id,
    url: urls.large,
    thumb: urls.thumb,
    medium: urls.medium,
    alt: req.body?.alt || product.name || '',
    createdAt: nowIso(),
  };
  images.push(entry);
  if (!product.image) product.image = urls.large;
  product.images = images;
  await db.prepare('UPDATE products SET json = ?, updated_at = ? WHERE id = ?')
    .run(JSON.stringify(product), nowIso(), productId);
  res.status(201).json({ image: entry, urls });
});

router.delete('/products/:id/images/:imageId', requireAdmin, async (req, res) => {
  const productId = req.params.id;
  const imageId = req.params.imageId;
  const row = await db.prepare('SELECT json FROM products WHERE id = ?').get(productId);
  if (!row) return res.status(404).json({ error: 'not_found' });
  const product = JSON.parse(row.json);
  const images = Array.isArray(product.images) ? product.images : [];
  const target = images.find((i) => i.id === imageId);
  if (!target) return res.status(404).json({ error: 'not_found' });
  for (const v of ['thumb', 'medium', 'large']) {
    const url = v === 'large' ? target.url : target[v];
    if (url) {
      const filePath = path.join(uploadDir, url.replace(/^\/images\//, ''));
      await fs.unlink(filePath).catch(() => {});
    }
  }
  product.images = images.filter((i) => i.id !== imageId);
  if (product.image === target.url) product.image = product.images[0]?.url || '';
  await db.prepare('UPDATE products SET json = ?, updated_at = ? WHERE id = ?')
    .run(JSON.stringify(product), nowIso(), productId);
  res.json({ ok: true });
});

export default router;
