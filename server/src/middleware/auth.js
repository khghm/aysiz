import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { db } from '../db.js';

export function signToken(payload, audience, expiresIn = config.jwtExpiresIn) {
  return jwt.sign(payload, config.jwtSecret, { subject: audience, expiresIn });
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const cookies = {};
  header.split(';').forEach((part) => {
    const [key, ...rest] = part.trim().split('=');
    if (key) cookies[key] = decodeURIComponent(rest.join('='));
  });
  return cookies;
}

function readToken(req) {
  const cookies = parseCookies(req);
  if (cookies.tasis_customer) return cookies.tasis_customer;
  if (cookies.tasis_admin) return cookies.tasis_admin;
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

// احراز هویت اختیاری — اگر توکن معتبر باشد req.user پر می‌شود، وگرنه ادامه می‌دهد
export function optionalAuth(audience) {
  return (req, _res, next) => {
    const token = readToken(req);
    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwtSecret, { subject: audience });
        req.user = decoded;
      } catch { /* توکن نامعتبر نادیده گرفته می‌شود */ }
    }
    next();
  };
}

export function requireAuth(audience) {
  return async (req, res, next) => {
    const token = readToken(req);
    if (!token) return res.status(401).json({ error: 'unauthorized', message: 'ابتدا وارد حساب شوید' });
    try {
      req.user = jwt.verify(token, config.jwtSecret, { subject: audience });
    } catch {
      return res.status(401).json({ error: 'unauthorized', message: 'نشست شما منقضی شده است' });
    }
    if (audience === 'customer' && req.user?.id) {
      const row = await db.prepare('SELECT is_blocked FROM customers WHERE id = ?').get(req.user.id);
      if (row?.is_blocked) {
        return res.status(403).json({ error: 'blocked', message: 'حساب شما مسدود شده است' });
      }
    }
    next();
  };
}

export const requireCustomer = requireAuth('customer');

const adminSections = [
  ['/api/orders/pos', 'pos'],
  ['/api/orders', 'orders'],
  ['/api/products', 'products'],
  ['/api/uploads', 'products'],
  ['/api/discounts', 'discounts'],
  ['/api/reviews', 'reviews'],
  ['/api/settings', 'settings'],
  ['/api/customers', 'customers'],
  ['/api/tickets', 'support'],
  ['/api/rmas', 'returns'],
  ['/api/carriers', 'logistics'],
  ['/api/vendors', 'vendors'],
  ['/api/campaigns', 'growth'],
  ['/api/automations', 'growth'],
  ['/api/invoices', 'finance'],
  ['/api/expenses', 'finance'],
  ['/api/bank-tx', 'finance'],
  ['/api/abandoned', 'insights'],
  ['/api/search-terms', 'insights'],
  ['/api/surveys', 'insights'],
  ['/api/assets', 'system'],
  ['/api/login-history', 'system'],
  ['/api/error-log', 'system'],
  ['/api/content', 'content'],
  ['/api/affiliates', 'affiliates'],
  ['/api/tasks', 'tasks'],
  ['/api/articles', 'content'],
];

function sectionForRequest(req) {
  const pathname = req.originalUrl.split('?')[0];
  if (pathname === '/api/admin/me') return 'home';
  if (pathname === '/api/admin/loyalty') return 'growth';
  if (pathname === '/api/admin/aff-config') return 'affiliates';
  if (pathname.startsWith('/api/admin/')) return 'system';
  return adminSections.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] || null;
}

export async function requireAdmin(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'unauthorized', message: 'ابتدا وارد حساب شوید' });
  try {
    req.user = jwt.verify(token, config.jwtSecret, { subject: 'admin' });
  } catch {
    return res.status(401).json({ error: 'unauthorized', message: 'نشست شما منقضی شده است' });
  }

  const admin = await db.prepare(
    `SELECT a.id, a.username, a.name, a.role_id, r.json AS role_json
     FROM admin_users a LEFT JOIN roles r ON r.id = a.role_id
     WHERE a.id = ?`
  ).get(req.user.id);
  if (!admin) return res.status(401).json({ error: 'unauthorized', message: 'نشست مدیر معتبر نیست' });

  const role = admin.role_json ? JSON.parse(admin.role_json) : null;
  if (!role) return res.status(403).json({ error: 'role_not_assigned', message: 'برای حساب مدیر نقشی تعریف نشده است' });
  const pathname = req.originalUrl.split('?')[0];
  const isIdentityRequest = pathname === '/api/admin/me';
  const isAuditWrite = pathname === '/api/admin/audit' && req.method === 'POST';
  const requiredSection = sectionForRequest(req);
  const allowed = isIdentityRequest
    || (isAuditWrite && Array.isArray(role.sections) && role.sections.length > 0)
    || (requiredSection && Array.isArray(role.sections) && role.sections.includes(requiredSection));
  if (!allowed) {
    return res.status(403).json({ error: 'forbidden', message: 'دسترسی لازم برای این بخش را ندارید' });
  }

  req.user = { ...req.user, username: admin.username, name: admin.name, roleId: admin.role_id, roleName: role.name };
  req.adminRole = role;
  return next();
}
