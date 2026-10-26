# راهنمای تحویل و استقرار پروداکشن فروشگاه تای‌سیز

این راهنما برای تحویل پروژه به تیم فنی/کارفرماست و مسیر راه‌اندازی بک‌اند، فرانت‌اند، PostgreSQL، درگاه پرداخت، پیامک، پشتیبان‌گیری و آزمون نهایی را توضیح می‌دهد.

> **وضعیت فعلی:** بک‌اند PostgreSQL و انتقال SQLite در محیط توسعه پیاده‌سازی و آزموده شده‌اند. PostgreSQL محلی این پروژه شامل داده‌های منتقل‌شده است، اما هیچ سرویس پروداکشن، دامنه، حساب/اعتبارنامهٔ واقعی درگاه یا پیامک در این مخزن تنظیم نشده است. راه‌اندازی عمومی را فقط پس از تکمیل موارد «مانع انتشار» در این سند انجام دهید.

## ۱. معماری و مسیر درخواست

- فرانت‌اند React/Vite به‌صورت فایل‌های استاتیک build می‌شود.
- وضعیت رابط کاربری با Zustand نگهداری می‌شود و داده‌های API با TanStack Query در حافظهٔ همان tab cache می‌شوند؛ این cache میان کاربرها/replicaها مشترک نیست و منبع نهایی داده همچنان PostgreSQL است. به‌صورت پیش‌فرض queryها پس از ۳۰ ثانیه stale می‌شوند؛ فهرست‌های عمومی فروشگاه ۶۰ ثانیه تنظیم شده‌اند. cache سمت سرور/CDN یا rate limit را جایگزین نمی‌کند.
- بک‌اند Express روی Node.js اجرا می‌شود و داده‌ها را در PostgreSQL نگه می‌دارد.
- فرانت‌اند درخواست API را به مسیر `/api` روی همان origin می‌فرستد؛ برای میزبانی جداگانهٔ API می‌توان `VITE_API_BASE_URL` را هنگام build روی origin بک‌اند تنظیم کرد. در هر دو حالت، این مسیر باید به Express متصل باشد تا عملیات واقعی کار کند.
- آدرس بازگشت پرداخت زرین‌پال از `SERVER_URL` ساخته می‌شود؛ نتیجهٔ پرداخت در `FRONTEND_URL` باز می‌شود.
- Vite proxy فقط برای توسعه است؛ `VITE_API_URL` در `vite.config.js` مقصد proxy زمان اجرای `npm run dev` را تعیین می‌کند و جایگزین reverse proxy پروداکشن نیست.
- بارگذاری فایل‌های استاتیک با Cloudflare Workers/Pages به‌تنهایی Express و PostgreSQL را deploy یا به `/api` متصل نمی‌کند. اگر Worker/Pages فقط فایل‌های `dist` را سرو کند، fallback برنامهٔ تک‌صفحه‌ای ممکن است برای `/api/*` هم `index.html` با status 200 برگرداند. برای API، backend را جداگانه روی HTTPS منتشر کنید و `VITE_API_BASE_URL` را در build environment روی origin آن (بدون `/api`) بگذارید؛ سپس `FRONTEND_URL`/`CORS_ORIGINS` بک‌اند را برای origin سایت تنظیم و آزمون کنید. بدون backend متصل، دادهٔ seed ممکن است برای پیش‌نمایش دیده شود اما ورود مدیریت، سفارش، پرداخت و ذخیره‌سازی عملیاتی نیست.
- `server/docker-compose.yml` فقط PostgreSQL محلی توسعه را تعریف می‌کند؛ Dockerfile یا Compose آمادهٔ پروداکشن برای برنامه وجود ندارد. پورت 5432 را در اینترنت باز نکنید.

## ۲. اطلاعاتی که پیش از تحویل باید از کارفرما گرفته شود

این موارد را با مالک سرویس نهایی کنید و در مخزن Git، issue عمومی، پیام‌رسان یا مستند قابل‌دسترسی عمومی قرار ندهید:

1. دامنهٔ اصلی فروشگاه، DNS، مالک TLS certificate و مسئول تمدید آن.
2. میزبان اجرای Node.js و فرایند استقرار/بازگشت نسخه.
3. ارائه‌دهندهٔ PostgreSQL، نام دیتابیس، کاربر برنامه، سقف connection و روش TLS/گواهی CA.
4. حساب تجاری زرین‌پال، Merchant ID فعال، وضعیت پذیرنده و واحد مبلغ مورد انتظار پذیرنده.
5. حساب کاوه‌نگار، API Key، قالب Verify Lookup تأییدشده و sender در صورت نیاز.
6. سیاست عملیاتی موجودی، ارسال/مرسوله، لغو سفارش، بازپرداخت، مرجوعی، تسویهٔ افیلیت و پاسخ‌گویی به مشتری.
7. مسئول دریافت هشدارها، نگهداری backup، مدت نگهداری آن و زمان هدف بازیابی (RPO/RTO).
8. سیاست حریم خصوصی، مدت نگهداری دادهٔ مشتری/OTP، متن رضایت‌ها و الزامات قانونی/مالی محل فعالیت.

