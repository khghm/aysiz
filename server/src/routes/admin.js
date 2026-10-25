import { Router } from 'express';
import { db } from '../db.js';
import { uid, nowIso, hashPassword } from '../util.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const parse = (row) => JSON.parse(row.json);
const backupTables = [
  'customers', 'customer_notes', 'otp_requests', 'admin_users', 'products', 'reviews', 'articles',
  'discount_codes', 'orders', 'payment_transactions', 'settings', 'tickets', 'rmas', 'carriers',
  'vendors', 'vendor_settlements', 'rma_refunds', 'campaigns', 'automations', 'invoices', 'expenses', 'bank_tx',
  'abandoned', 'search_terms', 'pages', 'banners', 'posts', 'roles', 'audit_log', 'loyalty',
  'loyalty_transactions', 'integrations', 'surveys', 'assets', 'login_history', 'error_log', 'affiliates',
  'affiliate_clicks', 'affiliate_visits', 'affiliate_commissions', 'payouts',
  'tasks', 'aff_config',
];
const backupSchemaVersion = 6;
const availableSections = new Set([
  'home', 'reports', 'orders', 'products', 'finance', 'customers', 'reviews', 'discounts',
  'growth', 'returns', 'support', 'operations', 'system', 'settings', 'insights',
  'affiliates', 'pos', 'content', 'vendors', 'logistics', 'tasks',
]);

async function recordAdminAudit(req, action, target) {
  const t = nowIso();
  const id = uid('log');
  const entry = {
    id, action, actor: req.user.username, role: req.user.roleName,
    target, severity: 'warning', at: t,
  };
  (await db.prepare('INSERT INTO audit_log(id, json, created_at) VALUES(?, ?, ?)')
    .run(id, JSON.stringify(entry), t));
}

async function systemAdminCount({ roleId, sections, excludeAdminId } = {}) {
  return (await db.prepare('SELECT a.id, a.role_id, r.json AS role_json FROM admin_users a LEFT JOIN roles r ON r.id = a.role_id')
    .all())
    .filter((admin) => {
      if (admin.id === excludeAdminId) return false;
      const roleSections = admin.role_id === roleId && sections
        ? sections
        : admin.role_json ? JSON.parse(admin.role_json).sections : [];
      return Array.isArray(roleSections) && roleSections.includes('system');
    }).length;
}

function validRoleSections(sections) {
  return Array.isArray(sections)
    && sections.every((section) => typeof section === 'string' && availableSections.has(section));
}

async function getLoyaltyMembers() {
  return (await db.prepare(
    `SELECT c.id, c.name, c.phone,
            COALESCE(SUM(CASE t.type WHEN 'redeem' THEN -t.points ELSE t.points END), 0) AS points,
            MAX(t.created_at) AS "lastEarnedAt"
     FROM customers c LEFT JOIN loyalty_transactions t ON t.customer_id = c.id
     GROUP BY c.id ORDER BY points DESC, c.created_at DESC`
  ).all());
}

router.get('/me', requireAdmin, (req, res) => {
  res.json({
    admin: {
      id: req.user.id,
      username: req.user.username,
      name: req.user.name,
      roleId: req.user.roleId,
      roleName: req.user.roleName,
      sections: req.adminRole.sections,
    },
  });
});

router.get('/backup', requireAdmin, async (_req, res) => {
  const entries = await Promise.all(backupTables.map(async (table) => [
    table,
    await db.prepare(`SELECT * FROM "${table}"`).all(),
  ]));
  const tables = Object.fromEntries(entries);
  res.json({
    format: 'tasis-database-backup',
    schemaVersion: backupSchemaVersion,
    createdAt: nowIso(),
    tables,
  });
});

