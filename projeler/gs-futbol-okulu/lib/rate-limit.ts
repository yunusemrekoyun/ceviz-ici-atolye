/**
 * Public form için basit bellek-içi rate limit (sliding window, IP başına).
 * Tek Node süreci (PM2 fork modu) için yeterlidir; harici altyapı gerektirmez.
 */
type Bucket = number[]; // istek zaman damgaları (ms)

const globalForRl = globalThis as unknown as { __gsRateLimit?: Map<string, Bucket> };
const buckets = (globalForRl.__gsRateLimit ??= new Map<string, Bucket>());

function readPositiveInt(envValue: string | undefined, fallback: number): number {
  const n = Number(envValue);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function getRateLimitConfig() {
  return {
    max: readPositiveInt(process.env.RATE_LIMIT_MAX, 30),
    windowMs: readPositiveInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 10) * 60_000,
  };
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export type RateLimitOptions = { max: number; windowMs: number };

export function checkRateLimit(
  key: string,
  now: number = Date.now(),
  { max, windowMs }: RateLimitOptions = getRateLimitConfig(),
): RateLimitResult {
  const windowStart = now - windowMs;

  const bucket = (buckets.get(key) ?? []).filter((ts) => ts > windowStart);

  // Bellek şişmesin: boş kovaları temizle, arada tüm haritayı süpür.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((ts) => ts <= windowStart)) buckets.delete(k);
    }
  }

  if (bucket.length >= max) {
    const oldest = bucket[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    buckets.set(key, bucket);
    return { allowed: false, retryAfterSeconds };
  }

  bucket.push(now);
  buckets.set(key, bucket);
  return { allowed: true };
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/**
 * İstemci IP'si. nginx ($proxy_add_x_forwarded_for), gelen X-Forwarded-For'a gerçek istemci IP'sini SONA ekler; istemcinin
 * kendi gönderdiği sahte değerler başta kalır. Bu yüzden son eleman alınır (tek reverse proxy varsayımı).
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((p) => p.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}
