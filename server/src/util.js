import crypto from 'node:crypto';

export const uid = (prefix = 'id') => `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;

export const nowIso = () => new Date().toISOString();

// تبدیل ارقام فارسی/عربی به لاتین و نرمال‌سازی شماره موبایل ایرانی به فرمت 09xxxxxxxxx
export function normalizePhone(input) {
  if (!input) return null;
  let s = String(input).trim();
  s = s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  s = s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  s = s.replace(/[\s-()+]/g, '');
  if (s.startsWith('0098')) s = '0' + s.slice(4);
  else if (s.startsWith('98') && s.length === 12) s = '0' + s.slice(2);
  else if (s.startsWith('9') && s.length === 10) s = '0' + s;
  if (/^09\d{9}$/.test(s)) return s;
  return null;
}

export function otpCode() {
  return String(crypto.randomInt(100000, 1000000));
}

export function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(candidate, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function orderCode() {
  return `SQ-${String(Date.now()).slice(-6)}${crypto.randomInt(0, 9)}`;
}

// همه مبالغ در سیستم به تومان ذخیره می‌شوند
export const tomanToRial = (toman) => Math.round(Number(toman) * 10);

export function isValidMerchantPayload(m = {}) {
  return typeof m === 'object' && m !== null;
}
