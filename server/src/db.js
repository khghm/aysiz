import { AsyncLocalStorage } from 'node:async_hooks';
import { Pool } from 'pg';
import { config } from './config.js';

const transactionContext = new AsyncLocalStorage();
const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.databasePoolMax,
  connectionTimeoutMillis: config.databaseConnectionTimeoutMs,
  idleTimeoutMillis: config.databaseIdleTimeoutMs,
  ssl: config.databaseSsl ? { rejectUnauthorized: config.databaseSslVerify } : undefined,
});

function postgresPlaceholders(sql) {
  let result = '';
  let parameter = 0;
  let quote = '';
  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    if (quote) {
      result += char;
      if (char === quote) {
        if (sql[i + 1] === quote) result += sql[++i];
        else quote = '';
      } else if (char === '\\' && quote === "'") {
        result += sql[++i] || '';
      }
    } else if (char === "'" || char === '"') {
      quote = char;
      result += char;
    } else if (char === '?') {
      result += `$${++parameter}`;
    } else {
      result += char;
    }
  }
  return result;
}

async function query(sql, params = []) {
  const client = transactionContext.getStore()?.client;
  return (client || pool).query(postgresPlaceholders(sql), params);
}

export const db = {
  prepare(sql) {
    return {
      get: async (...params) => (await query(sql, params)).rows[0],
      all: async (...params) => (await query(sql, params)).rows,
      run: async (...params) => {
        const result = await query(sql, params);
        return { changes: result.rowCount };
      },
    };
  },
  async exec(sql) {
    const command = sql.trim().toUpperCase();
    const context = transactionContext.getStore();
    if (command === 'BEGIN' || command === 'BEGIN IMMEDIATE') {
      if (!context) throw new Error('Database transactions require request context');
      if (context.client) throw new Error('Nested database transactions are not supported');
      context.client = await pool.connect();
      try {
        await context.client.query('BEGIN');
      } catch (error) {
        context.client.release();
        context.client = null;
        throw error;
      }
      return;
    }
    if (command === 'COMMIT' || command === 'ROLLBACK') {
      if (!context?.client) throw new Error('No active database transaction');
      const client = context.client;
      context.client = null;
      try {
        await client.query(command);
      } finally {
        client.release();
      }
      return;
    }
    return pool.query(sql);
  },
  async initialize() {
    await pool.query(schemaSql);
    await pool.query(`
      ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role_id TEXT;
      ALTER TABLE affiliate_commissions ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'none';
      ALTER TABLE affiliate_commissions ADD COLUMN IF NOT EXISTS reviewed_at TEXT;
      ALTER TABLE affiliate_commissions ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS data_migrations (
        migration_id TEXT PRIMARY KEY,
        source_name TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        row_counts TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS request_rate_limits (
        key TEXT PRIMARY KEY,
        window_started_at TIMESTAMPTZ NOT NULL,
        hit_count INTEGER NOT NULL CHECK (hit_count > 0)
      );
      CREATE INDEX IF NOT EXISTS idx_request_rate_limits_window
        ON request_rate_limits(window_started_at);
      INSERT INTO schema_migrations(version, applied_at)
      VALUES (8, CURRENT_TIMESTAMP::text)
      ON CONFLICT (version) DO NOTHING;
      UPDATE affiliate_commissions ac
      SET review_status = 'review'
      WHERE ac.status = 'pending'
        AND ac.review_status = 'none'
        AND EXISTS (
          SELECT 1 FROM orders o
          WHERE o.id = ac.order_id
            AND COALESCE((o.json::jsonb ->> 'refundedAmount')::integer, 0) > 0
        );
    `);
  },
  async close() {
    await pool.end();
  },
};

export const runWithRequestContext = (callback) => transactionContext.run({ client: null }, callback);

const schemaSql = `

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  last_login TEXT,
  is_blocked INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS customer_notes (
  id TEXT PRIMARY KEY,
  customer_mobile TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customer_notes_mobile ON customer_notes(customer_mobile, created_at);

CREATE TABLE IF NOT EXISTS otp_requests (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_requests(phone);

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  slug TEXT,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products ((json::jsonb ->> 'category'));
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products ((json::jsonb ->> 'subcategory'));
CREATE INDEX IF NOT EXISTS idx_products_brand ON products ((json::jsonb ->> 'brand'));
CREATE INDEX IF NOT EXISTS idx_products_price ON products (((json::jsonb ->> 'price')::numeric));

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS discount_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  customer_id TEXT,
  mobile TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  total INTEGER NOT NULL,
  json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_mobile ON orders(mobile);
CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON orders(customer_id, created_at DESC) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_created ON orders(payment_status, created_at DESC);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  authority TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  ref_id TEXT,
  card_pan TEXT,
  gateway TEXT NOT NULL DEFAULT 'zarinpal',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tx_order ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_tx_order_status_created ON payment_transactions(order_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rmas (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rma_refunds (
  id TEXT PRIMARY KEY,
  rma_id TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK(amount > 0),
  reference TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rma_refunds_order ON rma_refunds(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_rmas_created ON rmas(created_at DESC);

CREATE TABLE IF NOT EXISTS carriers (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vendor_settlements (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reference TEXT NOT NULL,
  json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vendor_settlements_vendor ON vendor_settlements(vendor_id, created_at);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS automations (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bank_tx (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS abandoned (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS search_terms (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS banners (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS loyalty (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('earn', 'redeem', 'refund')),
  points INTEGER NOT NULL CHECK(points > 0),
  eligible_amount INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(order_id, type)
);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer ON loyalty_transactions(customer_id, created_at);

CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS surveys (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_history (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS error_log (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS affiliates (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  visitor_id TEXT NOT NULL,
  affiliate_id TEXT NOT NULL,
  clicked_at TEXT NOT NULL,
  PRIMARY KEY(visitor_id, affiliate_id)
);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate ON affiliate_clicks(affiliate_id, clicked_at);

CREATE TABLE IF NOT EXISTS affiliate_visits (
  visitor_id TEXT PRIMARY KEY,
  affiliate_id TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id TEXT PRIMARY KEY,
  affiliate_id TEXT NOT NULL,
  order_id TEXT NOT NULL UNIQUE,
  sale_amount INTEGER NOT NULL,
  commission_amount INTEGER NOT NULL,
  rate REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid')),
  review_status TEXT NOT NULL DEFAULT 'none' CHECK(review_status IN ('none', 'review', 'approved', 'rejected')),
  reviewed_at TEXT,
  reviewed_by TEXT,
  payout_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate ON affiliate_commissions(affiliate_id, status);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_payout ON affiliate_commissions(payout_id) WHERE payout_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS aff_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export const getSetting = async (key) => {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? JSON.parse(row.value) : null;
};

export const setSetting = async (key, value) => {
  await db.prepare(
    'INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, JSON.stringify(value));
};
