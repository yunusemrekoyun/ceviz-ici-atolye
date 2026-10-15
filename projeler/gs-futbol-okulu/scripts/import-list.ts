import fs from "node:fs";
import { loadEnvFile } from "../lib/load-env";

loadEnvFile();

/**
 * Elle tutulan listeleri (telefon listesi vb.) sisteme aktarır.
 *   npm run import:list -- <dosya.json>           → yalnızca ne yapılacağını gösterir (deneme)
 *   npm run import:list -- <dosya.json> --apply   → veritabanına yazar
 *
 * Dosya biçimi:
 * {
 *   "new":    [{ "name", "parent"?, "phone"?, "birthYear"?, "birthDate"?: "YYYY-MM-DD", "note"?, "appointment"?: "YYYY-MM-DDTHH:MM" }],
 *   "update": [{ "id", "expectName", "rename"?, "phone"?, "note"?, "appointment"? }]
 * }
 * - "new": eksik bilgili ön kayıt açılır; aynı ad + telefon zaten varsa atlanır.
 * - Grup: doğum tarihi varsa ondan, yoksa birthYear'dan; ikisi de yoksa grupsuz.
 * - "update": id'deki kaydın adı expectName ile eşleşmezse dokunulmaz. Not mevcut nota eklenir (tekrar eklenmez).
 *   "phone" yalnızca eksik bilgili (iletişim kişisi "Diğer") kayıtların telefonunu düzeltir.
 * - "appointment": İstanbul saati; yalnızca randevusu olmayan (randevu bekliyor) kayda verilir.
 * Tekrar çalıştırmak güvenlidir.
 */
type NewEntry = { name: string; parent?: string; phone?: string; birthYear?: number; birthDate?: string; note?: string; appointment?: string };
type UpdateEntry = { id: number; expectName: string; rename?: string; phone?: string; note?: string; appointment?: string };
type ImportFile = { new?: NewEntry[]; update?: UpdateEntry[] };

const key = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();

