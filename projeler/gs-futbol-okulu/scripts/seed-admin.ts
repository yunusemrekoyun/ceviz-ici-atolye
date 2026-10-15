import { loadEnvFile } from "../lib/load-env";

loadEnvFile();

/**
 * Admin hesabını oluşturur ya da şifresini günceller (şifre değişince açık oturumlar kapanır).
 * Bilgiler .env'deki ADMIN_USERNAME / ADMIN_PASSWORD değerlerinden okunur.
 * Kullanım: npm run admin:seed
 */
async function main() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!username || !password) {
    throw new Error(".env içinde ADMIN_USERNAME ve ADMIN_PASSWORD tanımlı olmalı.");
  }
  const { upsertAdmin } = await import("../lib/auth/users");
  const { user, created } = await upsertAdmin(username, password);
  console.log(created ? `Admin oluşturuldu: ${user.username}` : `Admin şifresi güncellendi, açık oturumlar kapatıldı: ${user.username}`);
}

main().catch((err) => {
  console.error("Admin seed başarısız:", err instanceof Error ? err.message : err);
  process.exit(1);
});
