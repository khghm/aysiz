import { Router } from 'express';
import { db } from '../db.js';
import { config, isMockZarinpal } from '../config.js';
import { uid, nowIso } from '../util.js';
import { paymentRedirectUrl, paymentRequest, paymentVerify } from '../services/zarinpal.js';
import { awardOrderPoints } from '../services/loyalty.js';
import { recordPaidOrderCommission } from '../services/affiliates.js';
import { createRateLimit, limitIdentities } from '../middleware/rateLimit.js';

const router = Router();
const parse = (row) => JSON.parse(row.json);
const startPaymentByIp = createRateLimit({
  name: 'payment-start-ip',
  limit: 10,
  windowMs: 15 * 60 * 1000,
  identity: limitIdentities.ip,
});
const checkPaymentStatusByIp = createRateLimit({
  name: 'payment-status-ip',
  limit: 60,
  windowMs: 60 * 1000,
  identity: limitIdentities.ip,
});

const callbackUrl = () => `${config.serverUrl.replace(/\/$/, '')}${config.zarinpal.callbackPath}`;
const frontendResult = (params) => {
  const qs = new URLSearchParams(params).toString();
  return `${config.frontendUrl.replace(/\/$/, '')}/payment-result?${qs}`;
};

async function findOrderBy(orderIdOrCode) {
  return (await db.prepare('SELECT json FROM orders WHERE id = ? OR code = ?').get(orderIdOrCode, orderIdOrCode));
}

// ─── شروع پرداخت ───────────────────────────────────────────────────────────
// POST /api/payment/start { orderId }
router.post('/start', startPaymentByIp, async (req, res) => {
  const orderId = String(req.body?.orderId || '');
  const orderRow = await findOrderBy(orderId);
  if (!orderRow) return res.status(404).json({ error: 'order_not_found', message: 'سفارش یافت نشد' });

  const order = parse(orderRow);
  if (order.payment_status === 'paid') {
    return res.status(400).json({ error: 'already_paid', message: 'این سفارش قبلاً پرداخت شده است' });
  }
  if (order.status === 'cancelled') {
    return res.status(409).json({ error: 'order_cancelled', message: 'برای سفارش لغوشده پرداخت جدید ممکن نیست' });
  }
  // بررسی داخل تراکنش برای جلوگیری از race condition
  const existingPending = (await db.prepare("SELECT authority FROM payment_transactions WHERE order_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1")
    .get(order.id));
  if (existingPending) {
    return res.json({
      ok: true,
      authority: existingPending.authority,
      redirectUrl: paymentRedirectUrl(existingPending.authority),
      mock: isMockZarinpal(),
      reused: true,
    });
  }

  const result = await paymentRequest({
    amountToman: order.total,
    callbackUrl: callbackUrl(),
    description: `${config.zarinpal.description} — ${order.code}`,
    mobile: order.mobile,
  });

  if (result.error) {
    console.error('[payment] request failed:', result.error);
    return res.status(502).json({ error: 'gateway_error', message: 'خطا در ارتباط با درگاه پرداخت', detail: result.error });
  }

  const t = nowIso();
  try {
    (await db.prepare(`INSERT INTO payment_transactions(id, order_id, authority, amount, status, gateway, created_at, updated_at)
                VALUES(?, ?, ?, ?, 'pending', 'zarinpal', ?, ?)`)
      .run(uid('tx'), order.id, result.authority, order.total, t, t));
  } catch (error) {
    // قید یکتا: درخواست هم‌زمان دیگری pending transaction ساخته است
    if (error.code === '23505') {
      const reusedTx = (await db.prepare("SELECT authority FROM payment_transactions WHERE order_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1")
        .get(order.id));
      if (reusedTx) {
        return res.json({
          ok: true,
          authority: reusedTx.authority,
          redirectUrl: paymentRedirectUrl(reusedTx.authority),
          mock: isMockZarinpal(),
          reused: true,
        });
      }
    }
    throw error;
  }

  const redirectUrl = result.mock ? paymentRedirectUrl(result.authority) : result.redirectUrl;

  res.json({ ok: true, authority: result.authority, redirectUrl, mock: !!result.mock });
});

