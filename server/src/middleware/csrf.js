import { randomBytes } from 'node:crypto';

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const cookies = {};
  header.split(';').forEach((part) => {
    const [key, ...rest] = part.trim().split('=');
    if (key) cookies[key] = decodeURIComponent(rest.join('='));
  });
  return cookies;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function issueCsrfToken(res) {
  const token = randomBytes(32).toString('hex');
  res.cookie('tasis_csrf', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return token;
}

export function csrfProtection(req, res, next) {
  if (process.env.NODE_ENV === 'test') return next();
  if (SAFE_METHODS.has(req.method)) return next();
  // Skip CSRF for auth endpoints that issue tokens
  const p = req.path || '';
  if (p.endsWith('/otp/request') || p.endsWith('/otp/verify') || p.endsWith('/admin-login') || p.endsWith('/logout') || p.endsWith('/admin-logout')) return next();
  const cookies = parseCookies(req);
  const cookieToken = cookies.tasis_csrf;
  const headerToken = req.get('X-CSRF-Token');
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'csrf_failed', message: 'CSRF token نامعتبر است' });
  }
  // Rotate CSRF token after successful validation (defense-in-depth)
  issueCsrfToken(res);
  next();
}
