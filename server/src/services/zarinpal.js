import { config, isMockZarinpal } from '../config.js';
import { uid } from '../util.js';

// ─────────────────────────────────────────────────────────────────────────────
// درگاه پرداخت زرین‌پال (Zarinpal v4 / PG)
//
// حالت تستی (پیش‌فرض فعلی): تا زمانی که ZARINPAL_MERCHANT_ID در .env مقدار واقعی
// نگرفته باشد (یا ZARINPAL_MODE=mock باشد)، درگاه به‌صورت کامل شبیه‌سازی می‌شود:
//   1) request → یک Authority ساختگی ساخته می‌شود
//   2) کاربر به صفحه شبیه‌ساز درگاه (mock-gateway) هدایت می‌شود و دکمه‌های
//      «پرداخت موفق / ناموفق» دارد
//   3) verify همان‌طور که درگاه واقعی انجام می‌دهد، تراکنش را تأیید و کد رهگیری
//      صادر می‌کند
// پس از دریافت مرچنت آی‌دی واقعی، فقط مقدار ZARINPAL_MERCHANT_ID را در .env جایگزین
// کنید — بقیه فلوی پرداخت بدون هیچ تغییر کدی روی درگاه واقعی کار خواهد کرد.
//
// مستندات رسمی: https://docs.zarinpal.com/payment-gateway/
//   Request: POST https://api.zarinpal.com/pg/v4/payment/request.json
//   StartPay: https://www.zarinpal.com/pg/StartPay/{authority}
//   Verify : POST https://api.zarinpal.com/pg/v4/payment/verify.json
// ─────────────────────────────────────────────────────────────────────────────

const REAL_API = 'https://api.zarinpal.com/pg/v4/payment';
const SANDBOX_API = 'https://sandbox.zarinpal.com/pg/v4/payment';
const REAL_STARTPAY = 'https://www.zarinpal.com/pg/StartPay/';
const SANDBOX_STARTPAY = 'https://sandbox.zarinpal.com/pg/StartPay/';

const apiBase = () => (config.zarinpal.sandbox ? SANDBOX_API : REAL_API);
const startPayBase = () => (config.zarinpal.sandbox ? SANDBOX_STARTPAY : REAL_STARTPAY);

export function paymentRedirectUrl(authority) {
  if (isMockZarinpal()) return `${config.serverUrl.replace(/\/$/, '')}/mock-gateway/${authority}`;
  return `${startPayBase()}${authority}`;
}

// مبلغ ورودی تومان است؛ زرین‌پال پیش‌فرض ریال است
export function toGatewayAmount(toman) {
  return config.zarinpal.currency === 'IRT' ? Math.round(toman) : Math.round(toman) * 10;
}

export async function paymentRequest({ amountToman, callbackUrl, description, mobile }) {
  if (isMockZarinpal()) {
    // redirectUrl توسط route از روی SERVER_URL ساخته می‌شود (صفحه شبیه‌ساز درگاه روی خود سرور)
    return { mock: true, authority: `MOCK${uid('auth')}`.toUpperCase().replace(/-/g, ''), serverUrlNeeded: true };
  }

  const body = {
    merchant_id: config.zarinpal.merchantId,
    amount: toGatewayAmount(amountToman),
    currency: config.zarinpal.currency,
    callback_url: callbackUrl,
    description: description || config.zarinpal.description,
    metadata: mobile ? { mobile } : undefined,
  };

  try {
    const res = await fetch(`${apiBase()}/request.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const { code, message } = data?.errors && Object.keys(data.errors).length ? data.errors : { code: data?.data?.code, message: null };
    if (data?.data?.code === 100 && data.data.authority) {
      return { mock: false, authority: data.data.authority, redirectUrl: paymentRedirectUrl(data.data.authority) };
    }
    return { mock: false, error: message || `zarinpal_error_${code}`, code };
  } catch (err) {
    console.error('[zarinpal] request error:', err.message);
    return { mock: false, error: 'gateway_unreachable' };
  }
}

export async function paymentVerify({ amountToman, authority }) {
  if (isMockZarinpal()) {
    // در حالت شبیه‌ساز، تأیید همیشه به شرط Status=OK معتبر است
    return {
      mock: true,
      verified: true,
      code: 100,
      refId: `MOCK-${Date.now()}`,
      cardPan: '6037********0000',
    };
  }

  const body = {
    merchant_id: config.zarinpal.merchantId,
    amount: toGatewayAmount(amountToman),
    authority,
  };

  try {
    const res = await fetch(`${apiBase()}/verify.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const code = data?.data?.code;
    if (code === 100 || code === 101) {
      return {
        mock: false,
        verified: true,
        code,
        refId: String(data.data.ref_id),
        cardPan: data.data.card_pan || '',
      };
    }
    const errObj = data?.errors || {};
    const errCode = Object.keys(errObj).length ? errObj.code : code;
    return { mock: false, verified: false, code: errCode, error: errObj.message || `verify_failed_${errCode}` };
  } catch (err) {
    console.error('[zarinpal] verify error:', err.message);
    return { mock: false, verified: false, error: 'gateway_unreachable' };
  }
}
