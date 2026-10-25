import { Router } from 'express';
import { db } from '../db.js';
import { uid, nowIso } from '../util.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const parse = (row) => JSON.parse(row.json);
const validDiscount = (discount) => (
  Boolean(String(discount.code || '').trim())
  && ['percent', 'fixed'].includes(discount.type)
  && Number.isFinite(Number(discount.value))
  && Number(discount.value) > 0
  && (discount.type !== 'percent' || Number(discount.value) <= 100)
  && Number.isInteger(Number(discount.maxUses))
  && Number(discount.maxUses) > 0
  && !Number.isNaN(Date.parse(discount.expiresAt))
);

// ─── کدهای تخفیف ───────────────────────────────────────────────────────────
// اعتبارسنجی عمومی برای صفحه سبد خرید
// POST /api/discounts/validate { code, subtotal }
router.post('/validate', async (req, res) => {
  const code = String(req.body?.code || '').toUpperCase().trim();
  const subtotal = req.body?.subtotal === undefined ? 0 : Number(req.body.subtotal);
  if (!Number.isFinite(subtotal) || subtotal < 0) {
    return res.status(400).json({ error: 'invalid_input', message: 'مبلغ سبد خرید نامعتبر است' });
  }

  const row = (await db.prepare('SELECT json, active FROM discount_codes WHERE code = ?').get(code));
  if (!row) return res.status(404).json({ error: 'not_found', message: 'کد تخفیف نامعتبر است' });

  const c = parse(row);
  if (!row.active || !c.active) return res.status(400).json({ error: 'inactive', message: 'کد تخفیف غیرفعال است' });
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return res.status(400).json({ error: 'expired', message: 'کد تخفیف منقضی شده است' });
  if ((c.usedCount ?? 0) >= (c.maxUses ?? 0)) return res.status(400).json({ error: 'max_uses', message: 'ظرفیت کد تخفیف تکمیل شده' });

  const amount = c.type === 'percent' ? Math.round((subtotal * c.value) / 100) : Math.min(c.value, subtotal);
  res.json({ ok: true, code: c, amount });
});

// CRUD ادمین
router.get('/', requireAdmin, async (_req, res) => {
  res.json({ items: (await db.prepare('SELECT json FROM discount_codes').all()).map(parse) });
});

router.post('/', requireAdmin, async (req, res) => {
  const c = req.body || {};
  const item = { usedCount: 0, active: true, ...c, code: String(c.code || '').toUpperCase().trim() };
  if (!validDiscount(item)) return res.status(400).json({ error: 'invalid_input', message: 'اطلاعات کد تخفیف نامعتبر است' });
  const id = c.id || uid('dc');
  item.id = id;
  if ((await db.prepare('SELECT id FROM discount_codes WHERE code = ?').get(item.code))) {
    return res.status(409).json({ error: 'duplicate_code', message: 'این کد تخفیف قبلاً ثبت شده است' });
  }
  (await db.prepare('INSERT INTO discount_codes(id, code, active, json) VALUES(?, ?, ?, ?)')
    .run(id, item.code, item.active ? 1 : 0, JSON.stringify(item)));
  res.status(201).json(item);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM discount_codes WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const updated = { ...parse(row), ...req.body, id: req.params.id };
  updated.code = String(updated.code || '').toUpperCase().trim();
  if (!validDiscount(updated)) return res.status(400).json({ error: 'invalid_input', message: 'اطلاعات کد تخفیف نامعتبر است' });
  if ((await db.prepare('SELECT id FROM discount_codes WHERE code = ? AND id != ?').get(updated.code, req.params.id))) {
    return res.status(409).json({ error: 'duplicate_code', message: 'این کد تخفیف قبلاً ثبت شده است' });
  }
  (await db.prepare('UPDATE discount_codes SET code = ?, active = ?, json = ? WHERE id = ?')
    .run(String(updated.code).toUpperCase(), updated.active ? 1 : 0, JSON.stringify(updated), req.params.id));
  res.json(updated);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const info = (await db.prepare('DELETE FROM discount_codes WHERE id = ?').run(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

export default router;
