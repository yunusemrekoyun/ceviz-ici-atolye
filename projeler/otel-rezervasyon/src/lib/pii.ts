import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

// At-rest encryption for identity numbers (TC kimlik no / passport no).
// AES-256-GCM, reversible (KBS must send the real number to law enforcement).
// Plaintext-tolerant: values without the PREFIX are returned as-is, so the
// rollout is gradual and zero-downtime on the live DB (a backfill script
// encrypts pre-existing rows; new writes are encrypted by the Prisma extension).

const PREFIX = 'pii:v1:';

// Identity-number fields encrypted at rest across all models that hold them
// (User, AccountPerson, Reservation, ReservationGuest).
export const PII_FIELDS = ['tcKimlikNo', 'passportNo'] as const;

function getKey(): Buffer {
  const raw = process.env.PII_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error(
      'PII_ENCRYPTION_KEY tanımlı değil. .env dosyasına 64 karakterlik bir anahtar ekleyin (örn. `openssl rand -hex 32`).',
    );
  }
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, 'hex');
  return createHash('sha256').update(raw).digest();
}

export function isPiiCryptoConfigured(): boolean {
  return !!process.env.PII_ENCRYPTION_KEY?.trim();
}

export function isEncryptedPii(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function encryptPii(plain: string): string {
  if (isEncryptedPii(plain)) return plain; // idempotent — never double-encrypt
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString('base64');
}

export function decryptPii(stored: string): string {
  if (!isEncryptedPii(stored)) return stored; // legacy plaintext — pass through
  try {
    const buf = Buffer.from(stored.slice(PREFIX.length), 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ct = buf.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch (error) {
    // A wrong/rotated key must not crash reads — surface a safe placeholder.
    console.error('PII çözülemedi (PII_ENCRYPTION_KEY değişmiş olabilir):', error);
    return '';
  }
}

// ── Masking (for responses; full value only via the audited reveal endpoint) ──

/** TC kimlik: keep last 2 digits → `•••••••••34`. Empty/short → fully masked. */
export function maskTcKimlik(value?: string | null): string | null {
  if (!value) return value ?? null;
  const v = decryptPii(value);
  if (v.length <= 2) return '•'.repeat(v.length);
  return '•'.repeat(v.length - 2) + v.slice(-2);
}

/** Passport: keep last 2 chars → `••••34`. */
export function maskPassport(value?: string | null): string | null {
  if (!value) return value ?? null;
  const v = decryptPii(value);
  if (v.length <= 2) return '•'.repeat(v.length);
  return '•'.repeat(v.length - 2) + v.slice(-2);
}