از هر سرویس‌دهنده، **محیط staging/sandbox و prod** را جداگانه مشخص کنید. کلید sandbox را هرگز با live اشتباه نگیرید.

## ۳. پیش‌نیازهای انتشار

- یک میزبان Linux پشتیبانی‌شده برای Node.js؛ Node.js 22 LTS توصیه می‌شود.
- PostgreSQL 16 یا نسخهٔ پشتیبانی‌شدهٔ سرویس‌دهنده. در صورت استفاده از `pg_dump`، ابزار client هم‌نسخه یا سازگار نصب باشد.
- reverse proxy مانند Nginx/Caddy یا gateway مدیریت‌شده با HTTPS.
- DNS و HTTPS معتبر برای دامنهٔ عمومی.
- سرویس PostgreSQL شبکه‌ای خصوصی، احراز هویت قوی و TLS certificate معتبر.
- فضای backup جدا از میزبان برنامه و کنترل دسترسی محدود.
- دسترسی خروجی شبکه از backend به PostgreSQL، `api.zarinpal.com` و `api.kavenegar.com`.

**نکته:** Compose موجود یک نمونهٔ محلی است. برای پروداکشن از PostgreSQL مدیریت‌شده یا نصب سخت‌سازی‌شدهٔ جداگانه با backup و مانیتورینگ استفاده کنید. حجم pool همهٔ replicaهای برنامه را با سقف اتصال PostgreSQL هماهنگ کنید:

`تعداد replica × DATABASE_POOL_MAX + اتصالات مدیریتی < سقف اتصال دیتابیس`

## ۴. تنظیم secrets و متغیرهای محیطی

برای پروداکشن یک فایل environment اختصاصی و خارج از repository یا Secret Manager بسازید. `.env` را commit نکنید، در log چاپ نکنید و به مرورگر نرسانید. در میزبان Linux، دسترسی فایل حاوی secrets را به کاربر سرویس محدود کنید (برای نمونه mode `600`).

| متغیر | مقدار پروداکشن و نکته |
|---|---|
| `NODE_ENV` | دقیقاً `production`. اعتبارسنجی سخت‌گیرانهٔ تنظیمات به این مقدار وابسته است. |
| `PORT` | پورت داخلی backend؛ نمونه `4000`. فقط روی loopback/private network در دسترس باشد. |
| `DATABASE_URL` | اتصال کاربر اختصاصی برنامه به DB پروداکشن. رمزهای دارای `@`, `:`, `/`, `%` و مانند آن را در URL-encode کنید. آن را در command/log عمومی قرار ندهید. |
| `DATABASE_SSL` | برای PostgreSQL ابری `true`. |
| `DATABASE_SSL_VERIFY` | `true` بماند؛ اعتبارسنجی TLS را برای رفع مشکل خاموش نکنید. اگر provider CA اختصاصی لازم دارد، CA را مطابق روش همان provider نصب/تنظیم کنید. |
| `DATABASE_POOL_MAX` | بر مبنای سقف provider و تعداد replica تعیین شود؛ مقدار پیش‌فرض `20` برای همهٔ معماری‌ها مناسب نیست. |
| `DATABASE_CONNECTION_TIMEOUT_MS` | پیش‌فرض `5000`; با latency provider تنظیم شود. |
| `DATABASE_IDLE_TIMEOUT_MS` | پیش‌فرض `30000`. |
| `TRUST_PROXY` | برای Nginx روی loopback مقدار `loopback` (پیش‌فرض)؛ برای platform دیگر IP/CIDR دقیق proxy مورد اعتماد یا hop count واقعی را تنظیم کنید. `true` در production رد می‌شود؛ هدرهای forwarding از proxy ناشناس قابل اعتماد نیستند. |
| `JWT_SECRET` | تصادفی، خصوصی و حداقل ۳۲ بایت entropy؛ از کلید dev یا نمونه استفاده نکنید. تغییر آن تمام tokenهای قبلی را باطل می‌کند. |
| `JWT_EXPIRES_IN` | طول عمر توکن مدیر را مطابق سیاست امنیتی تعیین کنید؛ پیش‌فرض برنامه `30d` است و برای مدیران طولانی است. |
| `ADMIN_USERNAME` | نام حسابی که فقط در seed اولیه و هنگام نبودن آن نام کاربری استفاده می‌شود. |
| `ADMIN_PASSWORD` | رمز قوی و یکتا؛ مقدار `admin123` در production رد می‌شود. این متغیر رمز حساب موجود در دیتابیس را به‌طور خودکار عوض نمی‌کند. |
| `ADMIN_NAME` | نام نمایشی حساب bootstrap. |
| `FRONTEND_URL` | origin عمومی frontend، با `https://` و بدون مسیر؛ مانند `https://shop.example.com`. callback نتیجهٔ پرداخت به این سایت برمی‌گردد. |
| `SERVER_URL` | origin عمومی‌ای که callback زرین‌پال به آن دسترسی دارد. اگر `/api` روی همان دامنه proxy شده، برابر `FRONTEND_URL` است؛ اگر API دامنهٔ جدا دارد، origin همان API را بگذارید. |
| `CORS_ORIGINS` | originهای مجاز اضافی، جداشده با comma و بدون مسیر. `FRONTEND_URL` به‌صورت خودکار مجاز است؛ در استقرار same-origin خالی بگذارید. |
| `ZARINPAL_MERCHANT_ID` | Merchant ID واقعی همان محیط. مقدار placeholder یا sandbox را برای live نگذارید. |
| `ZARINPAL_MODE` | در live دقیقاً `real`. در `production` حالت mock موجب توقف startup می‌شود. |
| `ZARINPAL_SANDBOX` | در live مقدار `false`; برای آزمون قبل از انتشار، فقط با پذیرنده/محیط sandbox واقعی هماهنگ شود. `MODE=real` همراه sandbox همچنان با sandbox endpoint کار می‌کند. |
| `ZARINPAL_CURRENCY` | `IRR` یا `IRT` را مطابق قرارداد پذیرنده انتخاب کنید. قیمت‌های داخلی فروشگاه تومان‌اند؛ با `IRR` برنامه مبلغ را ×۱۰ می‌کند و با `IRT` ×۱. تنظیم اشتباه مبلغ را غلط می‌فرستد. |
| `ZARINPAL_DESCRIPTION` | توضیح پرداخت قابل‌نمایش در درگاه. |
| `KAVENEGAR_API_KEY` | API Key واقعی و محدود به حساب مورد استفاده. بدون آن پیامکی ارسال نمی‌شود. |
| `KAVENEGAR_OTP_TEMPLATE` | نام دقیق قالب Verify Lookup تأییدشده در پنل کاوه‌نگار. |
| `KAVENEGAR_SENDER` | در صورت نیاز ارائه‌دهنده؛ خالی بودن، رفتار پیش‌فرض provider را به کار می‌گیرد. |
| `OTP_RETURN_IN_RESPONSE` | در production دقیقاً `false`؛ startup با `true` متوقف می‌شود. |
| `OTP_DEV_FIXED_CODE` | در production خالی بماند. کد ثابت برای کاربر عمومی ناامن است. |
| `OTP_EXPIRY_SECONDS` | پیش‌فرض ۱۲۰ ثانیه. |
| `OTP_MAX_ATTEMPTS` | پیش‌فرض ۵ تلاش برای هر OTP صادرشده. |
| `OTP_RESEND_COOLDOWN` | پیش‌فرض ۶۰ ثانیه. این cooldown جایگزین محدودسازی درخواست در لبه/برنامه نیست. |