async function main() {
  const [file, flag] = process.argv.slice(2);
  if (!file) throw new Error("Kullanım: npm run import:list -- <dosya.json> [--apply]");
  const apply = flag === "--apply";
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as ImportFile;

  const { getDb, resolveDatabasePath } = await import("../lib/db");
  const { listRegistrations, getRegistration, createQuickRegistration, scheduleAppointment, updateAdminNote } = await import("../lib/registrations");
  const { listAgeGroups } = await import("../lib/age-groups-db");
  const { istanbulLocalToIso } = await import("../lib/format");
  const { normalizePhone } = await import("../lib/phone");
  const { registrations } = await import("../lib/db/schema");
  const { eq } = await import("drizzle-orm");

  console.log(`${apply ? "UYGULANIYOR" : "DENEME (yazılmayacak, uygulamak için --apply)"} · ${resolveDatabasePath()}\n`);
  const groups = listAgeGroups();
  const existing = listRegistrations();
  const toIso = (value: string | undefined) => {
    if (!value) return null;
    const iso = istanbulLocalToIso(value);
    if (!iso) throw new Error(`Geçersiz randevu: ${value}`);
    return iso;
  };
  let created = 0;
  let updated = 0;
  let skipped = 0;

  const run = (fn: () => void) => {
    if (apply) getDb().transaction(() => fn());
  };

  for (const entry of data.new ?? []) {
    const phone = entry.phone ? normalizePhone(entry.phone) : null;
    if (entry.phone && !phone) throw new Error(`Geçersiz telefon: ${entry.name} ${entry.phone}`);
    const phonesOf = (r: (typeof existing)[number]) => [r.studentPhone, r.fatherPhone, r.motherPhone, r.contactParentPhone, r.emergencyPhone];
    const dup = existing.find((r) => key(r.studentFullName) === key(entry.name) && (!phone || phonesOf(r).includes(phone)));
    if (dup) {
      console.log(`  = atlandı (zaten var #${dup.id}): ${entry.name}`);
      skipped++;
      continue;
    }
    if (entry.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(entry.birthDate)) throw new Error(`Geçersiz doğum tarihi: ${entry.name} ${entry.birthDate}`);
    const year = entry.birthDate ? Number(entry.birthDate.slice(0, 4)) : entry.birthYear;
    const group = year ? (groups.find((g) => year >= g.minBirthYear && year <= g.maxBirthYear) ?? null) : null;
    const appointment = toIso(entry.appointment);
    console.log(`  + yeni: ${entry.name} · ${phone ?? "telefon yok"} · ${group?.name ?? "grup yok"}${entry.birthDate ? ` · doğum ${entry.birthDate}` : ""}${appointment ? ` · randevu ${entry.appointment}` : ""}${entry.note ? ` · "${entry.note}"` : ""}`);
    run(() => {
      const reg = createQuickRegistration({
        studentFullName: entry.name,
        parentFullName: entry.parent ?? null,
        phone,
        groupId: group?.id ?? null,
        birthDate: entry.birthDate ?? null,
        adminNote: entry.note ?? null,
      });
      if (appointment) scheduleAppointment(reg.id, appointment);
    });
    created++;
  }

  for (const entry of data.update ?? []) {
    const reg = getRegistration(entry.id);
    if (!reg || key(reg.studentFullName) !== key(entry.expectName)) {
      console.log(`  ! atlandı: #${entry.id} "${entry.expectName}" bulunamadı ya da ad uyuşmuyor (${reg ? `sistemde "${reg.studentFullName}"` : "kayıt yok"})`);
      skipped++;
      continue;
    }
    const changes: string[] = [];
    const note = entry.note && !(reg.adminNote ?? "").includes(entry.note) ? [reg.adminNote, entry.note].filter(Boolean).join("\n") : null;
    if (note) changes.push(`not: "${entry.note}"`);
    if (entry.rename && reg.studentFullName !== entry.rename) changes.push(`ad: ${reg.studentFullName} → ${entry.rename}`);
    const newPhone = entry.phone ? normalizePhone(entry.phone) : null;
    if (entry.phone && !newPhone) throw new Error(`Geçersiz telefon: #${entry.id} ${entry.phone}`);
    const phoneChange = newPhone && reg.contactParentType === "diger" && reg.contactParentPhone !== newPhone;
    if (entry.phone && reg.contactParentType !== "diger") console.log(`  ! #${reg.id}: telefon yalnızca eksik bilgili kayıtlarda düzeltilir, atlandı`);
    if (phoneChange) changes.push(`telefon: ${reg.contactParentPhone ?? "-"} → ${newPhone}`);
    const appointment = toIso(entry.appointment);
    const schedule = appointment && reg.status === "pending";
    if (schedule) changes.push(`randevu ${entry.appointment}`);
    if (changes.length === 0) {
      console.log(`  = değişiklik yok: #${reg.id} ${reg.studentFullName}`);
      skipped++;
      continue;
    }
    console.log(`  ~ #${reg.id} ${reg.studentFullName}: ${changes.join(" · ")}`);
    run(() => {
      if (note) updateAdminNote(reg.id, note);
      if (entry.rename && reg.studentFullName !== entry.rename) {
        getDb().update(registrations).set({ studentFullName: entry.rename, updatedAt: new Date().toISOString() }).where(eq(registrations.id, reg.id)).run();
      }
      if (phoneChange) {
        getDb()
          .update(registrations)
          .set({ contactParentPhone: newPhone, ...(reg.studentPhone === reg.contactParentPhone ? { studentPhone: newPhone } : {}), updatedAt: new Date().toISOString() })
          .where(eq(registrations.id, reg.id))
          .run();
      }
      if (schedule) scheduleAppointment(reg.id, appointment);
    });
    updated++;
  }

  console.log(`\nYeni: ${created} · Güncellenen: ${updated} · Atlanan: ${skipped}${apply ? "" : "  (deneme — hiçbir şey yazılmadı)"}`);
}

main().catch((err) => {
  console.error("Aktarım başarısız:", err instanceof Error ? err.message : err);
  process.exit(1);
});
