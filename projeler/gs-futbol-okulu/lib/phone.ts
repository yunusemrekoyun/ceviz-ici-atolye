/**
 * Türkiye cep telefonu numaralarını DB formatına çevirir: 05XXXXXXXXX (11 hane).
 * Kabul edilen girişler: "0555 555 55 55", "5555555555", "+90 555 555 55 55", "90555...", "0090555..."
 * Geçersiz ise null döner.
 */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0090")) digits = digits.slice(4);
  else if (digits.startsWith("90") && digits.length === 12) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("5")) digits = "0" + digits;
  if (/^05[0-9]{9}$/.test(digits)) return digits;
  return null;
}

/** 05555555555 -> "0555 555 55 55". Normalize edilemeyen değeri olduğu gibi döner. */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "";
  const normalized = normalizePhone(value) ?? value;
  if (!/^05[0-9]{9}$/.test(normalized)) return value;
  return `${normalized.slice(0, 4)} ${normalized.slice(4, 7)} ${normalized.slice(7, 9)} ${normalized.slice(9, 11)}`;
}

/**
 * Kullanıcı yazarken uygulanan maske: sadece rakam, en fazla 11 hane, "0555 555 55 55" şeklinde boşluklu.
 * Kullanıcı başa 0 koymazsa ve 5 ile başlıyorsa otomatik 0 eklenir; +90 yazılırsa temizlenir.
 */
export function maskPhoneInput(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0090")) digits = digits.slice(4);
  else if (digits.startsWith("90") && digits.length > 10) digits = digits.slice(2);
  if (digits.length > 0 && digits.startsWith("5")) digits = "0" + digits;
  digits = digits.slice(0, 11);
  const parts = [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 9), digits.slice(9, 11)].filter(Boolean);
  return parts.join(" ");
}

/** tel: linki için +90 formatı. */
export function toInternationalPhone(normalized: string): string {
  return `+90${normalized.slice(1)}`;
}
