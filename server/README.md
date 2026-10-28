# سرور بک‌اند فروشگاه تای سیز

Express 4 + PostgreSQL (`pg`) + JWT. پورت پیش‌فرض 4000.

## اجرا

```bash
cd server
npm install
if (!(Test-Path .env)) { Copy-Item .env.example .env }
docker compose --env-file .env up -d postgres
node src/index.js
```

برای محیط محلی، مقدار `POSTGRES_PASSWORD` و `DATABASE_URL` در `.env` باید با هم هماهنگ باشند. رمز نمونه فقط برای توسعهٔ محلی است؛ در استقرار واقعی رمز قوی و یکتا تنظیم کنید. `DATABASE_SSL=true` را برای سرویس PostgreSQL ابری فعال کنید و در حالت معمول `DATABASE_SSL_VERIFY=true` نگه دارید.

برای استقرار production، مقادیر متغیرهای محیطی، reverse proxy، سرویس systemd، اتصال درگاه و پیامک، backup و چک‌لیست پذیرش را در [راهنمای تحویل پروداکشن](../PRODUCTION-HANDOFF.md) ببینید. Compose این پوشه برای توسعهٔ محلی است، نه PostgreSQL پروداکشن.

`FRONTEND_URL` به‌صورت خودکار تنها origin مجاز CORS است؛ originهای اضافه را با `CORS_ORIGINS` به‌صورت comma-separated تنظیم کنید. `TRUST_PROXY` باید با reverse proxy واقعی هماهنگ باشد. درخواست OTP و ورود مدیر به rate limit مشترک PostgreSQL مجهز است. در production، `FRONTEND_URL` و `SERVER_URL` باید HTTPS باشند و startup، Merchant ID live، پیامک واقعی و `OTP_RETURN_IN_RESPONSE=false` را الزامی می‌کند.

هر درخواست پایگاه‌داده از pool اتصال PostgreSQL استفاده می‌کند و عملیات چندمرحله‌ای در تراکنش با یک اتصال اختصاصی اجرا می‌شوند. اندازه pool با `DATABASE_POOL_MAX` محدود است تا سقف اتصال سرور قابل تنظیم باشد.

اجرای نخست، طرح‌وارهٔ نسخهٔ ۸ را در PostgreSQL ایجاد و داده‌های نمونه را فقط در حالت توسعه درج می‌کند. برای انتقال یک‌بارهٔ داده‌های قدیمی، پیش از اجرای سرور ابتدا گزارش مهاجرت را ببینید و سپس واردسازی را انجام دهید:

```bash
npm run migrate:sqlite
npm run migrate:sqlite -- --apply
```

مسیر پیش‌فرض فایل منبع `data/tasis.db` است؛ در صورت نیاز می‌توان `SQLITE_SOURCE` را تنظیم کرد. ابزار مهاجرت به Node.js 22.5 یا جدیدتر نیاز دارد. فایل SQLite فقط خواندنی باز می‌شود و تغییر نمی‌کند. اگر کنار آن فایل‌های `-wal` یا `-shm` وجود دارند، تا پایان مهاجرت حذف یا جدا نکنید؛ ممکن است آخرین تغییرها هنوز در WAL باشند. مقصد باید خالی باشد؛ اگر جدول‌های مقصد رکورد داشته باشند، واردسازی پیش از نوشتن متوقف می‌شود. تمام جدول‌ها در یک تراکنش وارد می‌شوند و خطا یا تعارض باعث rollback کامل می‌شود. مقادیر تمام ستون‌های اصلی پس از درج با منبع مقایسه و گزارش و شمار رکوردهای منتقل‌شده در `data_migrations` ثبت می‌شود. در صورت موفقیت، اجرای seed نمونه در محیط توسعه نیز غیرفعال می‌شود تا دادهٔ فروشگاه با داده‌های آزمایشی مخلوط نشود.

## فعال‌سازی درگاه واقعی

فقط `ZARINPAL_MERCHANT_ID` را در `.env` با مرچنت آی‌دی واقعی پر کنید و `ZARINPAL_MODE=real` بگذارید.

## فعال‌سازی پیامک واقعی

`KAVENEGAR_API_KEY` و `KAVENEGAR_OTP_TEMPLATE` (نام قالب Verify Lookup) را در `.env` پر کنید.

## API‌ها

- `GET /api/health`
- `POST /api/auth/otp/request`, `POST /api/auth/otp/verify`, `GET/PUT /api/auth/me`, `POST /api/auth/admin-login`
- `GET /api/meta`, `GET /api/products`, `GET /api/products/:id`
- `POST /api/orders`, `GET /api/orders/mine`, `GET /api/orders/track`, `GET /api/orders`, `PATCH /api/orders/:id/status`
- `POST /api/payment/start`, `GET /api/payment/callback`, `GET /api/payment/status`, `GET /mock-gateway/:authority`
- `GET/POST /api/reviews`, `GET/POST/PUT/DELETE /api/articles`, `GET/POST/PUT/DELETE /api/discounts`, `POST /api/discounts/validate`, `GET/PUT /api/settings`, `GET /api/customers`

### مدیریت فروشگاه

تمام مسیرهای زیر به توکن ادمین نیاز دارند:

- `GET/POST/PUT/DELETE /api/tickets`, `/api/rmas`, `/api/carriers`, `/api/vendors`, `/api/campaigns`, `/api/automations`, `/api/invoices`, `/api/expenses`, `/api/bank-tx`, `/api/abandoned`, `/api/search-terms`, `/api/tasks`, `/api/surveys`, `/api/assets`, `/api/error-log`
- `GET/POST/PUT/DELETE /api/content/pages`, `/api/content/banners`, `/api/content/posts`
- `GET/POST/PUT/DELETE /api/admin/roles`, `GET/POST /api/admin/audit`, `GET /api/admin/integrations`, `PUT /api/admin/integrations/:id`, `GET/PUT /api/admin/loyalty`, `GET/PUT /api/admin/aff-config`
- `GET/POST/PUT/DELETE /api/affiliates/affiliates`, `/api/affiliates/payouts`, `GET/POST/DELETE /api/login-history`
