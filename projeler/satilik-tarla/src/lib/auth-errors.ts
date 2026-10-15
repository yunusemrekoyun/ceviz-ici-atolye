// better-auth'un döndürdüğü hata kodlarını (node_modules/better-auth/dist/api/routes/*
// ve plugins/admin/error-codes.mjs'den doğrulandı) kullanıcıya gösterilecek Türkçe
// mesaja çevirir.
const MESSAGES: Record<string, string> = {
  INVALID_EMAIL: 'Geçerli bir e-posta adresi girin.',
  INVALID_EMAIL_OR_PASSWORD: 'E-posta veya şifre hatalı.',
  EMAIL_NOT_VERIFIED: 'E-posta adresiniz henüz doğrulanmamış.',
  PASSWORD_TOO_SHORT: 'Şifre en az 8 karakter olmalı.',
  PASSWORD_TOO_LONG: 'Şifre çok uzun.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Bu e-posta adresiyle zaten bir hesap var.',
  BANNED_USER: 'Bu hesap askıya alınmış.',
  INVALID_TOKEN: 'Bağlantının süresi dolmuş veya geçersiz.',
};

export function authErrorMessage(code?: string | null): string {
  if (code && MESSAGES[code]) return MESSAGES[code];
  return 'Bir şeyler ters gitti, lütfen tekrar deneyin.';
}