`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` فقط برای Compose محلی هستند و با `DATABASE_URL` یکسان/هماهنگ نگه داشته می‌شوند. برای DB مدیریت‌شده، Compose را برای ایجاد DB اجرا نکنید.

### تولید رازها

در میزبان دارای Node.js می‌توان راز تصادفی ساخت؛ خروجی را مستقیماً در Secret Manager وارد کنید، نه در source code:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

برای رمز DB و رمز مدیر، رازهای جداگانه بسازید. `JWT_SECRET`، رمز DB، API Key پیامک و Merchant ID را بین staging و production مشترک نکنید.

## ۵. آماده‌سازی و انتقال دیتابیس

### وضعیت دادهٔ این پروژه

SQLite قدیمی در محیط توسعه به PostgreSQL محلی منتقل شده است. انتقال تأییدشده شامل ۴۳ جدول و ۱۰۸ ردیف بود و داده‌ها با منبع مقایسه شدند. فایل‌های `server/data/tasis.db`, `tasis.db-wal`, `tasis.db-shm` نسخهٔ منبع‌اند؛ آن‌ها را تا زمانی که backup مستقل و تأییدشده ندارید حذف یا جابه‌جا نکنید.

PostgreSQL محلی در volume به نام `server_tasis_postgres_data` نگهداری می‌شود. حذف volume یعنی حذف دیتابیس محلی؛ برای بررسی یا پاک‌سازی آن از دستورهای `docker compose down -v` استفاده نکنید.

### انتقال از PostgreSQL محلی به دیتابیس پروداکشن

1. ابتدا دیتابیس پروداکشنِ جدید و **خالی** بسازید. اگر مقصد از قبل جدول/داده دارد، آن را overwrite نکنید؛ انتقال را متوقف و با DBA برای merge جداگانه برنامه‌ریزی کنید.
2. پیش از تغییر مقصد، از منبع و مقصد backup بگیرید. نصب نسخهٔ `pg_dump` و `pg_restore` سازگار با PostgreSQL را بررسی کنید.
3. `SOURCE_DATABASE_URL` و `TARGET_DATABASE_URL` را به‌طور موقت از Secret Manager یا credential store امن در محیط shell تنظیم کنید. secrets را در command history، ticket، log یا مستند قرار ندهید.
4. در PowerShell، از پوشهٔ `server` فایل dump رمزگذاری‌شده/محافظت‌شده بسازید:

   ```powershell
   pg_dump.exe --format=custom --no-owner --no-acl --dbname=$env:SOURCE_DATABASE_URL --file=tasis-production.dump
   ```