router.post('/backup/restore', requireAdmin, async (req, res) => {
  const backup = req.body;
  const legacyVersion = backup?.schemaVersion === 4 || backup?.schemaVersion === 5;
  const legacyExpectedTables = backup?.schemaVersion === 4
    ? backupTables.filter((table) => table !== 'rma_refunds')
    : backupTables;
  const legacyTables = legacyVersion
    && backup.tables && typeof backup.tables === 'object' && !Array.isArray(backup.tables)
    && Object.keys(backup.tables).length === legacyExpectedTables.length
    && legacyExpectedTables.every((table) => Array.isArray(backup.tables[table]));
  const tables = legacyTables
    ? {
      ...backup.tables,
      ...(backup.schemaVersion === 4 ? { rma_refunds: [] } : {}),
      affiliate_commissions: backup.tables.affiliate_commissions.map((commission) => {
        if (Object.hasOwn(commission, 'review_status')) return commission;
        const order = backup.tables.orders.find((row) => row.id === commission.order_id);
        let refunded = false;
        if (order && typeof order.json === 'string') {
          try {
            refunded = Number(JSON.parse(order.json).refundedAmount || 0) > 0;
          } catch {
            refunded = false;
          }
        }
        return {
          ...commission,
          review_status: refunded && commission.status === 'pending' ? 'review' : 'none',
          reviewed_at: null,
          reviewed_by: null,
        };
      }),
    }
    : backup?.tables;
  if (!backup || !['tasis-database-backup', 'tasis-sqlite-backup'].includes(backup.format)
    || (backup.schemaVersion !== backupSchemaVersion && !legacyTables)
    || !tables || typeof tables !== 'object' || Array.isArray(tables)
    || Object.keys(tables).length !== backupTables.length
    || backupTables.some((table) => !Array.isArray(tables[table]))) {
    return res.status(400).json({ error: 'invalid_backup', message: 'ساختار یا نسخه فایل پشتیبان معتبر نیست' });
  }

  const columnEntries = await Promise.all(backupTables.map(async (table) => [
    table,
    (await db.prepare(
      `SELECT column_name AS name FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = ?
       ORDER BY ordinal_position`
    ).all(table)).map((column) => column.name),
  ]));
  const columnMap = Object.fromEntries(columnEntries);
  for (const table of backupTables) {
    const columns = columnMap[table];
    for (const row of tables[table]) {
      if (!row || typeof row !== 'object' || Array.isArray(row)
        || Object.keys(row).length !== columns.length
        || columns.some((column) => !Object.hasOwn(row, column))) {
        return res.status(400).json({ error: 'invalid_backup', message: `ساختار جدول ${table} در فایل پشتیبان معتبر نیست` });
      }
    }
  }

  const currentAdmin = (await db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.user.id));
  const currentRole = currentAdmin?.role_id
    ? (await db.prepare('SELECT * FROM roles WHERE id = ?').get(currentAdmin.role_id))
    : null;
  if (!currentAdmin || !currentRole || !JSON.parse(currentRole.json).sections?.includes('system')) {
    return res.status(409).json({ error: 'admin_restore_protection', message: 'حساب مدیر جاری یا نقش سیستمی آن معتبر نیست' });
  }

  try {
    await db.exec('BEGIN IMMEDIATE');
    for (const table of backupTables) await db.exec(`DELETE FROM "${table}"`);
    for (const table of backupTables) {
      const columns = columnMap[table];
      const placeholders = columns.map(() => '?').join(', ');
      const insert = db.prepare(`INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(', ')}) VALUES (${placeholders})`);
      for (const row of tables[table]) {
        if (table === 'admin_users' && row.id === currentAdmin.id) continue;
        await insert.run(...columns.map((column) => row[column]));
      }
    }
    await db.prepare(
      `INSERT INTO roles(id, json, updated_at) VALUES(?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET json = EXCLUDED.json, updated_at = EXCLUDED.updated_at`
    )
      .run(currentRole.id, currentRole.json, currentRole.updated_at);
    await db.prepare(
      `INSERT INTO admin_users(id, username, password_hash, name, role_id, created_at)
       VALUES(?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET username = EXCLUDED.username,
         password_hash = EXCLUDED.password_hash, name = EXCLUDED.name,
         role_id = EXCLUDED.role_id, created_at = EXCLUDED.created_at`
    ).run(currentAdmin.id, currentAdmin.username, currentAdmin.password_hash, currentAdmin.name, currentAdmin.role_id, currentAdmin.created_at);
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
  await recordAdminAudit(req, 'بازیابی پشتیبان پایگاه‌داده', 'database');
  res.json({ ok: true });
});

