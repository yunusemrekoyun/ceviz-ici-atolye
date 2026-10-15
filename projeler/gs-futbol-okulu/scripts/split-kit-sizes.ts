import { loadEnvFile } from "../lib/load-env";

loadEnvFile();

/**
 * Tek alana yazılmış eski beden metnini ayırır: "9-10 Yaş 34-36" → forma-şort bedeni 9-10, tozluk numarası 34-36.
 * Anlaşılamayan kısım ("kaleci forması", "(K)") kaydın notuna eklenir; her değişiklik öğrencinin işlem geçmişine yazılır.
 * Yeniden çalıştırmak zararsızdır: ayrılmış kayıtlar bir daha değişmez.
 *   npm run kit:sizes             → yalnızca ne değişeceğini gösterir
 *   npm run kit:sizes -- --apply  → uygular (önce `npm run db:backup` alın)
 */
async function main() {
  const apply = process.argv.includes("--apply");
  const { getDb, resolveDatabasePath } = await import("../lib/db");
  const { equipmentOrders } = await import("../lib/db/schema");
  const { listOrders } = await import("../lib/equipment");
  const { hasSocks, parseKitSizes, shirtLabel, sizeMissing } = await import("../lib/equipment-shared");
  const { writeAudit } = await import("../lib/audit");
  const { eq } = await import("drizzle-orm");
  const db = getDb();

  const orders = listOrders().sort((a, b) => (a.studentNo ?? 0) - (b.studentNo ?? 0) || a.itemId - b.itemId);
  const plan = orders.flatMap((o) => {
    if (!o.size) return [];
    const p = parseKitSizes(o.size);
    const socks = hasSocks(o.itemName);
    const sock = socks ? (o.sockSize ?? p.socks) : null;
    // Tozluğu olmayan üründe (eşofman) bulunan numara kaybolmasın: nota
    const leftover = [!socks && p.socks ? `numara ${p.socks}` : null, p.rest].filter(Boolean).join(", ") || null;
    if (p.shirt === o.size && sock === o.sockSize && !leftover) return [];
    return [{ o, shirt: p.shirt, sock, leftover }];
  });

  const col = (s: string | null | undefined, n: number) => (s ?? "—").slice(0, n).padEnd(n);
  console.log(`Veritabanı: ${resolveDatabasePath()}  ·  ${apply ? "UYGULANIYOR" : "DENEME (değişmez)"}\n`);
  console.log(`${col("No", 6)}${col("Öğrenci", 28)}${col("Eski yazı", 24)}  ${col("Forma", 10)}${col("Tozluk", 9)}Nota eklenen`);
  for (const { o, shirt, sock, leftover } of plan) console.log(`${col(String(o.studentNo ?? ""), 6)}${col(o.studentName, 28)}${col(o.size, 24)}→ ${col(shirtLabel(shirt), 10)}${col(sock, 9)}${leftover ?? ""}`);
  console.log(`\n${plan.length} kayıt ayrılacak (toplam ${orders.length} malzeme kaydı).`);

  if (!apply) {
    console.log("Deneme: hiçbir şey değişmedi. Uygulamak için --apply ekleyin (önce yedek alın).");
    return;
  }
  const now = new Date().toISOString();
  db.transaction((tx) => {
    for (const { o, shirt, sock, leftover } of plan) {
      const note = leftover ? [o.note, leftover].filter(Boolean).join(" · ").slice(0, 300) : o.note;
      tx.update(equipmentOrders).set({ size: shirt, sockSize: sock, note, updatedAt: now }).where(eq(equipmentOrders.id, o.id)).run();
    }
  });
  for (const { o, shirt, sock, leftover } of plan) {
    const to = [shirt ? `forma ${shirtLabel(shirt)}` : "forma bedeni yok", sock ? `tozluk ${sock}` : null, leftover ? `not: ${leftover}` : null].filter(Boolean).join(", ");
    writeAudit(null, { action: "malzeme.beden-ayir", entity: "registration", entityId: o.registrationId, summary: `${o.studentName}: beden ayrıldı ("${o.size}" → ${to})` });
  }
  console.log(`Uygulandı: ${plan.length} kayıt.`);

  // Siparişten önce tamamlanacaklar
  const missing = listOrders().filter((o) => o.studentStatus === "enrolled" && sizeMissing(o));
  if (missing.length) {
    console.log(`\nBedeni ya da tozluk numarası eksik (${missing.length}):`);
    for (const o of missing) console.log(`  ${col(String(o.studentNo ?? ""), 6)}${col(o.studentName, 28)}forma ${col(shirtLabel(o.size), 10)}tozluk ${o.sockSize ?? "—"}${o.note ? `  (${o.note})` : ""}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
