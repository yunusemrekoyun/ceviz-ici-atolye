// Production environment validation. Run once at server startup
// (instrumentation.ts). Critical secrets fail fast in production so a
// misconfigured deploy is caught immediately instead of on the first booking.

interface EnvIssue {
  key: string;
  message: string;
  critical: boolean;
}

function collectIssues(): EnvIssue[] {
  const issues: EnvIssue[] = [];
  const has = (k: string) => !!process.env[k]?.trim();

  // ── Critical — the app cannot run correctly without these ──────────────────
  const jwt = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET;
  if (!jwt || jwt.length < 32) {
    issues.push({ key: 'JWT_ACCESS_SECRET', message: 'En az 32 karakter olmalı (oturum imzalama).', critical: true });
  }
  if (!has('DATABASE_URL')) {
    issues.push({ key: 'DATABASE_URL', message: 'Veritabanı bağlantısı tanımlı değil.', critical: true });
  }
  if (!has('PII_ENCRYPTION_KEY')) {
    // Every reservation/guest write encrypts identity numbers → without the key
    // those writes throw. Hard requirement now that PII encryption is wired in.
    issues.push({ key: 'PII_ENCRYPTION_KEY', message: 'Kimlik no şifrelemesi için zorunlu (örn. `openssl rand -hex 32`). DB paylaşan tüm ortamlarda AYNI.', critical: true });
  }
  if (!has('CHECKIN_DOCUMENT_ENCRYPTION_KEY')) {
    issues.push({ key: 'CHECKIN_DOCUMENT_ENCRYPTION_KEY', message: 'Check-in kimlik belgesi şifrelemesi için zorunlu (32 byte base64).', critical: true });
  }

  // ── Recommended — features degrade or callbacks misfire if missing ─────────
  if (!has('DIRECT_URL')) {
    issues.push({ key: 'DIRECT_URL', message: 'Migration/doğrudan bağlantı için önerilir.', critical: false });
  }
  if (!has('APP_URL') && !has('NEXT_PUBLIC_BASE_URL')) {
    issues.push({ key: 'APP_URL', message: 'E-posta linkleri ve ödeme callback dönüş adresi için önerilir.', critical: false });
  }
  if (process.env.IYZICO_ENABLED === 'true') {
    for (const k of ['IYZICO_API_KEY', 'IYZICO_SECRET_KEY', 'IYZICO_BASE_URL']) {
      if (!has(k)) issues.push({ key: k, message: 'IYZICO_ENABLED=true ama eksik — ödeme çalışmaz.', critical: false });
    }
  }
  if (!has('KBS_SECRET_KEY')) {
    issues.push({ key: 'KBS_SECRET_KEY', message: 'KBS kullanılacaksa zorunlu; DB paylaşan ortamlarda AYNI anahtar.', critical: false });
  }

  return issues;
}

/** Validate env at startup. Throws in production if a critical var is missing. */
export function assertEnv(): void {
  const issues = collectIssues();
  if (issues.length === 0) return;

  const isProd = process.env.NODE_ENV === 'production';

  for (const i of issues.filter((x) => !x.critical)) {
    console.warn(`[env] ÖNERİ — ${i.key}: ${i.message}`);
  }

  const criticals = issues.filter((x) => x.critical);
  if (criticals.length > 0) {
    const lines = criticals.map((c) => `  • ${c.key}: ${c.message}`).join('\n');
    const header = `[env] EKSİK ZORUNLU DEĞİŞKENLER:\n${lines}`;
    if (isProd) {
      throw new Error(header);
    }
    console.warn(`${header}\n[env] (geliştirme modunda uyarı; üretimde başlatmayı durdurur.)`);
  }
}