router.get('/users', requireAdmin, async (_req, res) => {
  const items = (await db.prepare(
    `SELECT a.id, a.username, a.name, a.role_id AS "roleId", a.created_at AS "createdAt", r.json AS role_json
     FROM admin_users a LEFT JOIN roles r ON r.id = a.role_id ORDER BY a.created_at`
  ).all()).map(({ role_json, ...admin }) => ({
    ...admin,
    roleName: role_json ? JSON.parse(role_json).name : null,
  }));
  res.json({ items });
});

router.post('/users', requireAdmin, async (req, res) => {
  const { username, name, password, roleId } = req.body || {};
  if (!/^[a-zA-Z0-9._-]{3,64}$/.test(String(username || ''))
    || !String(name || '').trim()
    || typeof password !== 'string' || password.length < 12
    || typeof roleId !== 'string') {
    return res.status(400).json({ error: 'invalid_input', message: 'نام، نام کاربری معتبر، رمز حداقل ۱۲ کاراکتری و نقش الزامی است' });
  }
  const role = (await db.prepare('SELECT json FROM roles WHERE id = ?').get(roleId));
  if (!role) return res.status(400).json({ error: 'invalid_role', message: 'نقش انتخاب‌شده یافت نشد' });
  const roleData = JSON.parse(role.json);

  const id = uid('admin');
  try {
    (await db.prepare('INSERT INTO admin_users(id, username, password_hash, name, role_id, created_at) VALUES(?, ?, ?, ?, ?, ?)')
      .run(id, username, hashPassword(password), String(name).trim(), roleId, nowIso()));
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'username_exists', message: 'این نام کاربری قبلاً ثبت شده است' });
    }
    throw error;
  }
  await recordAdminAudit(req, 'ایجاد حساب مدیر', id);
  res.status(201).json({ id, username, name: String(name).trim(), roleId, roleName: roleData.name });
});

router.put('/users/:id', requireAdmin, async (req, res) => {
  const current = (await db.prepare('SELECT id, username, name, role_id FROM admin_users WHERE id = ?').get(req.params.id));
  if (!current) return res.status(404).json({ error: 'not_found' });
  const name = req.body?.name === undefined ? current.name : String(req.body.name).trim();
  const roleId = req.body?.roleId === undefined ? current.role_id : req.body.roleId;
  const password = req.body?.password;
  if (!name || typeof roleId !== 'string'
    || (password !== undefined && (typeof password !== 'string' || password.length < 12))) {
    return res.status(400).json({ error: 'invalid_input', message: 'نام، نقش و رمز جدید حداقل ۱۲ کاراکتری معتبر الزامی است' });
  }
  const role = (await db.prepare('SELECT json FROM roles WHERE id = ?').get(roleId));
  if (!role) return res.status(400).json({ error: 'invalid_role', message: 'نقش انتخاب‌شده یافت نشد' });
  const roleData = JSON.parse(role.json);
  const currentRole = current.role_id
    ? (await db.prepare('SELECT json FROM roles WHERE id = ?').get(current.role_id))
    : null;
  const currentIsSystemAdmin = currentRole && JSON.parse(currentRole.json).sections?.includes('system');
  if (currentIsSystemAdmin && !roleData.sections?.includes('system')
    && await systemAdminCount({ excludeAdminId: req.params.id }) === 0) {
    return res.status(409).json({ error: 'last_system_admin', message: 'تغییر نقش، آخرین مدیر دارای دسترسی سیستم را حذف می‌کند' });
  }
  if (password === undefined) {
    (await db.prepare('UPDATE admin_users SET name = ?, role_id = ? WHERE id = ?').run(name, roleId, req.params.id));
  } else {
    (await db.prepare('UPDATE admin_users SET name = ?, role_id = ?, password_hash = ? WHERE id = ?')
      .run(name, roleId, hashPassword(password), req.params.id));
  }
  await recordAdminAudit(req, 'ویرایش حساب مدیر', req.params.id);
  res.json({ id: current.id, username: current.username, name, roleId, roleName: roleData.name });
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(409).json({ error: 'cannot_delete_self', message: 'حساب مدیر جاری را نمی‌توان حذف کرد' });
  }
  const target = (await db.prepare('SELECT id, role_id FROM admin_users WHERE id = ?').get(req.params.id));
  if (!target) return res.status(404).json({ error: 'not_found' });
  if (await systemAdminCount({ excludeAdminId: target.id }) === 0) {
    return res.status(409).json({ error: 'last_system_admin', message: 'آخرین مدیر دارای دسترسی سیستم قابل حذف نیست' });
  }
  (await db.prepare('DELETE FROM admin_users WHERE id = ?').run(target.id));
  await recordAdminAudit(req, 'حذف حساب مدیر', target.id);
  res.json({ ok: true });
});

