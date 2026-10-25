import { db } from './db.js';
import { config } from './config.js';
import { hashPassword, nowIso } from './util.js';
import {
  seedProducts, seedArticles, seedReviews, seedDiscountCodes, seedSettings, seedCategories, seedBrands,
  seedTickets, seedCarriers, seedVendors, seedTasks, seedRoles, seedCampaigns,
  seedInvoices, seedExpenses, seedBankTx, seedAbandoned, seedSearchTerms, seedPages, seedBanners,
  seedPosts, seedAutomations, seedLoyalty, seedIntegrations, seedAuditLog, seedSurveys, seedAssets,
  seedLoginHistory, seedErrorLog, seedAffiliates, seedPayouts, seedCommissionConfig,
} from './seed-data.js';

export async function seed({ force = false } = {}) {
  const pendingSeeds = [];
  const importedLegacyData = await db.prepare(
    'SELECT migration_id FROM data_migrations WHERE migration_id = ?'
  ).get('legacy-sqlite-v1');
  const existingStoreData = await db.prepare(
    `SELECT EXISTS (SELECT 1 FROM products)
       OR EXISTS (SELECT 1 FROM orders)
       OR EXISTS (SELECT 1 FROM customers)
       OR EXISTS (SELECT 1 FROM settings) AS populated`
  ).get();
  const preserveStoreData = Boolean(importedLegacyData || existingStoreData.populated);
  const forceSeeds = force && !preserveStoreData;
  const put = (table, id, json, extra = {}) => {
    const extraColumns = Object.keys(extra);
    const columns = ['json', ...extraColumns];
    const conflict = forceSeeds
      ? `DO UPDATE SET ${columns.map((column) => `${column} = EXCLUDED.${column}`).join(', ')}`
      : 'DO NOTHING';
    const pending = db.prepare(
      `INSERT INTO ${table}(id, ${extraColumns.length ? `${extraColumns.join(', ')}, ` : ''}json)
       VALUES(${['?', ...extraColumns.map(() => '?'), '?'].join(', ')})
       ON CONFLICT(id) ${conflict}`
    ).run(id, ...Object.values(extra), JSON.stringify(json));
    pendingSeeds.push(pending);
    return pending;
  };

  const t = nowIso();
  if (!config.isProduction && !preserveStoreData) {
    seedProducts.forEach((p) => put('products', p.id, p, { slug: p.sku, updated_at: t }));
    seedArticles.forEach((a) => put('articles', a.id, a, { updated_at: t }));
    seedReviews.forEach((r) => put('reviews', r.id, r, { product_id: r.productId, status: r.status, created_at: t }));
    seedDiscountCodes.forEach((c) => put('discount_codes', c.id, c, { code: c.code, active: c.active ? 1 : 0 }));
    seedTickets.forEach((item) => put('tickets', item.id, item, { created_at: item.createdAt || t, updated_at: t }));
    seedCarriers.forEach((item) => put('carriers', item.id, item, { updated_at: t }));
    seedVendors.forEach((item) => put('vendors', item.id, item, { updated_at: t }));
    seedTasks.forEach((item) => put('tasks', item.id, item, { created_at: item.deadline || t, updated_at: t }));
    seedCampaigns.forEach((item) => put('campaigns', item.id, item, { updated_at: t }));
    seedInvoices.forEach((item) => put('invoices', item.id, item, { created_at: item.date || t, updated_at: t }));
    seedExpenses.forEach((item) => put('expenses', item.id, item, { created_at: item.date || t, updated_at: t }));
    seedBankTx.forEach((item) => put('bank_tx', item.id, item, { created_at: item.date || t, updated_at: t }));
    seedAbandoned.forEach((item) => put('abandoned', item.id, item, { created_at: item.date || t, updated_at: t }));
    seedSearchTerms.forEach((item) => put('search_terms', item.id, item, { updated_at: t }));
    seedPages.forEach((item) => put('pages', item.id, item, { updated_at: t }));
    seedBanners.forEach((item) => put('banners', item.id, item, { updated_at: t }));
    seedPosts.forEach((item) => put('posts', item.id, item, { updated_at: t }));
    seedAutomations.forEach((item) => put('automations', item.id, item, { updated_at: t }));
    seedIntegrations.forEach((item) => put('integrations', item.id, item, { updated_at: t }));
    seedAuditLog.forEach((item) => put('audit_log', item.id, item, { created_at: item.at || t }));
    seedSurveys.forEach((item) => put('surveys', item.id, item, { updated_at: t }));
    seedAssets.forEach((item) => put('assets', item.id, item, { updated_at: t }));
    seedLoginHistory.forEach((item) => put('login_history', item.id, item, { created_at: item.time || t }));
    seedErrorLog.forEach((item) => put('error_log', item.id, item, { created_at: item.time || t }));
    seedAffiliates.forEach((item) => put('affiliates', item.id, item, { updated_at: t }));
    seedPayouts.forEach((item) => put('payouts', item.id, item, { created_at: item.date || t, updated_at: t }));
  }
  seedRoles.forEach((item) => put('roles', item.id, item, { updated_at: t }));
  await Promise.all(pendingSeeds);

  const putValue = (table, key, value) => {
    const conflict = forceSeeds ? 'DO UPDATE SET value = EXCLUDED.value' : 'DO NOTHING';
    return db.prepare(`INSERT INTO ${table}(key, value) VALUES(?, ?) ON CONFLICT(key) ${conflict}`)
      .run(key, JSON.stringify(value));
  };
  await Promise.all([
    putValue('loyalty', 'config', seedLoyalty),
    putValue('aff_config', 'config', seedCommissionConfig),
  ]);

  if (forceSeeds || !(await db.prepare('SELECT key FROM settings WHERE key = ?').get('store'))) {
    await db.prepare("INSERT INTO settings(key, value) VALUES('store', ?) ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value")
      .run(JSON.stringify(seedSettings));
  }
  if (forceSeeds || !(await db.prepare('SELECT key FROM settings WHERE key = ?').get('meta'))) {
    await db.prepare("INSERT INTO settings(key, value) VALUES('meta', ?) ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value")
      .run(JSON.stringify({ categories: seedCategories, brands: seedBrands }));
  }

  if (forceSeeds || !(await db.prepare('SELECT id FROM admin_users WHERE username = ?').get(config.admin.username))) {
    await db.prepare(
      `INSERT INTO admin_users(id, username, password_hash, name, role_id, created_at)
       VALUES(?, ?, ?, ?, ?, ?)
       ON CONFLICT(username) DO UPDATE SET password_hash = EXCLUDED.password_hash,
         name = EXCLUDED.name, role_id = EXCLUDED.role_id`
    ).run('admin-1', config.admin.username, hashPassword(config.admin.password), config.admin.name, 'role1', t);
  }
  await db.prepare('UPDATE admin_users SET role_id = ? WHERE role_id IS NULL OR role_id = ?')
    .run('role1', '');

  console.log('[seed] database seeded.');
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  await db.initialize();
  await seed({ force: process.argv.includes('--force') });
  await db.close();
}
