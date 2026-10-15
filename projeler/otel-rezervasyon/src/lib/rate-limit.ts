// Single, centralized rate limiter. One in-memory store, a couple of generous
// tiers — applied at one choke point (middleware) only to sensitive endpoints.
// Normal browsing (page loads, GETs, assets) never touches it, so real visitors
// are never throttled; only abusive bursts against auth/write endpoints trip it.
//
// Single-instance (one VPS / standalone Node server) assumption: the store lives
// in process memory. If the app is ever scaled to multiple instances, swap this
// store for a shared one (e.g. Redis) — the call sites stay identical.

interface Window {
  /** Window length in milliseconds. */
  ms: number;
  /** Max requests allowed within the window (per IP). */
  max: number;
}

// All thresholds live here — tune in ONE place. Deliberately generous: the
// numbers are far above any human's real usage and only stop automated abuse.
export const RATE_TIERS = {
  // Login, register, password reset, email checks — brute-force surface.
  auth: [
    { ms: 60_000, max: 15 },       // 15 / minute
    { ms: 3_600_000, max: 100 },   // 100 / hour
  ],
  // Other state-changing endpoints (reservations, contact, payments…).
  write: [
    { ms: 60_000, max: 60 },       // 60 / minute
    { ms: 3_600_000, max: 800 },   // 800 / hour
  ],
} satisfies Record<string, Window[]>;

export type RateTier = keyof typeof RATE_TIERS;

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();
let lastSweep = 0;

// Lazy cleanup so the map can't grow unbounded from unique IPs over time.
function sweep(now: number) {
  if (now - lastSweep < 60_000 && store.size < 10_000) return;
  lastSweep = now;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

export interface RateResult {
  ok: boolean;
  /** Seconds until the client may retry (only when blocked). */
  retryAfter: number;
}

/**
 * Check (and record) a request against a tier for the given client IP.
 * Returns ok:false with retryAfter when any of the tier's windows is exceeded.
 */
export function checkRateLimit(tier: RateTier, ip: string): RateResult {
  const now = Date.now();
  sweep(now);

  const windows = RATE_TIERS[tier];
  let blockedUntil = 0;

  // Evaluate every window; block if any is over its max.
  for (let i = 0; i < windows.length; i += 1) {
    const w = windows[i];
    const key = `${tier}:${i}:${ip}`;
    let bucket = store.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + w.ms };
      store.set(key, bucket);
    }

    bucket.count += 1;
    if (bucket.count > w.max && bucket.resetAt > blockedUntil) {
      blockedUntil = bucket.resetAt;
    }
  }

  if (blockedUntil > 0) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((blockedUntil - now) / 1000)) };
  }
  return { ok: true, retryAfter: 0 };
}

/**
 * Client IP from proxy headers. Behind a single trusted reverse proxy (nginx
 * with the default `$proxy_add_x_forwarded_for`), the RIGHTMOST X-Forwarded-For
 * entry is the IP the proxy actually observed — i.e. the real client. The
 * leftmost entries are client-supplied and therefore spoofable, so using them
 * would let an attacker rotate the rate-limit key by sending a fake header.
 *
 * NOTE: assumes exactly one trusted proxy hop. If a CDN (e.g. Cloudflare) is
 * later put in front, switch to its trusted client-IP header instead.
 */
export function clientIpFromHeaders(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) {
    const parts = fwd.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1]!;
  }
  return headers.get('x-real-ip')?.trim() || '0.0.0.0';
}

/**
 * Classify a request path/method into a rate tier, or null to skip limiting.
 * Only sensitive API endpoints are limited; everything else passes untouched.
 */
export function tierForRequest(pathname: string, method: string): RateTier | null {
  if (!pathname.startsWith('/api/')) return null;

  // Payment provider webhook (iyzico → us): server-to-server, integrity-verified
  // separately, and can legitimately burst from a few provider IPs. Never limit.
  if (pathname.startsWith('/api/payments/iyzico/callback')) return null;

  // Auth surface — limited regardless of method (incl. the check-email GET).
  if (pathname.startsWith('/api/auth/')) return 'auth';

  // Other writes. Plain GETs (availability, rooms, reviews, status polling…)
  // are never limited so normal usage is unaffected.
  if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
    return 'write';
  }
  return null;
}
