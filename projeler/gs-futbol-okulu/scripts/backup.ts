import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { loadEnvFile } from "../lib/load-env";

loadEnvFile();

/**
 * SQLite online backup: WAL modunda bile tutarlı bir kopya üretir.
 * Çıktı: data/backups/registrations-YYYYMMDD-HHMMSS.db
 * Yüklenen dosyalar değişmez; files/ ve coach-photos/ klasörleri yedeklenir.
 */
async function main() {
  const { resolveDatabasePath } = await import("../lib/db");
  const dbPath = resolveDatabasePath();
  if (!fs.existsSync(dbPath)) {
    console.error(`Veritabanı bulunamadı: ${dbPath}`);
    process.exit(1);
  }
  const backupDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(path.dirname(dbPath), "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");
  const target = path.join(backupDir, `registrations-${stamp}.db`);

  const db = new Database(dbPath, { readonly: true });
  try {
    await db.backup(target);
  } finally {
    db.close();
  }
  fs.chmodSync(target, 0o600);
  console.log(`Yedek alındı: ${target}`);

  for (const folder of ["files", "coach-photos"]) {
    const filesDir = path.join(path.dirname(dbPath), folder);
    if (fs.existsSync(filesDir)) {
      const out = path.join(backupDir, folder);
      fs.mkdirSync(out, { recursive: true, mode: 0o700 });
      let copied = 0;
      for (const name of fs.readdirSync(filesDir)) {
        const dest = path.join(out, name);
        if (fs.existsSync(dest)) continue;
        fs.copyFileSync(path.join(filesDir, name), dest);
        fs.chmodSync(dest, 0o600);
        copied++;
      }
      console.log(`Dosyalar: ${copied} yeni dosya kopyalandı (${out})`);
    }
  }
}

main().catch((err) => {
  console.error("Yedekleme başarısız:", err instanceof Error ? err.message : err);
  process.exit(1);
});
