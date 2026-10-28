import { Router } from 'express';
import { db } from '../db.js';
import { config, isKavenegarLive } from '../config.js';
import { uid, nowIso, normalizePhone, otpCode, sha256, verifyPassword } from '../util.js';
import { signToken, optionalAuth, requireCustomer } from '../middleware/auth.js';
import { issueCsrfToken } from '../middleware/csrf.js';
import { createRateLimit, limitIdentities } from '../middleware/rateLimit.js';
import { sendOtpSms } from '../services/kavenegar.js';

const router = Router();
const otpRequestByIp = createRateLimit({
  name: 'otp-request-ip',
  limit: 20,
  windowMs: 15 * 60 * 1000,
  identity: limitIdentities.ip,
});
const otpRequestByPhone = createRateLimit({
  name: 'otp-request-phone',
  limit: 5,
  windowMs: 60 * 60 * 1000,
  identity: limitIdentities.phone,
  message: 'برای این شماره تعداد درخواست کد بیش از حد مجاز است؛ بعداً دوباره تلاش کنید',
});
const otpVerifyByIp = createRateLimit({
  name: 'otp-verify-ip',
  limit: 60,
  windowMs: 15 * 60 * 1000,
  identity: limitIdentities.ip,
});
const otpVerifyByPhone = createRateLimit({
  name: 'otp-verify-phone',
  limit: 10,
  windowMs: 15 * 60 * 1000,
  identity: limitIdentities.phone,
  message: 'تعداد تلاش برای تأیید این شماره بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید',
});
const adminLoginByIp = createRateLimit({
  name: 'admin-login-ip',
  limit: 20,
  windowMs: 15 * 60 * 1000,
  identity: limitIdentities.ip,
});
const adminLoginByUsername = createRateLimit({
  name: 'admin-login-username',
  limit: 10,
  windowMs: 15 * 60 * 1000,
  identity: limitIdentities.username,
});

async function customerLoyalty(id) {
  const configRow = (await db.prepare('SELECT value FROM loyalty WHERE key = ?').get('config'));
  const loyaltyConfig = configRow ? JSON.parse(configRow.value) : {};
  const balance = (await db.prepare(
    `SELECT COALESCE(SUM(CASE type WHEN 'redeem' THEN -points ELSE points END), 0) AS balance
     FROM loyalty_transactions WHERE customer_id = ?`
  ).get(id)).balance;
  return {
    loyaltyPoints: Math.max(0, balance),
    loyaltyPointValue: Number(loyaltyConfig.pointValue) || 0,
    loyaltyRedemptionCapPercent: Number.isInteger(loyaltyConfig.redemptionCapPercent)
      ? loyaltyConfig.redemptionCapPercent : 10,
  };
}

// ─── درخواست کد تأیید (OTP) ────────────────────────────────────────────────
// POST /api/auth/otp/request  { phone: "09xxxxxxxxx" }
router.post('/otp/request', otpRequestByIp, otpRequestByPhone, async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  if (!phone) return res.status(400).json({ error: 'invalid_phone', message: 'شماره موبایل معتبر وارد کنید' });

  const customer = (await db.prepare('SELECT is_blocked FROM customers WHERE phone = ?').get(phone));
  if (customer?.is_blocked) return res.status(403).json({ error: 'blocked', message: 'حساب شما مسدود شده است' });

  // محدودیت ارسال مجدد
  const cutoff = new Date(Date.now() - config.otp.resendCooldownSeconds * 1000).toISOString();
  const recent = (await db.prepare(
    'SELECT created_at FROM otp_requests WHERE phone = ? AND created_at > ? ORDER BY created_at DESC LIMIT 1'
  ).get(phone, cutoff));
  if (recent) {
    return res.status(429).json({ error: 'resend_cooldown', message: `لطفاً ${config.otp.resendCooldownSeconds} ثانیه دیگر دوباره تلاش کنید` });
  }

  const code = config.otp.devFixedCode || otpCode();
  const t = nowIso();
  const requestId = uid('otp');
  (await db.prepare('INSERT INTO otp_requests(id, phone, code_hash, expires_at, created_at) VALUES(?, ?, ?, ?, ?)')
    .run(requestId, phone, sha256(code), new Date(Date.now() + config.otp.expirySeconds * 1000).toISOString(), t));

  const result = await sendOtpSms(phone, code);
  if (!result.sent && !result.testMode) {
    (await db.prepare('DELETE FROM otp_requests WHERE id = ?').run(requestId));
    return res.status(502).json({
      error: 'sms_delivery_failed',
      message: 'ارسال پیامک ناموفق بود؛ لطفاً دوباره تلاش کنید',
    });
  }

  res.json({
    ok: true,
    phone,
    testMode: !isKavenegarLive(),
    // ⚠️ فقط تا زمانی که API Key کاوه‌نگار تنظیم نشده، کد در پاسخ برگردانده می‌شود
    devOtp: (!isKavenegarLive() && config.otp.returnInResponse) ? code : undefined,
    message: isKavenegarLive() ? 'کد تأیید پیامک شد' : 'کد تأیید (حالت تستی) در پاسخ و کنسول سرور قابل مشاهده است',
  });
});

