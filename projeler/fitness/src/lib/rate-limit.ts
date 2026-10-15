// In-memory rate limiter — production'da Redis ile değiştirilebilir

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

export interface RateLimitConfig {
  limit: number;   // max istek sayısı
  window: number;  // saniye cinsinden pencere
}

const PRESETS: Record<string, RateLimitConfig> = {
  login:    { limit: 5,  window: 60  },
  register: { limit: 3,  window: 60  },
  upload:   { limit: 10, window: 60  },
  api:      { limit: 60, window: 60  },
};

export function rateLimit(key: string, preset: keyof typeof PRESETS | RateLimitConfig) {
  const cfg = typeof preset === "string" ? PRESETS[preset] : preset;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + cfg.window * 1000 });
    return { limited: false, remaining: cfg.limit - 1 };
  }

  if (entry.count >= cfg.limit) {
    return { limited: true, remaining: 0, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { limited: false, remaining: cfg.limit - entry.count };
}

// Belleği temiz tutmak için eski kayıtları sil (her 5 dakikada)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    store.forEach((v, k) => { if (now > v.resetAt) store.delete(k); });
  }, 5 * 60 * 1000);
}
