import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

// At-rest encryption for the KBS web-service password (AES-256-GCM).
// Key comes from the KBS_SECRET_KEY env var (64-char hex or any passphrase,
// which is then SHA-256 derived). The password never reaches the browser.

const PREFIX = 'v1:';

function getKey(): Buffer {
  const raw = process.env.KBS_SECRET_KEY?.trim();
  if (!raw) {
    throw new Error('KBS_SECRET_KEY tanımlı değil. .env dosyasına 64 karakterlik bir anahtar ekleyin (örn. `openssl rand -hex 32`).');
  }
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, 'hex');
  return createHash('sha256').update(raw).digest();
}

export function isKbsCryptoConfigured(): boolean {
  return !!process.env.KBS_SECRET_KEY?.trim();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString('base64');
}

export function decryptSecret(stored: string): string {
  if (!stored.startsWith(PREFIX)) {
    throw new Error('Geçersiz şifreli değer formatı.');
  }
  const buf = Buffer.from(stored.slice(PREFIX.length), 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}
