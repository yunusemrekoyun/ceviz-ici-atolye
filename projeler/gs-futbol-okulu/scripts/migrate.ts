import { loadEnvFile } from "../lib/load-env";

loadEnvFile();

async function main() {
  const { getDb, resolveDatabasePath } = await import("../lib/db");
  const { countRegistrations } = await import("../lib/registrations");
  getDb(); // bağlantı açılırken migration'lar uygulanır
  console.log(`Migration tamamlandı. Veritabanı: ${resolveDatabasePath()}`);
  console.log(`Mevcut kayıt sayısı: ${countRegistrations()}`);
}

main().catch((err) => {
  console.error("Migration başarısız:", err instanceof Error ? err.message : err);
  process.exit(1);
});
