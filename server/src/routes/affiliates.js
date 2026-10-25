import { Router } from 'express';
import { db } from '../db.js';
import { uid, nowIso, normalizePhone } from '../util.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const parse = (row) => JSON.parse(row.json);
const commissionHasValidOrder = (alias = 'ac') => `EXISTS (
  SELECT 1 FROM orders o WHERE o.id = ${alias}.order_id
)`;

async function affiliateCode(refCode) {
  return (await db.prepare('SELECT id, json FROM affiliates').all())
    .map((row) => ({ id: row.id, ...JSON.parse(row.json) }))
    .find((affiliate) => String(affiliate.refCode || '').toUpperCase() === refCode.toUpperCase());
}

async function affiliateMetrics(id) {
  const clicks = (await db.prepare('SELECT COUNT(*) AS count FROM affiliate_clicks WHERE affiliate_id = ?').get(id)).count;
  const commissions = (await db.prepare(
    `SELECT COUNT(*) AS orders, COALESCE(SUM(ac.sale_amount), 0) AS sales,
            COALESCE(SUM(CASE WHEN ac.review_status != 'rejected' THEN ac.commission_amount ELSE 0 END), 0) AS commission,
            COALESCE(SUM(CASE WHEN ac.status = 'pending' AND ac.payout_id IS NULL
              AND ac.review_status IN ('none', 'approved') AND ${commissionHasValidOrder()}
              THEN ac.commission_amount ELSE 0 END), 0) AS "availableCommission",
            COALESCE(SUM(CASE WHEN ac.status = 'pending' AND ac.review_status = 'review'
              THEN ac.commission_amount ELSE 0 END), 0) AS "reviewRequiredCommission"
     FROM affiliate_commissions ac WHERE ac.affiliate_id = ?`
  ).get(id));
  return { clicks, ...commissions };
}

async function availableCommission(affiliateId) {
  return (await db.prepare(
    `SELECT COALESCE(SUM(ac.commission_amount), 0) AS amount
     FROM affiliate_commissions ac
     WHERE ac.affiliate_id = ? AND ac.status = 'pending' AND ac.payout_id IS NULL
       AND ac.review_status IN ('none', 'approved') AND ${commissionHasValidOrder()}`
  ).get(affiliateId)).amount;
}

// Public attribution endpoint. Last valid click replaces the visitor's active attribution.
router.post('/track', async (req, res) => {
  const refCode = String(req.body?.refCode || '').trim();
  const visitorId = String(req.body?.visitorId || '');
  if (!/^[a-zA-Z0-9_-]{2,32}$/.test(refCode) || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitorId)) {
    return res.status(400).json({ error: 'invalid_input', message: 'کد معرف یا شناسه بازدید معتبر نیست' });
  }
  const affiliate = await affiliateCode(refCode);
  if (!affiliate || !affiliate.active) {
    return res.status(404).json({ error: 'affiliate_unavailable', message: 'کد معرف فعال یافت نشد' });
  }

  const configRow = (await db.prepare('SELECT value FROM aff_config WHERE key = ?').get('config'));
  const config = configRow ? JSON.parse(configRow.value) : {};
  const cookieDays = Number.isInteger(config.cookieDays) && config.cookieDays > 0 ? config.cookieDays : 30;
  const now = nowIso();
  const expiresAt = new Date(Date.now() + cookieDays * 24 * 60 * 60 * 1000).toISOString();
  (await db.exec('BEGIN IMMEDIATE'));
  try {
    (    await db.prepare(
      `INSERT INTO affiliate_clicks(visitor_id, affiliate_id, clicked_at) VALUES(?, ?, ?)
       ON CONFLICT(visitor_id, affiliate_id) DO NOTHING`
    )
      .run(visitorId, affiliate.id, now));
    (await db.prepare(
      `INSERT INTO affiliate_visits(visitor_id, affiliate_id, first_seen_at, last_seen_at, expires_at)
       VALUES(?, ?, ?, ?, ?)
       ON CONFLICT(visitor_id) DO UPDATE SET affiliate_id = excluded.affiliate_id,
         last_seen_at = excluded.last_seen_at, expires_at = excluded.expires_at`
    ).run(visitorId, affiliate.id, now, now, expiresAt));
    (await db.exec('COMMIT'));
  } catch (error) {
    (await db.exec('ROLLBACK'));
    throw error;
  }
  res.json({ ok: true, refCode: affiliate.refCode, expiresAt });
});

