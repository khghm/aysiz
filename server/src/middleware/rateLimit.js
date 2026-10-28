import { createHash } from 'node:crypto';
import { db } from '../db.js';
import { normalizePhone } from '../util.js';

const ipIdentity = (req) => `ip:${req.ip}`;
const phoneIdentity = (req) => {
  const phone = normalizePhone(req.body?.phone);
  return phone ? `phone:${phone}` : null;
};
const usernameIdentity = (req) => {
  const username = String(req.body?.username || '').trim().toLowerCase();
  return username ? `username:${username}` : null;
};

export const limitIdentities = {
  ip: ipIdentity,
  phone: phoneIdentity,
  username: usernameIdentity,
};

export function createRateLimit({ name, limit, windowMs, identity, message }) {
  if (!name || !Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(windowMs) || windowMs < 1) {
    throw new Error('Rate limit requires a name, positive integer limit, and positive integer window');
  }

  return async (req, res, next) => {
    if (process.env.NODE_ENV === 'test') return next();
    const value = identity(req);
    if (!value) return next();

    const key = createHash('sha256').update(`${name}:${value}`).digest('hex');
    const bucket = await db.prepare(
      `INSERT INTO request_rate_limits(key, window_started_at, hit_count)
       VALUES(?, clock_timestamp(), 1)
       ON CONFLICT(key) DO UPDATE SET
         window_started_at = CASE
           WHEN request_rate_limits.window_started_at <= clock_timestamp() - (? * INTERVAL '1 millisecond')
             THEN clock_timestamp()
           ELSE request_rate_limits.window_started_at
         END,
         hit_count = CASE
           WHEN request_rate_limits.window_started_at <= clock_timestamp() - (? * INTERVAL '1 millisecond')
             THEN 1
           ELSE request_rate_limits.hit_count + 1
         END
       RETURNING hit_count,
         GREATEST(0, CEIL(EXTRACT(EPOCH FROM (
           window_started_at + (? * INTERVAL '1 millisecond') - clock_timestamp()
         ))))::INTEGER AS retry_after`
    ).get(key, windowMs, windowMs, windowMs);

    res.setHeader('RateLimit-Limit', String(limit));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, limit - bucket.hit_count)));
    if (bucket.hit_count > limit) {
      res.setHeader('RateLimit-Reset', String(bucket.retry_after));
      res.setHeader('Retry-After', String(Math.max(1, bucket.retry_after)));
      return res.status(429).json({
        error: 'rate_limited',
        message: message || 'تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید',
      });
    }
    return next();
  };
}