5. فقط پس از تأیید نام دیتابیس مقصد و خالی بودن آن، dump را بازیابی کنید:

   ```powershell
   pg_restore.exe --exit-on-error --no-owner --no-acl --dbname=$env:TARGET_DATABASE_URL tasis-production.dump
   ```

   Linux/macOS از همین گزینه‌ها با `pg_dump` و `pg_restore` استفاده کند. فایل dump را مانند دادهٔ مشتری محرمانه نگه دارید و پس از upload امن، نسخه‌های موقت را طبق سیاست نگهداری پاک کنید.
6. پس از restore، شمار رکورد جدول‌های کلیدی، `schema_migrations`, `data_migrations` و اتصال برنامه را بررسی کنید. برنامه را روی dump/DB منبع آزمایش نکنید.
7. اگر دیتابیس مقصد خالی و بدون dump است و قرار است از SQLite مستقیماً مهاجرت کنید، پیش از اجرای اپ از راهنمای [مهاجرت SQLite در README بک‌اند](./server/README.md) پیروی کنید. ابزار مقصدِ دارای داده را نمی‌نویسد.

از `pg_restore --clean`, `--clean --if-exists`, `DROP DATABASE` یا پاک‌سازی جداول روی دیتابیس حاوی داده استفاده نکنید، مگر اینکه مقصد، پیامد و backup بررسی شده و مجوز صریح مالک داده گرفته شده باشد. برای cutover، restore را ابتدا روی staging امتحان کنید.

### تفاوت dump کامل با پشتیبان JSON پنل

- dump کامل PostgreSQL برای انتقال محیط یا بازیابی زیرساخت مناسب است و schema و داده را شامل می‌شود.
- «پشتیبان پایگاه‌داده» پنل فایل JSON جدول‌های برنامه است؛ اطلاعات شخصی مشتری، hash رمز، OTP و اطلاعات پرداخت دارد. فقط در محیط کنترل‌شده و با حساب دارای مجوز سیستم آن را دریافت کنید.
- restore از پنل **تخریبی** است: جدول‌های برنامه را داخل تراکنش جایگزین می‌کند. پیش از استفاده، backup جداگانه بگیرید، نسخهٔ schema را کنترل و در staging تمرین کنید. فایل را در ایمیل یا فضای عمومی ارسال نکنید.
- هیچ‌کدام جایگزین backup زمان‌بندی‌شدهٔ بیرون از میزبان و آزمون restore نیست.

## ۶. Deploy برنامه

### Build و نصب

در CI یا ماشین build:

```bash
# ریشهٔ پروژه
npm ci
npm run typecheck
npm run build
```

خروجی frontend در `dist/` قرار می‌گیرد و روی وب‌سرور استاتیک منتشر می‌شود. backend را جداگانه از پوشهٔ `server` نصب کنید:

```bash
cd server
npm ci --omit=dev
NODE_ENV=production node src/index.js
```

این دستور آخری فقط برای آزمون/راه‌اندازی موقت است. برای production، backend را با مدیر سرویس (برای نمونه systemd یا platform service) اجرا کنید تا restart، logging، user isolation و shutdown مدیریت شود. فایل secrets را به‌عنوان EnvironmentFile/Secret Manager به فرایند تزریق کنید. اجرای backend با کاربر root توصیه نمی‌شود.

برنامه هنگام startup، schema را مقداردهی/به‌روزرسانی و seed غیرتخریبی را اجرا می‌کند؛ قبل از هر deploy که schema را تغییر می‌دهد backup بگیرید و startup را در staging روی یک کپی از DB بررسی کنید. seed در development می‌تواند دادهٔ نمونه درج کند؛ `NODE_ENV=production` را درست تنظیم کنید.

middleware امنیتی backend شامل Helmet و CORS allowlist است. originهای خارج از `FRONTEND_URL` و `CORS_ORIGINS` قبل از پاسخ API با 403 رد می‌شوند. origin با scheme/host/port دقیق مقایسه می‌شود؛ wildcard یا مسیر URL مجاز نیست. برای درخواست‌های سرور-به-سرور که Origin ندارند، CORS بررسی نمی‌شود و مجوزهای API همچنان جداگانه اعمال می‌شوند.

Rate limitهای احراز هویت در جدول PostgreSQL مشترک میان replicaها ذخیره می‌شوند؛ کلیدهای IP/تلفن/نام کاربری hash می‌شوند. baseline فعلی:

| مسیر | هویت | سقف |
|---|---|---|
| `POST /api/auth/otp/request` | IP | ۲۰ درخواست در ۱۵ دقیقه |
| `POST /api/auth/otp/request` | شماره موبایل نرمال‌شده | ۵ درخواست در ۶۰ دقیقه |
| `POST /api/auth/otp/verify` | IP | ۶۰ درخواست در ۱۵ دقیقه |
| `POST /api/auth/otp/verify` | شماره موبایل نرمال‌شده | ۱۰ درخواست در ۱۵ دقیقه |
| `POST /api/admin/auth/admin-login` | IP | ۲۰ درخواست در ۱۵ دقیقه |
| `POST /api/admin/auth/admin-login` | نام کاربری | ۱۰ درخواست در ۱۵ دقیقه |

