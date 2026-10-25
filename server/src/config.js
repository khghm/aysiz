import 'dotenv/config';
const env = (key, fallback) => {
  const v = process.env[key];
  return v === undefined || v === '' ? fallback : v;
};
const num = (key, fallback) => {
  const v = Number(process.env[key]);
  return Number.isFinite(v) && v !== 0 ? v : fallback;
};

// مقدار پیش‌فرض مرچنت آی‌دی؛ تا زمانی که مرچنت آی‌دی واقعی از زرین‌پال نرسیده باشد،
// درگاه در حالت «شبیه‌ساز» (mock) کار می‌کند و کل فلوی پرداخت بدون درگاه واقعی تست می‌شود.
export const TEST_MERCHANT_ID = 'TEST-MERCHANT-ID-REPLACE-ME';

const merchantId = env('ZARINPAL_MERCHANT_ID', TEST_MERCHANT_ID);
const isProduction = env('NODE_ENV', 'development') === 'production';
const databaseUrl = env('DATABASE_URL', '');
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required. Configure a PostgreSQL connection before starting the backend.');
}

function parseOrigin(value, name) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid HTTP(S) origin.`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)
    || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error(`${name} must contain only an HTTP(S) origin, without credentials, path, query, or fragment.`);
  }
  if (isProduction && parsed.protocol !== 'https:') {
    throw new Error(`${name} must use HTTPS in production.`);
  }
  return parsed.origin;
}

const frontendUrl = parseOrigin(env('FRONTEND_URL', 'http://localhost:3000'), 'FRONTEND_URL');
const serverUrl = parseOrigin(env('SERVER_URL', 'http://localhost:4000'), 'SERVER_URL');
const corsOrigins = [...new Set([
  frontendUrl,
  ...env('CORS_ORIGINS', '').split(',').map((origin) => origin.trim()).filter(Boolean)
    .map((origin) => parseOrigin(origin, 'CORS_ORIGINS')),
])];
const trustProxy = env('TRUST_PROXY', 'loopback');

if (isProduction) {
  const missing = ['JWT_SECRET', 'ADMIN_USERNAME', 'ADMIN_PASSWORD']
    .filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Production configuration is missing: ${missing.join(', ')}`);
  }
  if (process.env.JWT_SECRET === 'tasis-dev-secret-change-me' || process.env.ADMIN_PASSWORD === 'admin123') {
    throw new Error('Production must not use development JWT or admin credentials');
  }
  if (process.env.JWT_SECRET.length < 32 || process.env.ADMIN_PASSWORD.length < 12) {
    throw new Error('Production JWT_SECRET must be at least 32 characters and ADMIN_PASSWORD at least 12 characters');
  }
  if (!process.env.ZARINPAL_MERCHANT_ID
    || process.env.ZARINPAL_MERCHANT_ID === TEST_MERCHANT_ID
    || process.env.ZARINPAL_MODE !== 'real'
    || process.env.ZARINPAL_SANDBOX === 'true') {
    throw new Error('Production requires a live Zarinpal merchant ID, ZARINPAL_MODE=real, and ZARINPAL_SANDBOX=false');
  }
  if (!process.env.KAVENEGAR_API_KEY
    || process.env.OTP_RETURN_IN_RESPONSE !== 'false'
    || process.env.OTP_DEV_FIXED_CODE) {
    throw new Error('Production requires SMS credentials, OTP_RETURN_IN_RESPONSE=false, and an empty OTP_DEV_FIXED_CODE');
  }
  if (trustProxy === 'true') {
    throw new Error('TRUST_PROXY=true is unsafe; configure the exact trusted proxy address, range, or hop count');
  }
}

export const config = {
  isProduction,
  port: num('PORT', 4000),
  databaseUrl,
  databasePoolMax: num('DATABASE_POOL_MAX', 20),
  databaseConnectionTimeoutMs: num('DATABASE_CONNECTION_TIMEOUT_MS', 5000),
  databaseIdleTimeoutMs: num('DATABASE_IDLE_TIMEOUT_MS', 30000),
  databaseSsl: env('DATABASE_SSL', 'false') === 'true',
  databaseSslVerify: env('DATABASE_SSL_VERIFY', 'true') !== 'false',
  corsOrigins,
  trustProxy: /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy === 'false' ? false : trustProxy,
  jwtSecret: env('JWT_SECRET', 'tasis-dev-secret-change-me'),
  jwtExpiresIn: env('JWT_EXPIRES_IN', '30d'),
  frontendUrl,
  // آدرس عمومی خودِ سرور؛ برای ساخت لینک بازگشت از درگاه و صفحه شبیه‌ساز استفاده می‌شود
  serverUrl,

  admin: {
    username: env('ADMIN_USERNAME', 'admin'),
    password: env('ADMIN_PASSWORD', 'admin123'),
    name: env('ADMIN_NAME', 'مدیر کل'),
  },

  zarinpal: {
    merchantId,
    // وقتی مرچنت آی‌دی تستی/پیش‌فرض است یا ZARINPAL_MODE=mock، درگاه شبیه‌سازی می‌شود.
    mode: env('ZARINPAL_MODE', merchantId === TEST_MERCHANT_ID ? 'mock' : 'real'),
    sandbox: env('ZARINPAL_SANDBOX', 'false') === 'true',
    description: env('ZARINPAL_DESCRIPTION', 'پرداخت سفارش فروشگاه تای سیز'),
    // IRR (ریال) یا IRT (تومان) — زرین‌پال پیش‌فرض ریال است
    currency: env('ZARINPAL_CURRENCY', 'IRR'),
    callbackPath: '/api/payment/callback',
  },

  kavenegar: {
    // تا وقتی API Key کاوه‌نگار در .env قرار نگرفته باشد، OTP در «حالت تستی»
    // فقط در پاسخ API و کنسول سرور برگردانده می‌شود و پیامکی ارسال نمی‌شود.
    apiKey: env('KAVENEGAR_API_KEY', ''),
    template: env('KAVENEGAR_OTP_TEMPLATE', 'tasis-otp'),
    sender: env('KAVENEGAR_SENDER', ''),
  },

  otp: {
    expirySeconds: num('OTP_EXPIRY_SECONDS', 120),
    maxAttempts: num('OTP_MAX_ATTEMPTS', 5),
    resendCooldownSeconds: num('OTP_RESEND_COOLDOWN', 60),
    // برای توسعه محلی می‌توان کد ثابت تعریف کرد؛ خالی بودن آن یعنی کد تصادفی
    devFixedCode: env('OTP_DEV_FIXED_CODE', ''),
    returnInResponse: env('OTP_RETURN_IN_RESPONSE', 'true') === 'true',
  },
};

export const isMockZarinpal = () =>
  config.zarinpal.mode === 'mock' || config.zarinpal.merchantId === TEST_MERCHANT_ID;

export const isKavenegarLive = () => Boolean(config.kavenegar.apiKey);
