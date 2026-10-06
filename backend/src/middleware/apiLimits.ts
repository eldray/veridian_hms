// backend/src/middleware/apiLimits.ts
//
// Request limits designed for a HOSPITAL network.
//
// Everyone in a hospital usually reaches the server from the same IP address (one router / NAT),
// so a classic "N requests per IP" limit would lock out the whole building after one busy minute.
// These limits therefore count per USER (verified login token), and use the IP only for things
// that have no user yet (the login screen).
//
//   loginLimiter    : 10 failed logins per 15 min for the same username + IP, and 100 failed
//                     logins per 15 min for one IP (password spraying). A successful login resets
//                     the first counter.
//   apiRateLimiter  : 1,500 requests per minute per logged-in user (25/s: a screen that loads
//                     12,000 patients in 100 pages is ~120 requests and fits easily), and 300 per
//                     minute per IP for requests without a valid token.
//
// Tuning (environment variables): LOGIN_MAX_ATTEMPTS, LOGIN_IP_MAX_ATTEMPTS, LOGIN_WINDOW_MIN,
// API_RATE_LIMIT_PER_MIN, API_ANON_RATE_LIMIT_PER_MIN. Set RATE_LIMIT_DISABLED=true to switch off.
//
// Counters live in this process's memory (single-server setup). With several processes, each has
// its own counters; put a shared store (Redis) behind `hit()` if you scale out.

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface Bucket { count: number; resetAt: number }

const num = (v: string | undefined, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

const LOGIN_MAX = () => num(process.env.LOGIN_MAX_ATTEMPTS, 10);
const LOGIN_IP_MAX = () => num(process.env.LOGIN_IP_MAX_ATTEMPTS, 100);
const LOGIN_WINDOW_MS = () => num(process.env.LOGIN_WINDOW_MIN, 15) * 60_000;
const API_MAX = () => num(process.env.API_RATE_LIMIT_PER_MIN, 1500);
const ANON_MAX = () => num(process.env.API_ANON_RATE_LIMIT_PER_MIN, 300);
const disabled = () => process.env.RATE_LIMIT_DISABLED === 'true';

const loginBuckets = new Map<string, Bucket>();
const apiBuckets = new Map<string, Bucket>();

/** Count one hit. Returns the bucket after counting. */
function hit(map: Map<string, Bucket>, key: string, windowMs: number): Bucket {
  const now = Date.now();
  let b = map.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    map.set(key, b);
  }
  b.count++;
  return b;
}

function tooMany(res: Response, bucket: Bucket, message: string) {
  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000));
  res.setHeader('Retry-After', String(retryAfter));
  return res.status(429).json({ success: false, message, retryAfter });
}

const clientIp = (req: Request) => req.ip || req.socket.remoteAddress || 'unknown';

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
export function loginLimiter(req: Request, res: Response, next: NextFunction) {
  if (disabled()) return next();

  const windowMs = LOGIN_WINDOW_MS();
  const ip = clientIp(req);
  const username = String(req.body?.username ?? req.body?.email ?? '').trim().toLowerCase().slice(0, 100);
  const userKey = `${ip}|${username}`;
  const ipKey = `ip|${ip}`;
  const now = Date.now();

  // Already locked out? (read only: do not count this request yet)
  const u = loginBuckets.get(userKey);
  const i = loginBuckets.get(ipKey);
  if (u && now < u.resetAt && u.count >= LOGIN_MAX()) {
    return tooMany(res, u, 'Too many failed login attempts. Please wait a few minutes and try again.');
  }
  if (i && now < i.resetAt && i.count >= LOGIN_IP_MAX()) {
    return tooMany(res, i, 'Too many failed login attempts from this computer. Please wait a few minutes and try again.');
  }

  // Count the outcome once the response is sent
  res.on('finish', () => {
    if (res.statusCode === 401 || res.statusCode === 400 || res.statusCode === 403) {
      hit(loginBuckets, userKey, windowMs);
      hit(loginBuckets, ipKey, windowMs);
    } else if (res.statusCode < 400) {
      loginBuckets.delete(userKey); // success clears this user's failures
    }
  });
  next();
}

// ---------------------------------------------------------------------------
// Whole API
// ---------------------------------------------------------------------------
const EXEMPT = /^\/(?:api\/)?(?:health|events)(?:\/|$|\?)/;

function userIdFromToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ') || !process.env.JWT_SECRET) return null;
  try {
    const decoded: any = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    return decoded?.userId ? String(decoded.userId) : null;
  } catch {
    return null;
  }
}

export function apiRateLimiter(req: Request, res: Response, next: NextFunction) {
  if (disabled() || req.method === 'OPTIONS' || EXEMPT.test(req.originalUrl || req.url)) return next();

  const userId = userIdFromToken(req);
  const key = userId ? `u|${userId}` : `ip|${clientIp(req)}`;
  const max = userId ? API_MAX() : ANON_MAX();
  const bucket = hit(apiBuckets, key, 60_000);

  res.setHeader('X-RateLimit-Limit', String(max));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));

  if (bucket.count > max) {
    return tooMany(res, bucket, 'You are sending requests too quickly. Please wait a moment and try again.');
  }
  next();
}

// Remove expired counters
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const map of [loginBuckets, apiBuckets]) {
    for (const [k, b] of map) if (now >= b.resetAt) map.delete(k);
  }
}, 60_000);
sweeper.unref?.();

// ---------------------------------------------------------------------------
// Report period guard
// ---------------------------------------------------------------------------
// A report over several years loads hundreds of thousands of visits into memory.
// Reports cover at most 366 days (one full year); ask for each year separately.
const MAX_REPORT_DAYS = () => num(process.env.REPORT_MAX_DAYS, 366);

export function reportRangeGuard(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'GET') return next();
  const start = Date.parse(String(req.query.startDate ?? ''));
  const end = Date.parse(String(req.query.endDate ?? ''));
  if (Number.isFinite(start) && Number.isFinite(end)) {
    const days = (end - start) / 86_400_000;
    if (days > MAX_REPORT_DAYS()) {
      return res.status(400).json({
        success: false,
        message: `Please choose a period of at most ${MAX_REPORT_DAYS()} days (one year). Run longer periods one year at a time.`
      });
    }
  }
  next();
}