// ─── بررسی کد و ورود/ثبت‌نام مشتری ─────────────────────────────────────────
// POST /api/auth/otp/verify  { phone, code, name? }
router.post('/otp/verify', otpVerifyByIp, otpVerifyByPhone, async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const code = String(req.body?.code || '').replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).trim();
  const name = String(req.body?.name || '').trim();

  if (!phone || !code) return res.status(400).json({ error: 'invalid_input', message: 'شماره و کد تأیید الزامی است' });

  const blockedCustomer = (await db.prepare('SELECT is_blocked FROM customers WHERE phone = ?').get(phone));
  if (blockedCustomer?.is_blocked) return res.status(403).json({ error: 'blocked', message: 'حساب شما مسدود شده است' });

  const row = (await db.prepare(
    'SELECT * FROM otp_requests WHERE phone = ? AND consumed = 0 ORDER BY created_at DESC LIMIT 1'
  ).get(phone));

  if (!row) return res.status(400).json({ error: 'no_otp', message: 'ابتدا درخواست کد تأیید بدهید' });
  if (new Date(row.expires_at) < new Date()) return res.status(400).json({ error: 'otp_expired', message: 'کد تأیید منقضی شده است' });
  if (row.attempts >= config.otp.maxAttempts) return res.status(429).json({ error: 'too_many_attempts', message: 'تعداد تلاش‌ها بیش از حد مجاز است' });

  if (row.code_hash !== sha256(code)) {
    (await db.prepare('UPDATE otp_requests SET attempts = attempts + 1 WHERE id = ?').run(row.id));
    return res.status(400).json({ error: 'invalid_code', message: 'کد تأیید اشتباه است' });
  }

  (await db.prepare('UPDATE otp_requests SET consumed = 1 WHERE id = ?').run(row.id));

  // ورود یا ساخت مشتری
  let customer = (await db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone));
  const t = nowIso();
  if (!customer) {
    const id = uid('cus');
    (await db.prepare('INSERT INTO customers(id, phone, name, created_at, last_login) VALUES(?, ?, ?, ?, ?)')
      .run(id, phone, name, t, t));
    customer = (await db.prepare('SELECT * FROM customers WHERE id = ?').get(id));
  } else {
    if (name && name !== customer.name) {
      (await db.prepare('UPDATE customers SET name = ? WHERE id = ?').run(name, customer.id));
      customer = { ...customer, name };
    }
    (await db.prepare('UPDATE customers SET last_login = ? WHERE id = ?').run(t, customer.id));
  }

  const token = signToken({ id: customer.id, phone: customer.phone, name: customer.name }, 'customer');
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('tasis_customer', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  issueCsrfToken(res);
  res.json({
    ok: true,
    customer: { id: customer.id, phone: customer.phone, name: customer.name, ...await customerLoyalty(customer.id) },
  });
});

// ─── پروفایل مشتری جاری ────────────────────────────────────────────────────
router.get('/me', requireCustomer, async (req, res) => {
  const c = (await db.prepare('SELECT id, phone, name, created_at, last_login FROM customers WHERE id = ?').get(req.user.id));
  if (!c) return res.status(404).json({ error: 'not_found' });
  res.json({ customer: { ...c, ...await customerLoyalty(c.id) } });
});

router.put('/me', requireCustomer, async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'invalid_input', message: 'نام الزامی است' });
  (await db.prepare('UPDATE customers SET name = ? WHERE id = ?').run(name, req.user.id));
  res.json({ ok: true });
});

// ─── ورود ادمین ────────────────────────────────────────────────────────────
// POST /api/admin/auth/login { username, password }  (در index زیر مسیر ادمین سوار می‌شود)
router.post('/admin-login', adminLoginByIp, adminLoginByUsername, async (req, res) => {
  const { username, password } = req.body || {};
  const admin = (await db.prepare('SELECT * FROM admin_users WHERE username = ?').get(String(username || '')));
  if (!admin || !verifyPassword(String(password || ''), admin.password_hash)) {
    return res.status(401).json({ error: 'invalid_credentials', message: 'نام کاربری یا رمز عبور اشتباه است' });
  }
  const role = (await db.prepare('SELECT json FROM roles WHERE id = ?').get(admin.role_id));
  if (!role) return res.status(403).json({ error: 'role_not_assigned', message: 'برای حساب مدیر نقشی تعریف نشده است' });
  const roleData = JSON.parse(role.json);
  const token = signToken({ id: admin.id, username: admin.username, name: admin.name, roleId: admin.role_id }, 'admin');
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('tasis_admin', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  issueCsrfToken(res);
  res.json({
    ok: true,
    admin: { id: admin.id, username: admin.username, name: admin.name, roleId: admin.role_id, roleName: roleData.name },
  });
});

  // ─── خروج مشتری ─────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('tasis_customer', { path: '/' });
  res.json({ ok: true });
});

// ─── خروج ادمین ─────────────────────────────────────────────────────────────
router.post('/admin-logout', (req, res) => {
  res.clearCookie('tasis_admin', { path: '/' });
  res.json({ ok: true });
});

export default router;