// ─── بازاریابان (افیلیت) ──────────────────────────────────────────────────────
router.get('/affiliates', requireAdmin, async (_req, res) => {
  const rows = await db.prepare('SELECT id, json FROM affiliates ORDER BY updated_at DESC').all();
  const items = await Promise.all(rows.map(async (row) => ({
    ...parse(row),
    ...await affiliateMetrics(row.id),
  })));
  res.json({ items });
});

router.post('/affiliates', requireAdmin, async (req, res) => {
  const a = req.body || {};
  const name = String(a.name || '').trim();
  const mobile = normalizePhone(a.mobile);
  const level = ['silver', 'gold', 'platinum'].includes(a.level) ? a.level : 'silver';
  if (!name || !mobile) return res.status(400).json({ error: 'invalid_input', message: 'نام و شماره موبایل معتبر بازاریاب الزامی است' });
  const id = typeof a.id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(a.id) ? a.id : uid('af');
  const refCode = typeof a.refCode === 'string' && /^[a-zA-Z0-9_-]{2,32}$/.test(a.refCode)
    ? a.refCode.toUpperCase()
    : `AF${id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;
  if ((await db.prepare('SELECT id FROM affiliates WHERE id = ?').get(id))) {
    return res.status(409).json({ error: 'affiliate_id_exists', message: 'شناسه بازاریاب قبلاً استفاده شده است' });
  }
  if (await affiliateCode(refCode)) return res.status(409).json({ error: 'ref_code_exists', message: 'این کد معرف قبلاً استفاده شده است' });
  const affiliate = { name, mobile, refCode, level, clicks: 0, orders: 0, sales: 0, commission: 0, active: true, flagged: false, id };
  (await db.prepare('INSERT INTO affiliates(id, json, updated_at) VALUES(?, ?, ?)').run(id, JSON.stringify(affiliate), nowIso()));
  res.status(201).json(affiliate);
});

router.put('/affiliates/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM affiliates WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const current = parse(row);
  const name = req.body?.name === undefined ? current.name : String(req.body.name).trim();
  const mobile = req.body?.mobile === undefined ? current.mobile : normalizePhone(req.body.mobile);
  const level = req.body?.level === undefined ? current.level : req.body.level;
  if (!name || !mobile || !['silver', 'gold', 'platinum'].includes(level)
    || (req.body?.active !== undefined && typeof req.body.active !== 'boolean')
    || (req.body?.flagged !== undefined && typeof req.body.flagged !== 'boolean')) {
    return res.status(400).json({ error: 'invalid_input', message: 'مشخصات بازاریاب معتبر نیست' });
  }
  const updated = {
    ...current, name, mobile, level,
    active: req.body?.active === undefined ? current.active : req.body.active,
    flagged: req.body?.flagged === undefined ? current.flagged : req.body.flagged,
    id: req.params.id,
  };
  (await db.prepare('UPDATE affiliates SET json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(updated), nowIso(), req.params.id));
  res.json({ ...updated, ...await affiliateMetrics(req.params.id) });
});

router.delete('/affiliates/:id', requireAdmin, async (req, res) => {
  if ((await db.prepare('SELECT id FROM affiliate_commissions WHERE affiliate_id = ? LIMIT 1').get(req.params.id))
    || (await db.prepare('SELECT visitor_id FROM affiliate_visits WHERE affiliate_id = ? LIMIT 1').get(req.params.id))) {
    return res.status(409).json({ error: 'affiliate_in_use', message: 'بازاریابی که سابقه انتساب یا پورسانت دارد قابل حذف نیست؛ آن را غیرفعال کنید' });
  }
  const info = (await db.prepare('DELETE FROM affiliates WHERE id = ?').run(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

// ─── تسویه‌های پورسانت ──────────────────────────────────────────────────────
router.get('/payouts', requireAdmin, async (_req, res) => {
  const items = (await db.prepare(
    `SELECT p.json,
            EXISTS (
              SELECT 1 FROM affiliate_commissions ac
              WHERE ac.payout_id = p.id AND ac.status = 'pending' AND ac.review_status = 'review'
            ) AS review_required
     FROM payouts p ORDER BY p.created_at DESC`
  ).all())
    .map((row) => ({ ...parse(row), reviewRequired: Boolean(row.review_required) }))
    .filter((payout) => payout.source === 'affiliate_commission');
  res.json({ items });
});

router.get('/commissions/review', requireAdmin, async (_req, res) => {
  const items = (await db.prepare(
    `SELECT ac.id, ac.affiliate_id AS "affiliateId", ac.order_id AS "orderId",
            ac.sale_amount AS "saleAmount", ac.commission_amount AS "commissionAmount",
            ac.payout_id AS "payoutId", ac.created_at AS "createdAt",
            a.json AS affiliate_json, o.json AS order_json,
            COALESCE((o.json::jsonb ->> 'refundedAmount')::integer, 0) AS "refundedAmount"
     FROM affiliate_commissions ac
     JOIN affiliates a ON a.id = ac.affiliate_id
     JOIN orders o ON o.id = ac.order_id
     WHERE ac.status = 'pending' AND ac.review_status = 'review'
     ORDER BY ac.created_at ASC`
  ).all()).map((row) => {
    const affiliate = JSON.parse(row.affiliate_json);
    const order = JSON.parse(row.order_json);
    return {
      id: row.id,
      affiliateId: row.affiliateId,
      affiliateName: affiliate.name,
      orderId: row.orderId,
      orderCode: order.code,
      saleAmount: row.saleAmount,
      commissionAmount: row.commissionAmount,
      refundedAmount: row.refundedAmount,
      payoutId: row.payoutId,
      createdAt: row.createdAt,
    };
  });
  res.json({ items });
});

router.put('/commissions/:id/review', requireAdmin, async (req, res) => {
  const decision = req.body?.decision;
  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: 'invalid_review_decision', message: 'نتیجه بررسی باید تأیید یا رد استحقاق باشد' });
  }
  const timestamp = nowIso();
  (await db.exec('BEGIN IMMEDIATE'));
  try {
    const commission = (await db.prepare(
      `SELECT id, affiliate_id, order_id, commission_amount, status, review_status, payout_id
       FROM affiliate_commissions WHERE id = ? FOR UPDATE`
    ).get(req.params.id));
    if (!commission) {
      (await db.exec('ROLLBACK'));
      return res.status(404).json({ error: 'not_found' });
    }
    if (commission.status !== 'pending' || commission.review_status !== 'review') {
      (await db.exec('ROLLBACK'));
      return res.status(409).json({ error: 'commission_not_pending_review', message: 'این پورسانت در انتظار بررسی نیست' });
    }
    if (commission.payout_id) {
      (await db.exec('ROLLBACK'));
      return res.status(409).json({
        error: 'payout_release_required',
        message: 'ابتدا تسویه در انتظار مرتبط را رد کنید تا پورسانت برای بررسی آزاد شود',
      });
    }

    (await db.prepare(
      'UPDATE affiliate_commissions SET review_status = ?, reviewed_at = ?, reviewed_by = ?, updated_at = ? WHERE id = ?'
    ).run(decision, timestamp, req.user.username, timestamp, commission.id));
    const auditId = uid('log');
    (await db.prepare('INSERT INTO audit_log(id, json, created_at) VALUES(?, ?, ?)')
      .run(auditId, JSON.stringify({
        id: auditId,
        action: decision === 'approved' ? 'تأیید پورسانت سفارش مرجوعی' : 'رد استحقاق پورسانت سفارش مرجوعی',
        actor: req.user.username,
        role: req.user.roleName,
        target: commission.id,
        severity: decision === 'approved' ? 'info' : 'warning',
        at: timestamp,
      }), timestamp));
    (await db.exec('COMMIT'));
    return res.json({ ok: true, id: commission.id, decision, reviewedAt: timestamp, reviewedBy: req.user.username });
  } catch (error) {
    (await db.exec('ROLLBACK'));
    throw error;
  }
});

router.post('/payouts', requireAdmin, async (req, res) => {
  const p = req.body || {};
  const amount = Number(p.amount);
  if (typeof p.affiliateId !== 'string' || !Number.isSafeInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: 'invalid_input', message: 'بازاریاب و مبلغ صحیح تسویه الزامی است' });
  }
  const affiliate = (await db.prepare('SELECT id FROM affiliates WHERE id = ?').get(p.affiliateId));
  if (!affiliate) return res.status(404).json({ error: 'affiliate_not_found', message: 'بازاریاب یافت نشد' });
  const configRow = (await db.prepare('SELECT value FROM aff_config WHERE key = ?').get('config'));
  const minWithdraw = Number(configRow ? JSON.parse(configRow.value).minWithdraw : 0);
  const id = typeof p.id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(p.id) ? p.id : uid('po');
  const date = nowIso();
  const payout = { id, source: 'affiliate_commission', affiliateId: p.affiliateId, amount, status: 'pending', tracking: '', date };
  (await db.exec('BEGIN IMMEDIATE'));
  try {
    await db.prepare(
      `SELECT id FROM affiliate_commissions
       WHERE affiliate_id = ? AND status = 'pending' AND payout_id IS NULL
         AND review_status IN ('none', 'approved')
       FOR UPDATE`
    ).all(p.affiliateId);
    const available = await availableCommission(p.affiliateId);
    if (amount < minWithdraw || amount !== available) {
      (await db.exec('ROLLBACK'));
      return res.status(409).json({ error: 'payout_amount_mismatch', message: `مبلغ تسویه باید برابر موجودی قابل تسویه (${available}) و حداقل برداشت باشد` });
    }
    (await db.prepare('INSERT INTO payouts(id, json, created_at, updated_at) VALUES(?, ?, ?, ?)')
      .run(id, JSON.stringify(payout), date, date));
    (await db.prepare(
      `UPDATE affiliate_commissions SET payout_id = ?, updated_at = ?
       WHERE affiliate_id = ? AND status = 'pending' AND payout_id IS NULL
         AND review_status IN ('none', 'approved')
         AND ${commissionHasValidOrder('affiliate_commissions')}`
    ).run(id, date, p.affiliateId));
    (await db.exec('COMMIT'));
  } catch (error) {
    (await db.exec('ROLLBACK'));
    throw error;
  }
  res.status(201).json(payout);
});

router.put('/payouts/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM payouts WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const current = parse(row);
  if (current.status !== 'pending') {
    return res.status(409).json({ error: 'payout_finalized', message: 'تسویه نهایی‌شده قابل ویرایش نیست' });
  }
  if (current.source !== 'affiliate_commission') {
    return res.status(409).json({ error: 'legacy_payout', message: 'این رکورد قدیمی به پورسانت‌های قابل تسویه متصل نیست' });
  }
  const status = req.body?.status;
  const tracking = String(req.body?.tracking || '').trim();
  if (!['paid', 'rejected'].includes(status) || (status === 'paid' && !tracking)) {
    return res.status(400).json({ error: 'invalid_input', message: 'وضعیت پرداخت یا شماره پیگیری معتبر نیست' });
  }
  const now = nowIso();
  (await db.exec('BEGIN IMMEDIATE'));
  try {
    const latestRow = await db.prepare('SELECT json FROM payouts WHERE id = ? FOR UPDATE').get(req.params.id);
    if (!latestRow) {
      await db.exec('ROLLBACK');
      return res.status(404).json({ error: 'not_found' });
    }
    const latest = parse(latestRow);
    if (latest.status !== 'pending') {
      await db.exec('ROLLBACK');
      return res.status(409).json({ error: 'payout_finalized', message: 'تسویه نهایی‌شده قابل ویرایش نیست' });
    }
    if (latest.source !== 'affiliate_commission') {
      await db.exec('ROLLBACK');
      return res.status(409).json({ error: 'legacy_payout', message: 'این رکورد قدیمی به پورسانت‌های قابل تسویه متصل نیست' });
    }
    const updated = { ...latest, status, tracking: status === 'paid' ? tracking : '', id: req.params.id };
    if (status === 'paid') {
      const reviewRequired = (await db.prepare(
        `SELECT ac.id FROM affiliate_commissions ac
         WHERE ac.payout_id = ? AND ac.status = 'pending' AND ac.review_status = 'review'
         LIMIT 1`
      ).get(req.params.id));
      if (reviewRequired) {
        (await db.exec('ROLLBACK'));
        return res.status(409).json({
          error: 'payout_requires_manual_review',
          message: 'این تسویه شامل پورسانت سفارش مرجوعی است و تا بررسی دستی قابل پرداخت نیست',
        });
      }
      const result = (await db.prepare(
        `UPDATE affiliate_commissions SET status = 'paid', updated_at = ?
         WHERE payout_id = ? AND status = 'pending'`
      ).run(now, req.params.id));
      if (!result.changes) {
        (await db.exec('ROLLBACK'));
        return res.status(409).json({ error: 'payout_commission_missing', message: 'پورسانت‌های این تسویه دیگر در دسترس نیستند' });
      }
    } else {
      (await db.prepare(
        `UPDATE affiliate_commissions SET payout_id = NULL, updated_at = ?
         WHERE payout_id = ? AND status = 'pending'`
      ).run(now, req.params.id));
    }
    (await db.prepare('UPDATE payouts SET json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(updated), now, req.params.id));
    (await db.exec('COMMIT'));
  } catch (error) {
    (await db.exec('ROLLBACK'));
    throw error;
  }
  res.json(updated);
});

router.delete('/payouts/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM payouts WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const payout = parse(row);
  if (payout.status !== 'pending' || payout.source !== 'affiliate_commission') {
    return res.status(409).json({ error: 'payout_finalized', message: 'فقط تسویه پورسانت در انتظار قابل حذف است' });
  }
  (await db.exec('BEGIN IMMEDIATE'));
  try {
    const latestRow = await db.prepare('SELECT json FROM payouts WHERE id = ? FOR UPDATE').get(req.params.id);
    if (!latestRow) {
      await db.exec('ROLLBACK');
      return res.status(404).json({ error: 'not_found' });
    }
    const latest = parse(latestRow);
    if (latest.status !== 'pending' || latest.source !== 'affiliate_commission') {
      await db.exec('ROLLBACK');
      return res.status(409).json({ error: 'payout_finalized', message: 'فقط تسویه پورسانت در انتظار قابل حذف است' });
    }
    (await db.prepare(
      `UPDATE affiliate_commissions SET payout_id = NULL, updated_at = ?
       WHERE payout_id = ? AND status = 'pending'`
    ).run(nowIso(), req.params.id));
    (await db.prepare('DELETE FROM payouts WHERE id = ?').run(req.params.id));
    (await db.exec('COMMIT'));
  } catch (error) {
    (await db.exec('ROLLBACK'));
    throw error;
  }
  res.json({ ok: true });
});

export default router;