// ─── نقش‌ها و دسترسی‌ها ──────────────────────────────────────────────────────
router.get('/roles', requireAdmin, async (_req, res) => {
  const items = (await db.prepare('SELECT json FROM roles ORDER BY updated_at DESC').all()).map(parse);
  res.json({ items });
});

router.post('/roles', requireAdmin, async (req, res) => {
  const r = req.body || {};
  if (!String(r.name || '').trim() || !validRoleSections(r.sections || [])) {
    return res.status(400).json({ error: 'invalid_input', message: 'نام نقش و فهرست دسترسی‌های معتبر الزامی است' });
  }
  const id = r.id || uid('role');
  const role = { color: '#1A2238', sections: [], ...r, id };
  (await db.prepare('INSERT INTO roles(id, json, updated_at) VALUES(?, ?, ?)').run(id, JSON.stringify(role), nowIso()));
  await recordAdminAudit(req, 'ایجاد نقش مدیر', id);
  res.status(201).json(role);
});

router.put('/roles/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM roles WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const updated = { ...parse(row), ...req.body, id: req.params.id };
  if (!String(updated.name || '').trim() || !validRoleSections(updated.sections)) {
    return res.status(400).json({ error: 'invalid_input', message: 'نام نقش و فهرست دسترسی‌های معتبر الزامی است' });
  }
  if (await systemAdminCount({ roleId: req.params.id, sections: updated.sections }) === 0) {
    return res.status(409).json({ error: 'last_system_admin', message: 'این تغییر آخرین مدیر دارای دسترسی سیستم را حذف می‌کند' });
  }
  (await db.prepare('UPDATE roles SET json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(updated), nowIso(), req.params.id));
  await recordAdminAudit(req, 'ویرایش نقش مدیر', req.params.id);
  res.json(updated);
});

router.delete('/roles/:id', requireAdmin, async (req, res) => {
  if ((await db.prepare('SELECT id FROM admin_users WHERE role_id = ? LIMIT 1').get(req.params.id))) {
    return res.status(409).json({ error: 'role_in_use', message: 'ابتدا حساب‌های دارای این نقش را به نقش دیگری منتقل کنید' });
  }
  const info = (await db.prepare('DELETE FROM roles WHERE id = ?').run(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'not_found' });
  await recordAdminAudit(req, 'حذف نقش مدیر', req.params.id);
  res.json({ ok: true });
});

// ─── لاگ رویدادها (Audit) ───────────────────────────────────────────────────
router.get('/audit', requireAdmin, async (_req, res) => {
  const items = (await db.prepare('SELECT json FROM audit_log ORDER BY created_at DESC LIMIT 500').all()).map(parse);
  res.json({ items });
});

router.post('/audit', requireAdmin, async (req, res) => {
  const a = req.body || {};
  if (typeof a.action !== 'string' || !a.action.trim()) {
    return res.status(400).json({ error: 'invalid_input', message: 'رویداد الزامی است' });
  }
  const id = uid('log');
  const entry = {
    id,
    action: a.action.trim().slice(0, 200),
    actor: req.user.username,
    role: req.user.roleName,
    target: typeof a.target === 'string' ? a.target.slice(0, 200) : '-',
    severity: ['normal', 'warning', 'critical'].includes(a.severity) ? a.severity : 'normal',
    at: nowIso(),
  };
  (await db.prepare('INSERT INTO audit_log(id, json, created_at) VALUES(?, ?, ?)').run(id, JSON.stringify(entry), entry.at));
  res.status(201).json(entry);
});

// ─── یکپارچگی‌ها ────────────────────────────────────────────────────────────
router.get('/integrations', requireAdmin, async (_req, res) => {
  const items = (await db.prepare('SELECT json FROM integrations ORDER BY updated_at DESC').all()).map(parse);
  res.json({ items });
});

router.put('/integrations/:id', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT json FROM integrations WHERE id = ?').get(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  const updated = { ...parse(row), ...req.body, id: req.params.id };
  (await db.prepare('UPDATE integrations SET json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(updated), nowIso(), req.params.id));
  res.json(updated);
});

// ─── تنظیمات وفاداری ────────────────────────────────────────────────────────
router.get('/loyalty', requireAdmin, async (_req, res) => {
  const row = (await db.prepare('SELECT value FROM loyalty WHERE key = ?').get('config'));
  const config = row ? JSON.parse(row.value) : {};
  const { members: _legacyMembers, ...settings } = config;
  res.json({
    ...settings,
    redemptionCapPercent: Number.isInteger(settings.redemptionCapPercent) ? settings.redemptionCapPercent : 10,
    members: await getLoyaltyMembers(),
  });
});

router.put('/loyalty', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT value FROM loyalty WHERE key = ?').get('config'));
  const current = row ? JSON.parse(row.value) : {};
  const pointsPerThousand = Number(req.body?.pointsPerThousand);
  const pointValue = Number(req.body?.pointValue);
  const redemptionCapPercent = Number(req.body?.redemptionCapPercent);
  if (!Number.isInteger(pointsPerThousand) || pointsPerThousand < 0 || pointsPerThousand > 100000
    || !Number.isInteger(pointValue) || pointValue < 0 || pointValue > 1000000000
    || !Number.isInteger(redemptionCapPercent) || redemptionCapPercent < 0 || redemptionCapPercent > 100) {
    return res.status(400).json({ error: 'invalid_input', message: 'مقادیر امتیاز و سقف بازخرید باید عدد صحیح در محدوده مجاز باشند' });
  }
  const { members: _legacyMembers, ...currentSettings } = current;
  const updated = { ...currentSettings, pointsPerThousand, pointValue, redemptionCapPercent };
  (await db.prepare('INSERT INTO loyalty(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run('config', JSON.stringify(updated)));
  res.json({ ...updated, members: await getLoyaltyMembers() });
});

// ─── تنظیمات افیلیت ─────────────────────────────────────────────────────────
router.get('/aff-config', requireAdmin, async (_req, res) => {
  const row = (await db.prepare('SELECT value FROM aff_config WHERE key = ?').get('config'));
  res.json(row ? JSON.parse(row.value) : null);
});

router.put('/aff-config', requireAdmin, async (req, res) => {
  const row = (await db.prepare('SELECT value FROM aff_config WHERE key = ?').get('config'));
  const current = row ? JSON.parse(row.value) : {};
  const changes = req.body;
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
    return res.status(400).json({ error: 'invalid_input', message: 'پیکربندی پورسانت معتبر نیست' });
  }
  const percent = (value) => Number.isFinite(value) && value >= 0 && value <= 100;
  if ((changes.baseRate !== undefined && !percent(changes.baseRate))
    || (changes.cookieDays !== undefined && (!Number.isInteger(changes.cookieDays) || changes.cookieDays < 1 || changes.cookieDays > 3650))
    || (changes.minWithdraw !== undefined && (!Number.isSafeInteger(changes.minWithdraw) || changes.minWithdraw < 0))
    || (changes.maxPerOrder !== undefined && (!Number.isSafeInteger(changes.maxPerOrder) || changes.maxPerOrder < 1))
    || (changes.levelBonus !== undefined && (!changes.levelBonus || typeof changes.levelBonus !== 'object' || Array.isArray(changes.levelBonus)
      || Object.values(changes.levelBonus).some((value) => !percent(value))))
    || (changes.categoryRates !== undefined && (!changes.categoryRates || typeof changes.categoryRates !== 'object' || Array.isArray(changes.categoryRates)
      || Object.values(changes.categoryRates).some((value) => !percent(value))))
    || (changes.tiered !== undefined && (!Array.isArray(changes.tiered)
      || changes.tiered.some((tier) => !tier || !Number.isSafeInteger(tier.min) || tier.min < 0 || !percent(tier.rate))))) {
    return res.status(400).json({ error: 'invalid_input', message: 'مقادیر نرخ، سقف، حداقل برداشت یا مدت کوکی معتبر نیستند' });
  }
  const updated = { ...current, ...changes };
  (await db.prepare('INSERT INTO aff_config(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run('config', JSON.stringify(updated)));
  res.json(updated);
});

export default router;