// ─── بازگشت از درگاه (Callback زرین‌پال) ───────────────────────────────────
// GET /api/payment/callback?Authority=...&Status=OK|NOK
router.get('/callback', async (req, res) => {
  const authority = String(req.query.Authority || req.query.authority || '');
  const gatewayStatus = String(req.query.Status || req.query.status || 'NOK');

  const tx = (await db.prepare('SELECT * FROM payment_transactions WHERE authority = ?').get(authority));
  if (!tx) return res.redirect(frontendResult({ status: 'error', message: 'not_found' }));
  if (tx.status !== 'pending') {
    const status = tx.status === 'paid' ? 'success' : 'failed';
    return res.redirect(frontendResult({ status, authority, ref: tx.ref_id || '' }));
  }

  const orderRow = (await db.prepare('SELECT json FROM orders WHERE id = ?').get(tx.order_id));
  const order = orderRow ? parse(orderRow) : null;
  if (order?.status === 'cancelled') {
    (await db.prepare("UPDATE payment_transactions SET status = 'cancelled', updated_at = ? WHERE id = ? AND status = 'pending'")
      .run(nowIso(), tx.id));
    return res.redirect(frontendResult({ status: 'failed', order: order.code, authority, message: 'order_cancelled' }));
  }

  if (gatewayStatus.toUpperCase() !== 'OK') {
    (await db.exec('BEGIN IMMEDIATE'));
    try {
      (await db.prepare("UPDATE payment_transactions SET status = 'failed', updated_at = ? WHERE id = ?").run(nowIso(), tx.id));
      if (order && order.payment_status !== 'paid') {
        // بازگرداندن موجودی و coupon
        const items = [...(order.items || [])].sort((a, b) => (a.productId || '').localeCompare(b.productId || ''));
        for (const item of items) {
          const productRow = (await db.prepare('SELECT json FROM products WHERE id = ? FOR UPDATE').get(item.productId));
          if (productRow) {
            const product = JSON.parse(productRow.json);
            (await db.prepare('UPDATE products SET json = ? WHERE id = ?')
              .run(JSON.stringify({ ...product, stock: Number(product.stock || 0) + Number(item.qty || 0) }), item.productId));
          }
        }
        if (order.couponCode) {
          const couponRow = (await db.prepare('SELECT json FROM discount_codes WHERE code = ? FOR UPDATE').get(order.couponCode));
          if (couponRow) {
            const coupon = JSON.parse(couponRow.json);
            (await db.prepare('UPDATE discount_codes SET json = ? WHERE code = ?')
              .run(JSON.stringify({ ...coupon, usedCount: Math.max(0, (coupon.usedCount || 0) - 1) }), order.couponCode));
          }
        }
        (await db.prepare("UPDATE orders SET payment_status = 'failed', json = ? WHERE id = ?")
          .run(JSON.stringify({ ...order, paymentStatus: 'failed', payment_status: 'failed' }), order.id));
      }
      (await db.exec('COMMIT'));
    } catch (error) {
      (await db.exec('ROLLBACK'));
      throw error;
    }
    return res.redirect(frontendResult({ status: 'failed', order: order?.code || '', authority }));
  }

  const verify = await paymentVerify({ amountToman: tx.amount, authority });
  const t = nowIso();

  if (verify.verified) {
    (await db.exec('BEGIN IMMEDIATE'));
    try {
      const latestTx = (await db.prepare('SELECT status FROM payment_transactions WHERE id = ? FOR UPDATE').get(tx.id));
      const latestOrderRow = (await db.prepare('SELECT json, payment_status FROM orders WHERE id = ? FOR UPDATE').get(tx.order_id));
      if (!latestTx || latestTx.status !== 'pending' || !latestOrderRow) {
        (await db.exec('ROLLBACK'));
        return res.redirect(frontendResult({ status: 'failed', order: order?.code || '', authority, message: 'payment_state_changed' }));
      }
      const latestOrder = parse(latestOrderRow);
      if (latestOrder.status === 'cancelled' || latestOrderRow.payment_status === 'paid') {
        (await db.prepare("UPDATE payment_transactions SET status = 'duplicate', ref_id = ?, card_pan = ?, updated_at = ? WHERE id = ?")
          .run(verify.refId, verify.cardPan || '', t, tx.id));
        (await db.exec('COMMIT'));
        return res.redirect(frontendResult({ status: 'error', order: latestOrder.code, authority, message: 'manual_review_required' }));
      }
      (await db.prepare("UPDATE payment_transactions SET status = 'paid', ref_id = ?, card_pan = ?, updated_at = ? WHERE id = ?")
        .run(verify.refId, verify.cardPan || '', t, tx.id));
      const updated = { ...latestOrder, paymentStatus: 'paid', payment_status: 'paid', status: 'processing', refId: verify.refId, paidAt: t };
      (await db.prepare('UPDATE orders SET payment_status = ?, status = ?, json = ? WHERE id = ?')
        .run('paid', 'processing', JSON.stringify(updated), latestOrder.id));
      await awardOrderPoints(updated);
      await recordPaidOrderCommission(updated);
      (await db.exec('COMMIT'));
      return res.redirect(frontendResult({ status: 'success', order: latestOrder.code, ref: verify.refId || '' }));
    } catch (error) {
      (await db.exec('ROLLBACK'));
      throw error;
    }
  }

  (await db.exec('BEGIN IMMEDIATE'));
  try {
    const latestTx = (await db.prepare('SELECT status FROM payment_transactions WHERE id = ? FOR UPDATE').get(tx.id));
    const latestOrderRow = (await db.prepare('SELECT json, payment_status FROM orders WHERE id = ? FOR UPDATE').get(tx.order_id));
    if (latestTx?.status === 'pending') {
      (await db.prepare("UPDATE payment_transactions SET status = 'failed', updated_at = ? WHERE id = ?").run(t, tx.id));
      if (latestOrderRow && latestOrderRow.payment_status !== 'paid') {
        const latestOrder = parse(latestOrderRow);
        (await db.prepare("UPDATE orders SET payment_status = 'failed', json = ? WHERE id = ?")
          .run(JSON.stringify({ ...latestOrder, paymentStatus: 'failed', payment_status: 'failed' }), tx.order_id));
      }
    }
    (await db.exec('COMMIT'));
  } catch (error) {
    (await db.exec('ROLLBACK'));
    throw error;
  }
  return res.redirect(frontendResult({ status: 'failed', order: order?.code || '', authority, message: verify.error || '' }));
});

