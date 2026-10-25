import { Router } from 'express';
import { db } from '../db.js';
import { uid, nowIso } from '../util.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const parse = (row) => JSON.parse(row.json);

// ─── فروشندگان ──────────────────────────────────────────────────────────────
router.get('/', requireAdmin, async (_req, res) => {
  const items = (await db.prepare('SELECT json FROM vendors ORDER BY updated_at DESC').all()).map(parse);
  res.json({ items });
});

router.get('/settlements', requireAdmin, async (_req, res) => {
  const items = (await db.prepare('SELECT json FROM vendor_settlements ORDER BY created_at DESC').all()).map(parse);
  res.json({ items });
});

router.post('/:id/settlements', requireAdmin, async (req, res) => {
  const reference = String(req.body?.reference || '').trim();
  if (!reference || reference.length > 120) {
    return res.status(400).json({ error: 'invalid_input', message: 'شماره پیگیری معتبر الزامی است' });
  }

  const t = nowIso();
  const id = uid('vst');
  (await db.exec('BEGIN IMMEDIATE'));
  try {
    const row = (await db.prepare('SELECT json FROM vendors WHERE id = ? FOR UPDATE').get(req.params.id));
    if (!row) {
      (await db.exec('ROLLBACK'));
      return res.status(404).json({ error: 'not_found' });
    }
    const vendor = parse(row);
    const amount = Number(vendor.balance);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      (await db.exec('ROLLBACK'));
      return res.status(409).json({ error: 'no_balance', message: 'مانده قابل تسویه‌ای برای این فروشنده وجود ندارد' });
    }

    const updatedVendor = { ...vendor, balance: 0 };
    const settlement = { id, vendorId: req.params.id, amount, reference, createdAt: t };
    (await db.prepare('UPDATE vendors SET json = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(updatedVendor), t, req.params.id));
    (await db.prepare('INSERT INTO vendor_settlements(id, vendor_id, amount, reference, json, created_at) VALUES(?, ?, ?, ?, ?, ?)')
      .run(id, req.params.id, amount, reference, JSON.stringify(settlement), t));
    (await db.exec('COMMIT'));
    res.status(201).json({ vendor: updatedVendor, settlement });
  } catch (error) {
    (await db.exec('ROLLBACK'));
    throw error;
  }
});

router.post('/', requireAdmin, async (req, res) => {
  const v = req.body || {};
  if (!v.name) return res.status(400).json({ error: 'invalid_input', message: 'نام فروشنده الزامی است' });
  const id = v.id || uid('v');
  const vendor = { active: true, totalSales: 0, totalItems: 0, totalOrders: 0, balance: 0, fee: 10, ...v, id };
  (await db.prepare('INSERT INTO vendors(id, json, updated_at) VALUES(?, ?, ?)').run(id, JSON.stringify(vendor), nowIso()));
  res.status(201).json(vendor);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM vendors WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const updated = { ...parse(row), ...req.body, id: req.params.id };
  (await db.prepare('UPDATE vendors SET json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(updated), nowIso(), req.params.id));
  res.json(updated);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const info = (await db.prepare('DELETE FROM vendors WHERE id = ?').run(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

export default router;