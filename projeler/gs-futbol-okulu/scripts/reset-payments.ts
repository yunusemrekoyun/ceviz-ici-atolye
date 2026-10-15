import { loadEnvFile } from "../lib/load-env";

loadEnvFile();

/**
 * Bütün ödeme verisini temizler (aidat ve malzeme); ödemeler panelden baştan girilecekse kullanılır.
 *   npm run reset:payments            → yalnızca ne silineceğini gösterir
 *   npm run reset:payments -- --apply → siler (önce `npm run db:backup` alın)
 *
 * Silinenler: aidat ödemeleri (makbuzlar), hak paketleri (dönemler), veli ödeme bildirimleri, ödeme sözleri,
 * forma/eşofman kayıtları, makbuz sayacı (numaralar yeniden 0001'den başlar), aidat bildirimleri.
 * Dokunulmayanlar: öğrenciler ve kayıt bilgileri, notlar, indirimler, gruplar, yoklama, program.
 * Çalışan uygulama bugünün paketlerini önbellekte tuttuğu için ardından `pm2 restart gs-kayit` gerekir.
 */
async function main() {
  const apply = process.argv.includes("--apply");
  const { getDb, resolveDatabasePath } = await import("../lib/db");
  const { payments, feePeriods, paymentClaims, accessOverrides, equipmentOrders, settings, notifications } = await import("../lib/db/schema");
  const { like } = await import("drizzle-orm");
  const db = getDb();

  const plan = [
    ["Aidat ödemeleri (makbuzlar)", payments],
    ["Hak paketleri (dönemler)", feePeriods],
    ["Veli ödeme bildirimleri", paymentClaims],
    ["Ödeme sözleri", accessOverrides],
    ["Forma / eşofman kayıtları", equipmentOrders],
  ] as const;

  console.log(`Veritabanı: ${resolveDatabasePath()}  ·  ${apply ? "SİLİNİYOR" : "DENEME (silinmez)"}\n`);
  for (const [label, table] of plan) console.log(`• ${label}: ${await db.$count(table)}`);
  const seq = db.select().from(settings).where(like(settings.key, "receipt_seq:%")).all();
  console.log(`• Makbuz sayacı: ${seq.map((s) => `${s.key.slice(12)} → ${s.value}`).join(", ") || "yok"}`);
  const notes = await db.$count(notifications, like(notifications.kind, "aidat.%"));
  console.log(`• Aidat bildirimleri: ${notes}`);

  if (!apply) {
    console.log("\nDeneme: hiçbir şey silinmedi. Silmek için --apply ekleyin (önce yedek alın).");
    return;
  }
  db.transaction(() => {
    db.update(feePeriods).set({ paymentId: null }).run();
    db.delete(payments).run();
    db.delete(feePeriods).run();
    db.delete(paymentClaims).run();
    db.delete(accessOverrides).run();
    db.delete(equipmentOrders).run();
    db.delete(settings).where(like(settings.key, "receipt_seq:%")).run();
    db.delete(notifications).where(like(notifications.kind, "aidat.%")).run();
  });
  console.log("\nSilindi. Uygulamayı yeniden başlatın: pm2 restart gs-kayit");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
