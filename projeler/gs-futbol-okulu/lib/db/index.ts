import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

export function resolveDatabasePath(): string {
  const configured = process.env.DATABASE_PATH?.trim() || "./data/registrations.db";
  // turbopackIgnore: DB yolu env'den gelir; build zamanı dosya izleme (tracing) gerekmez.
  return path.isAbsolute(configured) ? configured : path.resolve(/* turbopackIgnore: true */ process.cwd(), configured);
}

function openDatabase(): Db {
  const dbPath = resolveDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const sqlite = new Database(dbPath);
  // WAL: eşzamanlı okuma/yazmada kilitlenme riskini azaltır, veri kaybına karşı daha dayanıklıdır.
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle(sqlite, { schema });

  // Migration'lar idempotent: uygulanmış olanlar atlanır. Böylece ilk açılışta tablo garanti var olur.
  migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });

  return db;
}

// Dev'de HMR sırasında birden fazla bağlantı açılmasın diye globalThis üzerinde tek örnek tutulur.
const globalForDb = globalThis as unknown as { __gsRegistrationDb?: Db };

export function getDb(): Db {
  if (!globalForDb.__gsRegistrationDb) {
    globalForDb.__gsRegistrationDb = openDatabase();
  }
  return globalForDb.__gsRegistrationDb;
}

export { schema };