پاسخ عبور از سقف HTTP 429 و `Retry-After` می‌دهد. رکوردهای منقضی‌شده به‌صورت ساعتی پاک و بیش از یک روز نگهداری نمی‌شوند. این baseline را با ترافیک واقعی و کاربران پشت NAT/staff شبکهٔ مشترک در staging بسنجید. WAF/CDN همچنان برای مقابله با حملهٔ حجمی لازم است. `req.ip` فقط وقتی درست است که `TRUST_PROXY` با توپولوژی واقعی همخوان باشد؛ تعداد hop را حدس نزنید.

### Reverse proxy

نمونهٔ سادهٔ Nginx زیر برای نمایش مسیرهاست؛ مسیر certificate و دامنه را جایگزین و پیکربندی واقعی را با مدیر زیرساخت بررسی کنید. TLS باید در proxy یا load balancer خاتمه یابد؛ backend پورت عمومی نداشته باشد.

برای rate limit در Nginx، zone را در context سراسری `http {}` تعریف و location مربوط به endpointهای احراز هویت را داخل `server {}` قرار دهید. اعداد زیر نمونه‌اند و باید با الگوی ترافیک/کاربران واقعی و provider تنظیم شوند:

```nginx
# در context http، خارج از server:
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;

# داخل server:
location ~ ^/api/(auth/otp/(request|verify)|admin/auth/admin-login)$ {
    limit_req zone=auth_limit burst=5 nodelay;
    limit_req_status 429;
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

این فقط لایهٔ دفاعی نمونه است و جای rate limit سمت برنامه را نمی‌گیرد. اگر پشت CDN/load balancer هستید، فقط proxyهای مورد اعتماد را در تنظیم real client IP لحاظ کنید؛ در غیر این صورت Nginx ممکن است همهٔ مشتریان را یک IP ببیند یا header جعلی را بپذیرد. limitها را با چند مشتری هم‌زمان و دفتر پشتیبانی آزمایش کنید.

```nginx
server {
    listen 443 ssl http2;
    server_name shop.example.com;

    ssl_certificate     /etc/letsencrypt/live/shop.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/shop.example.com/privkey.pem;

    root /srv/tasis/frontend/dist;
    index index.html;
    client_max_body_size 25m;

    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header X-Frame-Options DENY always;
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; img-src 'self' data: https://image.qwenlm.ai; font-src 'self' data: https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'; connect-src 'self'; form-action 'self' https://www.zarinpal.com https://sandbox.zarinpal.com" always;

    location = /api {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # درگاه mock فقط برای توسعه است و نباید به مشتری production ارائه شود.
    location /mock-gateway/ { return 404; }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

HTTP پورت 80 باید فقط به HTTPS redirect شود. قبل از فعال‌سازی HSTS، HTTPS و تمدید خودکار certificate را عملاً تأیید کنید. درخواست‌های `/api` باید به همان backend و بدون تغییر path برسند. origin فرانت‌اند را در `FRONTEND_URL` و originهای جداگانه را در `CORS_ORIGINS` بگذارید. CSP نمونه فقط فونت Google و تصاویر دامنهٔ فعلی `image.qwenlm.ai` را مجاز می‌کند؛ اگر asset واقعی از میزبان دیگری می‌آید، یا آن را به میزبانی تحت کنترل خود منتقل کنید یا origin دقیق و ضروری را پس از بررسی به CSP اضافه کنید. CSP را ابتدا در staging آزمایش کنید. `helmet` روی پاسخ‌های backend فعال است؛ چون فایل‌های build را Nginx سرو می‌کند، CSP و headerهای فایل‌های frontend باید در همین وب‌سرور اعمال شوند.

### نمونهٔ مدیر سرویس systemd

این نمونه را متناسب با مسیرها و سیاست سرور بازبینی کنید. کاربر `tasis`, مسیر نصب و فایل env باید قبلاً به‌صورت امن ایجاد شده باشند.

```ini
[Unit]
Description=Tasis Store API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=tasis
Group=tasis
WorkingDirectory=/opt/tasis/server
EnvironmentFile=/etc/tasis/server.env
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

پیش از فعال‌سازی، بررسی کنید مسیر Node.js واقعی با `command -v node` سازگار باشد، backend به دایرکتوری نوشتنی نیاز نداشته باشد، و `/etc/tasis/server.env` فقط برای root و کاربر سرویس قابل‌خواندن باشد. پس از ثبت unit، `systemctl daemon-reload`, `systemctl enable --now tasis-api` و `systemctl status tasis-api` را اجرا کنید؛ log را از `journalctl -u tasis-api` ببینید و مطمئن شوید secrets در log ظاهر نمی‌شوند.

## ۷. پرداخت زرین‌پال

1. Merchant ID، وضعیت پذیرنده، واحد پول، توضیح پرداخت و دامنهٔ callback را از زرین‌پال تأیید بگیرید.
2. `SERVER_URL` باید از اینترنت با HTTPS در دسترس باشد و مسیر زیر را به backend برساند:
   `https://<SERVER_URL>/api/payment/callback`
3. مقدار `ZARINPAL_MODE=real`, `ZARINPAL_SANDBOX=false` و Merchant ID live را فقط روی production تنظیم کنید.
4. واحد `ZARINPAL_CURRENCY` را با پذیرنده هماهنگ کنید. برنامه قیمت سفارش را به تومان نگه می‌دارد؛ `IRR` به ریال ×۱۰ تبدیل می‌شود، اما `IRT` به همان مقدار تومان می‌رود.
5. مسیر «شروع پرداخت → انتقال به درگاه → callback → verify سمت سرور → ثبت وضعیت سفارش» را در staging با sandbox بررسی کنید. صرفاً بازگشت مرورگر از درگاه تأیید پرداخت نیست؛ تغییر وضعیت paid باید پس از verify سرور باشد.
6. قبل از استفادهٔ واقعی، یک پرداخت کوچک کنترل‌شده با رضایت کارفرما انجام و تطبیق ref/مبلغ در پنل زرین‌پال و سیستم ثبت شود. مشخص کنید چه کسی مغایرت و پرداخت تکراری را بررسی می‌کند.

در production از `/mock-gateway` استفاده نکنید. مسیر نتیجهٔ frontend از `FRONTEND_URL` ساخته می‌شود؛ صفحهٔ نتیجه، جای تطبیق مالی در پنل پذیرنده را نمی‌گیرد.

## ۸. پیامک ورود و OTP

1. در پنل کاوه‌نگار قالب Verify Lookup را برای نام `KAVENEGAR_OTP_TEMPLATE` ایجاد/تأیید کنید و token قالب را با رفتار provider تطبیق دهید.
2. `KAVENEGAR_API_KEY` واقعی را از Secret Manager تزریق کنید؛ endpoint سرویس شامل API Key است، پس log پراکسی/خروجی را طوری تنظیم کنید که query string یا URL کامل ثبت نشود.
3. `OTP_RETURN_IN_RESPONSE=false`, `OTP_DEV_FIXED_CODE=` خالی، `NODE_ENV=production` و `KAVENEGAR_API_KEY` غیرخالی باشد. برنامه در غیر این صورت production را شروع نمی‌کند یا پیام واقعی ارسال نمی‌کند.
4. با شمارهٔ آزمایشی مجاز و رضایت صاحب شماره درخواست OTP بدهید، رسیدن پیامک، زمان انقضا، تعداد تلاش و رفتار resend را بررسی کنید. OTP را در گزارش، screenshot یا ticket ثبت نکنید.
5. محدودیت‌ها را با سیاست ضدسوءاستفادهٔ بخش «مانع انتشار» تکمیل کنید؛ cooldown داخل برنامه به‌تنهایی محافظت کافی در برابر هزینهٔ پیامک ناخواسته نیست.

## ۹. وضعیت کنترل‌های امنیتی و موارد باقی‌مانده

موارد زیر در backend اضافه شده‌اند؛ قبل از انتشار با دامنه و reverse proxy واقعی staging شوند:

- CORS origin دقیق را با `FRONTEND_URL`/`CORS_ORIGINS` محدود می‌کند و middleware رد 403 دارد. تنظیم wildcard یا اعتبار دادن به Originهای دلخواه اضافه نکنید.
- OTP request/verify، ورود مدیر، ثبت سفارش، شروع پرداخت و بررسی وضعیت پرداخت rate limit پایدار در PostgreSQL دارند: ثبت سفارش ۲۰ درخواست برای هر IP در ۱۵ دقیقه و ۱۰ سفارش برای هر شمارهٔ معتبر در یک ساعت؛ شروع پرداخت ۱۰ درخواست برای هر IP در ۱۵ دقیقه؛ بررسی وضعیت پرداخت ۶۰ درخواست برای هر IP در دقیقه. پاسخ محدودشده `429` و `Retry-After` دارد. callback درگاه rate limit نشده تا retryهای provider مختل نشوند؛ وضعیت تراکنش در آن idempotent بررسی می‌شود. endpoint وضعیت پرداخت فقط کد/مبلغ سفارش و وضعیت/مبلغ/کد پیگیری تراکنش را برمی‌گرداند و اطلاعات تماس، نشانی و PAN کارت را افشا نمی‌کند. این سقف‌ها با ترافیک واقعی و سناریوهای NAT در staging تنظیم شوند. WAF برای ترافیک حجمی لازم است و limiter برنامه جای آن نیست.
- Helmet برای security headers پاسخ‌های API فعال است. CSP روی پاسخ‌های استاتیک frontend باید در reverse proxy/CDN تنظیم شود؛ نمونهٔ Nginx بالاتر مبتنی بر assetهای فعلی است و قبل از production آزمون مرورگر لازم دارد.
- body limit برنامه و reverse proxy فعلاً 25MB است. اگر upload asset از پنل استفاده می‌شود، اندازه، MIME، storage، دسترسی و هزینه را جداگانه بازبینی کنید.
- log برنامه method/status/duration و request ID را بدون URL، query، بدنه، IP، شماره موبایل یا token ثبت می‌کند؛ error log پیام خطا را با redaction محدود ثبت می‌کند. log rotation، retention، دسترسی، ارسال به سامانهٔ مرکزی و alert خطا/DB در میزبان production هنوز باید تنظیم و تست شود.

موارد زیر نیازمند تصمیم/تغییر بیشتر پیش از دسترسی عمومی‌اند:

- frontend همچنان token مدیر و مشتری را در `localStorage` نگه می‌دارد؛ XSS می‌تواند به token دسترسی پیدا کند. باید XSS/CSP به‌دقت بررسی شود و معماری session امن (ترجیحاً cookie `HttpOnly`, `Secure`, `SameSite` همراه CSRF controls) به‌عنوان کار مستقل طراحی و آزموده شود. مهاجرت سریع به cookie بدون CSRF/compatibility plan امن نیست.
- طول عمر پیش‌فرض JWT هنوز `30d` و frontend token را در مرورگر نگه می‌دارد؛ production مقدار کوتاه‌تر و روال لغو/تعویض نشست نیاز دارد. تغییر تنظیم به‌تنهایی tokenهای صادرشدهٔ موجود را کوتاه نمی‌کند.
- تصاویر نمونه و برخی assetها از URL بیرونی می‌آیند. مالکیت/مجوز، پایداری و HTTPS را بررسی و assetهای نهایی را به فضای میزبانی تحت کنترل کارفرما منتقل کنید؛ CSP فعلی فقط دامنهٔ نمونه را مجاز می‌کند.
- وضعیت gateway در `GET /api/health` بر اساس تنظیمات است، نه آزمون واقعی provider؛ مانیتورینگ خارجی و بررسی callback, SMS و تراکنش آزمایشی لازم‌اند.

این فهرست صرفاً تنظیم زیرساخت نیست و جایگزین code review/security assessment مستقل نمی‌شود. تا زمان رسیدگی به موارد بالا، سایت را به‌عنوان storefront پروداکشن عمومی تلقی نکنید.

## ۱۰. حساب مدیر و تحویل دسترسی

- در startup نخست production، `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_NAME` برای bootstrap حساب استفاده می‌شوند، به شرطی که آن username از قبل وجود نداشته باشد.
- اگر DB از dump دادهٔ قبلی restore شده، حساب‌ها و hashهای مدیر از دیتابیس می‌آیند؛ تغییر `ADMIN_PASSWORD` در environment رمز موجود را عوض نمی‌کند. پس از restore، با حساب مجاز وارد شوید و رمز را از پنل تغییر دهید.
- رمز آزمایشی `admin/admin123` را برای دسترسی عمومی فعال نگذارید. برای هر شخص حساب یکتا، نقش با حداقل دسترسی، رمز اولیهٔ امن و روش تحویل خصوصی تعیین کنید؛ حساب تست/قدیمی را حذف یا غیرفعال کنید.
- حساب ادمین هنگام ورود در مرورگر token می‌گیرد. پس از تعویض `JWT_SECRET` کاربران نیاز به ورود دوباره دارند.
- دسترسی SSH، DB، DNS، پنل provider، Secret Manager و backup را جداگانه و فقط به مسئول مشخص تحویل دهید. secrets را در README تحویل وارد نکنید.

## ۱۱. آزمون پذیرش قبل از Go-live

در staging با تنظیمات و نسخهٔ schema مشابه production اجرا کنید:

1. `npm ci`, `npm run typecheck`, `npm run build` موفق باشند.
2. backend با `NODE_ENV=production` و secrets staging شروع شود؛ startup نباید mock payment، SMS mock یا OTP-return را قبول کند.
3. `GET https://<دامنه>/api/health` پاسخ `ok: true` بدهد و `payment`/`sms` وضعیت مورد انتظار را نشان دهد. این endpoint فقط اتصال DB و وضعیت کلی را بررسی می‌کند؛ موفقیت پرداخت یا SMS را ثابت نمی‌کند.
4. صفحهٔ اصلی، مسیرهای SPA، تصاویر، صفحات محصول، سبد/checkout و صفحهٔ `payment-result` روی HTTPS بارگذاری شوند.
5. ورود و خروج مشتری با OTP واقعی staging، تغییر پروفایل، ثبت سفارش و مشاهدهٔ سفارش خود مشتری کار کند.
6. نقش‌های ادمین آزمایش شوند: کاربر فاقد بخش مجاز نباید به API مدیریتی دسترسی داشته باشد؛ مدیر مجاز بتواند مشتری، محصول، سفارش، گزارش و عملیات مورد نیاز را انجام دهد.
7. موجودی در سفارش موفق کم و در خطای موجودی حفظ شود؛ درخواست‌های هم‌زمان موجودی منفی نسازند.
8. پرداخت sandbox مسیر callback و verify سمت سرور را طی کند؛ callback تکراری پرداخت/پورسانت را تکرار نکند.
9. ثبت وضعیت مرسوله، مرجوعی و refund را طبق فرایند عملیاتی تمرین کنید. این نسخه به شرکت حمل متصل نیست و انتقال وجه refund/affiliate را خودکار انجام نمی‌دهد.
10. backup کامل تولید، انتقال به محل امن و restore روی DB جداگانه را اجرا کنید. اندازه/شمار رکورد و ورود مدیریتی پس از restore را تأیید کنید.
11. log، مانیتورینگ، تمدید TLS، restart بعد از reboot و alert قطع DB/افزایش 5xx را بررسی کنید.
12. با نمایندهٔ کارفرما آزمون پذیرش checkout، متن قوانین، قیمت/واحد پول، هزینه ارسال، سیاست حریم خصوصی و عملیات روزانه را امضا کنید.

در cutover، کار با SQLite قدیمی را متوقف/فریز کنید تا نوشتن جدید بعد از آخرین dump جا نماند؛ dump نهایی بگیرید، مقصد را restore/verify کنید، DNS/proxy را تغییر دهید، پرداخت و OTP را smoke-test کنید و شخص مسئول rollback را حاضر نگه دارید. در صورت برگشت، از نوشتن هم‌زمان روی دو DB خودداری کنید و سفارش‌های زمان cutover را دستی تطبیق دهید.

## ۱۲. پشتیبان‌گیری، بازیابی و رخداد

- برنامهٔ backup خودکار PostgreSQL را از provider یا `pg_dump` زمان‌بندی کنید؛ کپی فقط روی همان volume/میزبان کافی نیست.
- backup رمزگذاری‌شده، دسترسی محدود، retention مورد تأیید کارفرما و alert شکست backup داشته باشد.
- حداقل هر فصل و بعد از تغییر مهم، restore را روی محیط جدا تمرین و زمان واقعی بازیابی را ثبت کنید.
- dump ممکن است اطلاعات شخصی، hash رمز، OTP، شناسه پرداخت و داده‌های عملیاتی داشته باشد؛ مانند دادهٔ حساس طبقه‌بندی شود.
- incident دیتابیس: ثبت زمان/دامنه اثر، توقف تغییرات ناامن، حفظ log و backup، اطلاع به مسئول داده؛ از اجرای restore/پاک‌سازی بدون تأیید صاحب داده خودداری شود.
- migration schema در startup برنامه انجام می‌شود؛ پیش از deploy نسخه‌ای که schema را تغییر می‌دهد backup بگیرید و سازگاری نسخهٔ قبلی/جدید را در staging بررسی کنید.

## ۱۳. عملیات‌هایی که هنوز به سرویس بیرونی متصل نیستند

این رفتارها برای کارفرما باید شفاف باشد و برای آن‌ها SOP تعیین شود:

- ارسال/رهگیری مرسوله، چاپ label و نرخ حمل به carrier API متصل نیست؛ وضعیت‌ها در پنل دستی ثبت می‌شوند.
- refund فقط بعد از انتقال وجه خارج از برنامه توسط کاربر مجاز ثبت می‌شود؛ ثبت آن انتقال بانکی انجام نمی‌دهد و موجودی کالا را خودکار برنمی‌گرداند.
- ثبت payout «paid» گزارش حواله‌ای است که مدیر بیرون از برنامه انجام داده؛ اتصال به بانک یا پرداخت خودکار افیلیت وجود ندارد.
- اتوماسیون‌های پیام و کمپین‌های checkout طبق سیاست فعلی خاموش‌اند؛ وجود صفحه/تنظیم در پنل به معنی ارسال پیام یا اجرای campaign نیست.
- OTP به کاوه‌نگار متصل می‌شود؛ email notification/سرویس‌های دیگری که در پنل نمایش داده می‌شوند باید جداگانه از نظر integration واقعی بررسی شوند.

## ۱۴. چک‌لیست نهایی امضای تحویل

- [ ] دامنه، HTTPS، DNS و reverse proxy در مالکیت کارفرماست.
- [ ] Node/backend و static frontend نسخهٔ مورد تأیید و قابل بازگشت دارند.
- [ ] PostgreSQL خصوصی، TLS معتبر، کاربر محدود و سقف pool تنظیم شده است.
- [ ] دادهٔ نهایی restore و صحت جدول‌های مهم تأیید شده است.
- [ ] حساب مدیر پیش‌فرض/آزمایشی عوض شده و حساب‌ها/نقش‌ها تحویل شده‌اند.
- [ ] زرین‌پال live و واحد پول با پذیرنده تطبیق داده شده است.
- [ ] کاوه‌نگار live و قالب OTP با شمارهٔ مجاز آزموده شده است.
- [ ] `OTP_RETURN_IN_RESPONSE=false`, `OTP_DEV_FIXED_CODE` خالی و `NODE_ENV=production` است.
- [ ] allowlist CORS و `TRUST_PROXY` با origin و topology واقعی آزموده شده‌اند.
- [ ] limiterهای PostgreSQL، WAF و rate policy مسیرهای checkout/payment بار تحت سناریوهای واقعی آزموده شده‌اند.
- [ ] security headers و CSP روی پاسخ‌های استاتیک production با صفحات، فونت و عکس واقعی آزموده شده‌اند.
- [ ] log redaction، rotation/retention، دسترسی و alert خطا/DB در میزبان بررسی شده‌اند.
- [ ] تصمیم session/JWT و خطر token در localStorage با مسئول امنیت/مالک محصول ثبت شده است.
- [ ] backup بیرون از سرور و restore آزمایشی موفق است؛ RPO/RTO مکتوب است.
- [ ] محدودیت‌های عملیات دستی (ارسال، refund، payout، اتوماسیون) به مسئولان آموزش داده شده است.
- [ ] مسئول هر سرویس، تمدید TLS، مانیتورینگ، backup و incident مشخص است.