// ─── استعلام وضعیت پرداخت برای صفحه نتیجه ──────────────────────────────────
// GET /api/payment/status?authority=...  یا ?order=SQ-xxx
router.get('/status', checkPaymentStatusByIp, async (req, res) => {
  let tx;
  if (req.query.authority) {
    tx = (await db.prepare('SELECT * FROM payment_transactions WHERE authority = ?').get(String(req.query.authority)));
  } else if (req.query.order) {
    const orderRow = await findOrderBy(String(req.query.order));
    if (orderRow) {
      tx = (await db.prepare('SELECT * FROM payment_transactions WHERE order_id = ? ORDER BY created_at DESC LIMIT 1')
        .get(parse(orderRow).id));
    }
  }
  if (!tx) return res.status(404).json({ error: 'not_found' });

  const orderRow = (await db.prepare('SELECT json FROM orders WHERE id = ?').get(tx.order_id));
  const order = orderRow ? parse(orderRow) : null;
  res.json({
    transaction: { status: tx.status, refId: tx.ref_id, amount: tx.amount },
    order: order ? { code: order.code, total: order.total } : null,
  });
});

// ─── صفحه شبیه‌ساز درگاه زرین‌پال (فقط حالت تستی) ──────────────────────────
function mockGatewayPage(authority) {
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>شبیه‌ساز درگاه پرداخت زرین‌پال</title>
<style>
  * { box-sizing: border-box; font-family: Vazirmatn, Tahoma, sans-serif; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#f4f4f5; }
  .card { background:#fff; border-radius:20px; padding:32px; width:100%; max-width:380px; box-shadow:0 20px 60px rgba(0,0,0,.12); text-align:center; }
  .logo { width:56px; height:56px; border-radius:14px; background:#ffd400; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; font-weight:800; color:#1a2238; }
  h1 { font-size:18px; margin:0 0 4px; color:#1a2238; }
  .sub { font-size:12px; color:#8b8b93; margin-bottom:20px; }
  .row { display:flex; justify-content:space-between; font-size:13px; padding:10px 0; border-bottom:1px dashed #e5e7eb; color:#555; }
  .row b { color:#1a2238; }
  .btns { display:flex; flex-direction:column; gap:10px; margin-top:22px; }
  button { padding:13px; border:0; border-radius:12px; font-size:14px; font-weight:700; cursor:pointer; }
  .ok { background:#16a34a; color:#fff; }
  .nok { background:#fee2e2; color:#b91c1c; }
  .note { font-size:11px; color:#a1a1aa; margin-top:18px; line-height:1.8; }
</style>
</head>
<body>
  <div class="card">
    <div class="logo">ZP</div>
    <h1>درگاه پرداخت زرین‌پال</h1>
    <div class="sub">این صفحه یک شبیه‌ساز تستی است — درگاه واقعی جایگزین خواهد شد</div>
    <div class="row"><span>مبلغ</span><b id="amt">...</b></div>
    <div class="row"><span>کد پیگیری سفارش</span><b id="code">...</b></div>
    <div class="btns">
      <button class="ok" onclick="pay('OK')">پرداخت موفق</button>
      <button class="nok" onclick="pay('NOK')">انصراف / پرداخت ناموفق</button>
    </div>
    <div class="note">با انتخاب «پرداخت موفق»، مبلغ سفارش تأیید و کد رهگیری صادر می‌شود و به فروشگاه بازمی‌گردید.</div>
  </div>
<script>
  fetch('/api/payment/status?authority=${authority}').then(r => r.json()).then(d => {
    document.getElementById('amt').textContent = new Intl.NumberFormat('fa-IR').format(d.transaction.amount) + ' تومان';
    document.getElementById('code').textContent = d.order ? d.order.code : '-';
  });
  function pay(status) {
    window.location.href = '/api/payment/callback?Authority=${authority}&Status=' + status;
  }
</script>
</body>
</html>`;
}

router.get('/mock-gateway/:authority', (req, res) => {
  if (!req.params.authority.startsWith('MOCK')) return res.status(404).send('Not found');
  res.type('html').send(mockGatewayPage(req.params.authority));
});

// این مسیر در index.js در ریشه سرور مانت می‌شود (نه زیر /api)
export const mockGatewayHandler = (req, res) => {
  if (!req.params.authority.startsWith('MOCK')) return res.status(404).send('Not found');
  res.type('html').send(mockGatewayPage(req.params.authority));
};

export default router;
