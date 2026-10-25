import { Router } from 'express';
import { db, getSetting, setSetting } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// ─── تنظیمات فروشگاه ───────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  const settings = await getSetting('store') || {};
  const banners = (await db.prepare('SELECT json FROM banners ORDER BY updated_at DESC').all())
    .map((row) => JSON.parse(row.json))
    .filter((banner) => banner.active && (!banner.expiresAt || new Date(banner.expiresAt) >= new Date()));
  res.json({ ...settings, banners });
});

// فقط ادمین اجازه تغییر تنظیمات را دارد
router.put('/', requireAdmin, async (req, res) => {
  const current = await getSetting('store') || {};
  const { banners: _banners, ...patch } = req.body || {};
  const updated = { ...current, ...patch };
  for (const key of ['freeShippingThreshold', 'shippingCost', 'vatRate', 'levyRate', 'gatewayFee', 'packagingCost']) {
    if (updated[key] !== undefined && (!Number.isFinite(Number(updated[key])) || Number(updated[key]) < 0)) {
      return res.status(400).json({ error: 'invalid_input', message: `مقدار ${key} نامعتبر است` });
    }
    if (updated[key] !== undefined) updated[key] = Number(updated[key]);
  }
  await setSetting('store', updated);
  const banners = (await db.prepare('SELECT json FROM banners ORDER BY updated_at DESC').all())
    .map((row) => JSON.parse(row.json))
    .filter((banner) => banner.active && (!banner.expiresAt || new Date(banner.expiresAt) >= new Date()));
  res.json({ ...updated, banners });
});

export default router;
