import 'express-async-errors';
import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { db, runWithRequestContext } from './db.js';
import { isMockZarinpal, isKavenegarLive } from './config.js';
import { seed } from './seed.js';

const app = express();
app.set('trust proxy', config.trustProxy);
app.use(helmet({
  contentSecurityPolicy: false,
  strictTransportSecurity: config.isProduction ? undefined : false,
}));
app.use(express.json({ limit: '25mb' }));
app.use((_req, _res, next) => runWithRequestContext(next));

app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  const startedAt = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api')) {
      console.log(JSON.stringify({
        event: 'http_request',
        requestId: req.requestId,
        method: req.method,
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
      }));
    }
  });
  next();
});

app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (origin && !config.corsOrigins.includes(origin)) {
    return res.status(403).json({ error: 'cors_origin_not_allowed' });
  }
  return next();
});
app.use(cors({ origin: config.corsOrigins }));

// ─── مسیرهای API ───────────────────────────────────────────────────────────
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import reviewRoutes from './routes/reviews.js';
import articleRoutes from './routes/articles.js';
import discountRoutes from './routes/discounts.js';
import settingsRoutes from './routes/settings.js';
import orderRoutes from './routes/orders.js';
import customerRoutes from './routes/customers.js';
import paymentRoutes, { mockGatewayHandler } from './routes/payment.js';
import ticketRoutes from './routes/tickets.js';
import rmaRoutes from './routes/rmas.js';
import carrierRoutes from './routes/carriers.js';
import vendorRoutes from './routes/vendors.js';
import campaignRoutes from './routes/campaigns.js';
import automationRoutes from './routes/automations.js';
import invoiceRoutes from './routes/invoices.js';
import expenseRoutes from './routes/expenses.js';
import bankTxRoutes from './routes/banktx.js';
import abandonedRoutes from './routes/abandoned.js';
import searchTermRoutes from './routes/searchterms.js';
import contentRoutes from './routes/content.js';
import adminRoutes from './routes/admin.js';
import affiliateRoutes from './routes/affiliates.js';
import taskRoutes from './routes/tasks.js';
import surveyRoutes from './routes/surveys.js';
import assetRoutes from './routes/assets.js';
import loginHistoryRoutes from './routes/loginhistory.js';
import errorLogRoutes from './routes/errorlog.js';

app.use('/api/auth', authRoutes);
app.use('/api/admin/auth', authRoutes);
app.use('/api', catalogRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/rmas', rmaRoutes);
app.use('/api/carriers', carrierRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/automations', automationRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/bank-tx', bankTxRoutes);
app.use('/api/abandoned', abandonedRoutes);
app.use('/api/search-terms', searchTermRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/affiliates', affiliateRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/login-history', loginHistoryRoutes);
app.use('/api/error-log', errorLogRoutes);

// صفحه شبیه‌ساز درگاه زرین‌پال (حالت تستی) در ریشه سرور
app.get('/mock-gateway/:authority', mockGatewayHandler);

// ─── سلامت سرور ────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  await db.prepare('SELECT 1').get();
  res.json({
    ok: true,
    service: 'tasis-backend',
    time: new Date().toISOString(),
    payment: isMockZarinpal() ? 'zarinpal-mock (تستی)' : 'zarinpal-real',
    sms: isKavenegarLive() ? 'kavenegar-live' : 'kavenegar-mock (تستی)',
  });
});

// 404 و هندل خطا
app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found', message: 'مسیر یافت نشد' }));
app.use((err, _req, res, _next) => {
  const message = typeof err.message === 'string'
    ? err.message
      .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, '[database-url]')
      .replace(/(authorization\s*:\s*bearer\s+)[^\s]+/gi, '$1[redacted]')
      .replace(/(api[_-]?key|token|password|secret)\s*[:=]\s*["']?[^,\s"'`]+/gi, '$1=[redacted]')
      .slice(0, 500)
    : 'Unhandled application error';
  console.error(JSON.stringify({
    event: 'http_error',
    requestId: _req.requestId,
    name: err.name || 'Error',
    code: err.code || undefined,
    message,
  }));
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'payload_too_large', message: 'حجم درخواست از حد مجاز بیشتر است' });
  }
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'invalid_json', message: 'ساختار JSON درخواست معتبر نیست' });
  }
  res.status(500).json({ error: 'internal', message: 'خطای داخلی سرور' });
});

async function start() {
  await db.initialize();
  await seed();
  app.listen(config.port, () => {
    console.log('──────────────────────────────────────────────');
    console.log(`✅ بک‌اند تای سیز روی http://localhost:${config.port} اجرا شد`);
    console.log('   پایگاه داده: PostgreSQL');
    console.log(`   درگاه پرداخت: ${isMockZarinpal() ? 'شبیه‌ساز تستی زرین‌پال' : 'زرین‌پال واقعی'}`);
    console.log(`   سرویس پیامک:  ${isKavenegarLive() ? 'کاوه‌نگار (واقعی)' : 'حالت تستی — کد OTP در کنسول'}`);
    console.log('──────────────────────────────────────────────');
  });
  const cleanupTimer = setInterval(() => {
    db.prepare("DELETE FROM request_rate_limits WHERE window_started_at < clock_timestamp() - INTERVAL '1 day'")
      .run()
      .catch((error) => {
        console.error(JSON.stringify({
          event: 'rate_limit_cleanup_failed',
          name: error.name || 'Error',
          code: error.code || undefined,
        }));
      });
  }, 60 * 60 * 1000);
  cleanupTimer.unref();
}

await start().catch(async (error) => {
  console.error(JSON.stringify({
    event: 'startup_failed',
    name: error.name || 'Error',
    code: error.code || undefined,
    message: typeof error.message === 'string'
      ? error.message.replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, '[database-url]').slice(0, 500)
      : 'Application startup failed',
  }));
  await db.close();
  process.exitCode = 1;
});
