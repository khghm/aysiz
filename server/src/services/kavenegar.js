import { config, isKavenegarLive } from '../config.js';

// ─────────────────────────────────────────────────────────────────────────────
// سرویس ارسال کد یکبار مصرف کاوه‌نگار
//
// حالت تستی (پیش‌فرض فعلی): وقتی KAVENEGAR_API_KEY در .env خالی باشد، هیچ پیامکی
// ارسال نمی‌شود؛ کد در کنسول سرور چاپ و (اگر OTP_RETURN_IN_RESPONSE=true) در
// پاسخ API هم برگردانده می‌شود تا فلوی احراز هویت بدون خرید سرویس قابل تست باشد.
//
// حالت واقعی: کافی است KAVENEGAR_API_KEY و KAVENEGAR_OTP_TEMPLATE (قالب Verify
// Lookup ساخته‌شده در پنل کاوه‌نگار) را در .env قرار دهید؛ همین تابع بدون تغییر
// کد، پیامک واقعی ارسال می‌کند.
// ─────────────────────────────────────────────────────────────────────────────

export async function sendOtpSms(phone, code) {
  if (!isKavenegarLive()) {
    console.log('──────────────────────────────────────');
    console.log(`[OTP حالت تستی] کد ارسال‌شده به ${phone}: ${code}`);
    console.log('──────────────────────────────────────');
    return { sent: false, testMode: true };
  }

  // مستندات: https://kavenegar.com/rest.html — سرویس Verify/Lookup
  const params = new URLSearchParams({ receptor: phone, token: code, template: config.kavenegar.template });
  if (config.kavenegar.sender) params.set('sender', config.kavenegar.sender);
  const url = `https://api.kavenegar.com/v1/${config.kavenegar.apiKey}/verify/lookup.json?${params}`;

  try {
    const res = await fetch(url, { method: 'GET' });
    const data = await res.json();
    if (data?.return?.status === 200) {
      return { sent: true, testMode: false, messageid: data.entries?.[0]?.messageid };
    }
    console.error('[kavenegar] send failed:', data?.return?.message, '(status:', data?.return?.status, ')');
    return { sent: false, testMode: false, error: data?.return?.message || 'sms_send_failed' };
  } catch (err) {
    console.error('[kavenegar] request error:', err.message);
    return { sent: false, testMode: false, error: 'sms_provider_unreachable' };
  }
}
