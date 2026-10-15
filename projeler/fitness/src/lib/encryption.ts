import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.PAYMENT_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("PAYMENT_ENCRYPTION_KEY .env'de tanımlı değil veya hatalı (64 hex karakter gerekli)");
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(plain: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(encoded: string): string {
  const key = getKey();
  const parts = encoded.split(":");
  if (parts.length !== 3) throw new Error("Geçersiz şifreli veri formatı");
  const [ivHex, tagHex, encHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function safeDecrypt(encoded: string | null | undefined): string {
  if (!encoded) return "";
  try {
    return decrypt(encoded);
  } catch {
    return "";
  }
}
