import { loadEnvFile } from "../lib/load-env";

loadEnvFile();

/**
 * Sahada tutulan kayıt listesini (panelden alınan Excel + eklenen sütunlar) sisteme işler.
 *   npm run import:enrollments -- <dosya.xlsx>           → deneme: her şey yapılır, sonunda geri alınır
 *   npm run import:enrollments -- <dosya.xlsx> --apply   → veritabanına yazar
 *   Seçenekler: --tarih=YYYY-MM-DD (Excel'de asıl kayıt tarihi yoksa; varsayılan bugün) · --aidat=2500 (8 antrenman, TL)
 *
 * Her satır mevcut bir kayıtla eşleştirilir: T.C. → aynı ad → aynı telefon + benzer ad (ör. "Hasaf" → "Asaf").
 * Eşleşmeyen satır yeni kayıt olur.
 * - Bilgiler: Excel'de dolu olan alanlar kaydın üzerine yazılır (ad düzeltmesi dahil). "Eksik Bilgi" boş sayılır.
 *   Geçersiz T.C. (ör. 10 haneli) olduğu gibi saklanır ve panelde "Veri kontrolü"nde işaretlenir; kayıttaki geçerli
 *   değerin üzerine yazılmaz. Başka biçimi hatalı değerler yazılmaz, uyarı olarak listelenir.
 * - "Kayıt durumu" = "Kayıt Oldu": asıl kayıt (tarih: Excel'deki "Asıl Kayıt Tarihi" ya da --tarih), grup doğum yılına göre.
 *   Başka bir değer (ör. "Kayıt Olmadı Ailesine Soracak") yönetici notuna yazılır.
 * - Aidat: "Verdi" → 8 antrenmanlık paket ödemesi; tam tutardan az ise fark adlandırılmış indirim ("Kardeş İndirimi").
 *   "Vermedi … verecek" → yönetici notu.
 * - Forma / eşofman: ödeme ve teslim durumu malzeme kaydı olarak ("… karar verilecek" ise yalnız not).
 * Tekrar çalıştırmak güvenlidir: ödeme, malzeme ve notlar ikinci kez eklenmez, aynı bilgi yeniden yazılmaz.
 */

type Row = Record<string, string>;

const COL = {
  no: "Sıra No",
  name: "Öğrenci Ad Soyad",
  enrolled: "Kayıt durumu",
  fee: "Aidat Verdi mi",
  kit: "Forma + Şort + Tozluk Parası verdi mi",
  tracksuit: "Eşofman Satın Alıp Ücreti Verdi Mi (Opsiyonel)",
  enrolledOn: "Asıl Kayıt Tarihi",
  group: "Grup",
  process: "Durum",
  height: "Boy (cm)",
  weight: "Kilo (kg)",
};

/** Excel sütunu → form alanı. */
const FIELDS = {
  studentTc: "Öğrenci T.C. Kimlik No",
  studentFullName: "Öğrenci Ad Soyad",
  birthDate: "Doğum Tarihi",
  homeAddress: "Ev Adresi",
  studentPhone: "Öğrenci İrtibat Telefonu",
  bloodGroup: "Kan Grubu",
  email: "E-mail",
  fatherFullName: "Baba Ad Soyad",
  fatherTc: "Baba T.C. Kimlik No",
  fatherPhone: "Baba GSM",
  motherFullName: "Anne Ad Soyad",
  motherTc: "Anne T.C. Kimlik No",
  motherPhone: "Anne GSM",
  contactParentType: "İletişimde Olunacak Veli",
  contactParentFullName: "İletişim Velisi Ad Soyad",
  contactParentPhone: "İletişim Velisi Telefon",
  emergencyFullName: "Acil Durum Kişisi Ad Soyad",
  emergencyRelation: "Yakınlık Durumu",
  emergencyPhone: "Acil Durum Telefon",
} as const;
type Field = keyof typeof FIELDS;
const TC_FIELDS = ["studentTc", "fatherTc", "motherTc"] as const;
type TcField = (typeof TC_FIELDS)[number];

const LABELS: Record<Field, string> = {
  studentTc: "T.C.",
  studentFullName: "ad",
  birthDate: "doğum tarihi",
  homeAddress: "adres",
  studentPhone: "irtibat tel.",
  bloodGroup: "kan grubu",
  email: "e-posta",
  fatherFullName: "baba",
  fatherTc: "baba T.C.",
  fatherPhone: "baba tel.",
  motherFullName: "anne",
  motherTc: "anne T.C.",
  motherPhone: "anne tel.",
  contactParentType: "iletişim velisi",
  contactParentFullName: "iletişim adı",
  contactParentPhone: "iletişim tel.",
  emergencyFullName: "acil kişi",
  emergencyRelation: "yakınlık",
  emergencyPhone: "acil tel.",
};

const PLACEHOLDER = /^(eksik bilgi|none|null|yok|-|—)$/i;
const clean = (s: string | undefined) => (s && !PLACEHOLDER.test(s.trim()) ? s.trim().replace(/\s+/g, " ") : "");
const lira = (s: string) => {
  const m = /(\d[\d.]*)\s*(tl|₺)?/i.exec(s.replace(/\s+tl/i, "tl"));
  return m ? Number(m[1]!.replace(/\./g, "")) : null;
};
const paid = (s: string) => /verdi/i.test(s) && !/vermedi/i.test(s);
const titleCase = (s: string) => s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1).toLocaleLowerCase("tr-TR");

/** Excel'deki veli türü → sistemdeki değer. */
function parentType(s: string): string {
  const v = s.toLocaleLowerCase("tr-TR");
  if (v.startsWith("ann")) return "anne";
  if (v.startsWith("bab")) return "baba";
  if (v.startsWith("diğ") || v.startsWith("dig")) return "diger";
  return "";
}

/** İki ad ne kadar benzer: 1 aynı, 0.9 biri diğerini içeriyor, 0.8 tek-iki harf farkı, 0 farklı. */
function nameScore(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ta = a.split(" ");
  const tb = b.split(" ");
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  if (short.length >= 2 && short.every((t) => long.includes(t))) return 0.9;
  if (levenshtein(a, b) <= 2 && (ta[0] === tb[0] || ta.at(-1) === tb.at(-1))) return 0.8;
  return 0;
}

function levenshtein(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length]![b.length]!;
}

async function readRows(file: string): Promise<Row[]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0]!;
  const text = (v: unknown): string => {
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (v && typeof v === "object") {
      const o = v as { text?: unknown; result?: unknown; richText?: { text: string }[] };
      if (o.richText) return o.richText.map((r) => r.text).join("");
      return String(o.text ?? o.result ?? "");
    }
    return String(v ?? "").trim();
  };
  const head = (ws.getRow(1).values as unknown[]).slice(1).map(text);
  const rows: Row[] = [];
  ws.eachRow((r, i) => {
    if (i === 1) return;
    const vals = (r.values as unknown[]).slice(1);
    rows.push(Object.fromEntries(head.map((h, k) => [h, text(vals[k])])));
  });
  return rows;
}

class DryRun extends Error {}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) throw new Error("Kullanım: npm run import:enrollments -- <dosya.xlsx> [--apply] [--tarih=YYYY-MM-DD] [--aidat=2500]");
  const apply = args.includes("--apply");
  const { istanbulDayKey } = await import("../lib/format");
  const day = args.find((a) => a.startsWith("--tarih="))?.slice(8) ?? istanbulDayKey(new Date());
  const feeTl = Number(args.find((a) => a.startsWith("--aidat="))?.slice(8) ?? "2500");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !(feeTl > 0)) throw new Error("Geçersiz --tarih ya da --aidat");

  const { getDb, resolveDatabasePath } = await import("../lib/db");
  const regsLib = await import("../lib/registrations");
  const billing = await import("../lib/billing");
  const { getSettings, setSetting } = await import("../lib/settings");
  const { listAgeGroups } = await import("../lib/age-groups-db");
  const { findGroupForBirthDate } = await import("../lib/age-groups");
  const equipment = await import("../lib/equipment");
  const { normalizePhone } = await import("../lib/phone");
  const { normalizeForSearch } = await import("../lib/search");
  const { emptyFormValues, validateRegistrationAdmin } = await import("../lib/validation");
  const { registrationToFormValues } = await import("../lib/registrations-client");
  const { duplicateMap } = await import("../lib/duplicates");
  const { isValidTcKimlikNo } = await import("../lib/tc");
  const badTc = (v: string | undefined) => Boolean(v) && !isValidTcKimlikNo(v!.replace(/\D/g, ""));
  const { recordMeasurement } = await import("../lib/development");
  const { payments, equipmentOrders, registrations } = await import("../lib/db/schema");
  const { eq, and } = await import("drizzle-orm");
  type Registration = typeof registrations.$inferSelect;
  type FormValues = ReturnType<typeof registrationToFormValues>;

  const db = getDb();
  console.log(`Veritabanı: ${resolveDatabasePath()}  ·  ${apply ? "UYGULANIYOR" : "DENEME (sonunda geri alınır)"}  ·  yeni kayıt tarihi ${day}  ·  aidat ${feeTl} TL\n`);

  const rows = (await readRows(file)).filter((r) => clean(r[COL.name]));
  const groups = listAgeGroups();
  const items = equipment.listItems(true);
  const kitItem = items.find((i) => /forma/i.test(i.name));
  const suitItem = items.find((i) => /eşofman|esofman/i.test(i.name));
  const feeKurus = feeTl * 100;
  const warnings: string[] = [];
  const plan: string[] = [];
  const touched = new Set<number>();
  const counts = { updated: 0, renamed: 0, created: 0, enrolled: 0, payments: 0, orders: 0, notes: 0, unchanged: 0 };

  /** Excel satırını form değerlerine çevirir (yalnız dolu alanlar). */
  function excelValues(row: Row): Partial<FormValues> {
    const out: Partial<FormValues> = {};
    for (const [field, col] of Object.entries(FIELDS) as [Field, string][]) {
      let v = clean(row[col]);
      if (!v) continue;
      if (field === "contactParentType") v = parentType(v);
      if (field.endsWith("Tc")) {
        const digits = v.replace(/\D/g, "");
        v = digits.length === 12 && digits.startsWith("0") ? digits.slice(1) : digits;
      }
      if (field === "bloodGroup") v = v.replace(/^O/i, "0");
      if (v) out[field] = v;
    }
    // Veli türü anne/baba ise iletişim kişisi o velidir; boşsa anne/baba alanlarını tamamlar.
    if (out.contactParentType === "anne" || out.contactParentType === "baba") {
      const who = out.contactParentType === "anne" ? "mother" : "father";
      if (!out[`${who}FullName`] && out.contactParentFullName) out[`${who}FullName`] = out.contactParentFullName;
      if (!out[`${who}Phone`] && out.contactParentPhone) out[`${who}Phone`] = out.contactParentPhone;
      // "Diğer" için tutulan ayrı iletişim kişisi artık kullanılmaz.
      out.contactParentFullName = "";
      out.contactParentPhone = "";
    }
    return out;
  }

  const phonesOf = (v: Partial<FormValues>) =>
    [v.studentPhone, v.fatherPhone, v.motherPhone, v.contactParentPhone].map((p) => (p ? normalizePhone(p) : null)).filter((p): p is string => Boolean(p));
  const regPhones = (r: Registration) => [r.studentPhone, r.fatherPhone, r.motherPhone, r.contactParentPhone].filter((p): p is string => Boolean(p));

  const run = () => {
    if (currentFeeDiffers()) {
      plan.push(`8 antrenmanlık aidat ${getSettings().feeAmountKurus / 100} TL → ${feeTl} TL`);
      setSetting("feeAmountKurus", feeKurus, null);
    }
    const all = regsLib.listRegistrations();
    const used = new Set<number>();
    const matchOf = new Map<Row, Registration | null>();

    // 1. tur: T.C. ya da birebir aynı ad
    for (const row of rows) {
      const ex = excelValues(row);
      const name = normalizeForSearch(clean(row[COL.name]));
      let m = ex.studentTc ? all.find((r) => r.studentTc === ex.studentTc) : undefined;
      if (!m) {
        const same = all.filter((r) => !used.has(r.id) && normalizeForSearch(r.studentFullName) === name);
        const phones = phonesOf(ex);
        m = same.length === 1 ? same[0] : same.find((r) => regPhones(r).some((p) => phones.includes(p)));
        if (same.length > 1 && !m) warnings.push(`${clean(row[COL.name])}: aynı adla ${same.length} kayıt var, hangisi olduğu anlaşılamadı — atlandı.`);
        if (same.length > 1 && !m) matchOf.set(row, null);
      }
      if (m) {
        used.add(m.id);
        matchOf.set(row, m);
      }
    }
    // 2. tur: aynı telefon + benzer ad (ad düzeltmeleri)
    for (const row of rows) {
      if (matchOf.has(row)) continue;
      const ex = excelValues(row);
      const name = normalizeForSearch(clean(row[COL.name]));
      const phones = phonesOf(ex);
      const scored = all
        .filter((r) => !used.has(r.id) && regPhones(r).some((p) => phones.includes(p)))
        .map((r) => ({ r, s: nameScore(name, normalizeForSearch(r.studentFullName)) }))
        .filter((x) => x.s >= 0.8)
        .sort((a, b) => b.s - a.s);
      if (scored.length > 1 && scored[0]!.s === scored[1]!.s) {
        warnings.push(`${clean(row[COL.name])}: ${scored.map((x) => x.r.studentFullName).join(" / ")} kayıtlarından hangisi olduğu anlaşılamadı — atlandı.`);
        matchOf.set(row, null);
        continue;
      }
      const m = scored[0]?.r;
      if (m) {
        used.add(m.id);
        matchOf.set(row, m);
      }
    }

    for (const row of rows) {
      const name = clean(row[COL.name]);
      if (matchOf.get(row) === null) continue;
      let reg = matchOf.get(row) ?? null;
      const lines: string[] = [];
      const ex = excelValues(row);

      // Bilgiler
      const base: FormValues = reg ? registrationToFormValues(reg) : { ...emptyFormValues(), contactParentType: "diger", studentFullName: name };
      // Geçersiz T.C.: doğrulamaya girmez; kayıtta geçerli bir değer yoksa olduğu gibi saklanır ve
      // panelde "Veri kontrolü"nde işaretlenir (tek rakam hatası düzeltilebilsin). Geçerli değerin üzerine yazılmaz.
      const baseRaw: Partial<Record<TcField, string>> = {};
      for (const f of TC_FIELDS)
        if (badTc(base[f])) {
          baseRaw[f] = base[f];
          base[f] = "";
        }
      const next: FormValues = { ...base, ...ex } as FormValues;
      const raw: Partial<Record<TcField, string>> = {};
      for (const f of TC_FIELDS) {
        if (badTc(next[f])) {
          const excelRaw = next[f];
          next[f] = base[f];
          if (!base[f]) {
            raw[f] = excelRaw;
            if (baseRaw[f] !== excelRaw) warnings.push(`${name}: ${LABELS[f]} "${excelRaw}" geçersiz — kaydedildi, panelde Veri kontrolü'nden düzeltin.`);
          }
        } else if (!next[f] && baseRaw[f]) raw[f] = baseRaw[f];
      }
      let result = validateRegistrationAdmin(next);
      if (!result.success) {
        for (const [field, msg] of Object.entries(result.errors) as [Field, string][]) {
          warnings.push(`${name}: ${LABELS[field]} "${next[field]}" yazılmadı (${msg})`);
          next[field] = base[field] ?? "";
        }
        result = validateRegistrationAdmin(next);
      }
      if (!result.success) {
        warnings.push(`${name}: bilgiler doğrulanamadı, satır atlandı.`);
        continue;
      }
      const data = result.data;
      if (!reg) {
        try {
          reg = regsLib.createRegistrationAdmin(data);
          regsLib.updateAdminNote(reg.id, "Excel'den aktarıldı.");
          reg = regsLib.getRegistration(reg.id)!;
          counts.created++;
          lines.push("yeni kayıt açıldı");
        } catch (err) {
          warnings.push(`${name}: kayıt açılamadı (${err instanceof regsLib.DuplicateStudentError ? "bu T.C. başka kayıtta" : String(err)})`);
          continue;
        }
      } else {
        const before = validateRegistrationAdmin(base);
        const old = before.success ? before.data : null;
        const changed = (Object.keys(LABELS) as Field[]).filter((f) => (raw[f as TcField] ?? String(data[f] ?? "")) !== (baseRaw[f as TcField] ?? String(old?.[f] ?? "")));
        if (changed.length) {
          try {
            reg = regsLib.updateRegistrationAdmin(reg.id, data);
            counts.updated++;
            if (changed.includes("studentFullName")) {
              counts.renamed++;
              lines.push(`ad düzeltildi: ${old?.studentFullName} → ${data.studentFullName}`);
            }
            const rest = changed.filter((f) => f !== "studentFullName");
            if (rest.length) lines.push(`bilgiler: ${rest.map((f) => LABELS[f]).join(", ")}`);
          } catch (err) {
            warnings.push(`${name}: bilgiler yazılamadı (${err instanceof regsLib.DuplicateStudentError ? "bu T.C. başka kayıtta" : String(err)})`);
          }
        }
      }
      if (Object.keys(raw).length) {
        db.update(registrations).set(raw).where(eq(registrations.id, reg.id)).run();
        reg = regsLib.getRegistration(reg.id)!;
      }
      touched.add(reg.id);

      // Asıl kayıt
      const status = clean(row[COL.enrolled]);
      const isEnrolled = /^kay[ıi]t oldu/i.test(status);
      const birth = reg.birthDate;
      const byBirth = birth ? (findGroupForBirthDate(groups, birth)?.id ?? null) : null;
      const byName = groups.find((g) => normalizeForSearch(g.name) === normalizeForSearch(clean(row[COL.group])))?.id ?? null;
      if (isEnrolled) {
        if (birth && Number(birth.slice(0, 4)) >= Number(day.slice(0, 4))) warnings.push(`${name}: doğum tarihi hatalı görünüyor (${birth}).`);
        if (reg.status !== "enrolled") {
          const on = /^\d{4}-\d{2}-\d{2}$/.test(clean(row[COL.enrolledOn])) ? clean(row[COL.enrolledOn]) : day;
          const group = reg.groupId ?? byBirth ?? byName;
          reg = regsLib.enrollRegistration(reg.id, { heightCm: reg.heightCm, weightKg: reg.weightKg, groupId: group, enrolledAtIso: `${on}T09:00:00.000Z` });
          counts.enrolled++;
          lines.push(`asıl kayıt: ${on}, no ${reg.studentNo}, ${groups.find((g) => g.id === group)?.name ?? "grupsuz"}`);
          if (!group) warnings.push(`${name}: grup belirlenemedi — panelden atanmalı.`);
        } else if (!reg.groupId && (byBirth ?? byName)) {
          const group = (byBirth ?? byName)!;
          db.update(registrations).set({ groupId: group }).where(eq(registrations.id, reg.id)).run();
          lines.push(`grup: ${groups.find((g) => g.id === group)?.name}`);
        } else if (!reg.groupId) warnings.push(`${name}: grubu yok — panelden atanmalı.`);
        const h = Number(clean(row[COL.height]).replace(",", ".")) || null;
        const w = Number(clean(row[COL.weight]).replace(",", ".")) || null;
        if ((h || w) && (h !== reg.heightCm || w !== reg.weightKg)) {
          recordMeasurement({ registrationId: reg.id, measuredOn: istanbulDayKey(new Date(reg.enrolledAt ?? Date.now())), heightCm: h, weightKg: w, userId: null });
          lines.push(`boy/kilo: ${h ?? "—"} / ${w ?? "—"}`);
        }
      }

      // Not: "Kayıt Olmadı …" ya da standart dışı süreç notu
      const notes: string[] = [];
      if (status && !isEnrolled) notes.push(`Kayıt: ${status}`);
      const proc = clean(row[COL.process]);
      if (proc && !/^(randevu bekliyor|randevu verildi|kay[ıi]t oldu|gelmedi|vazge[çc]ti|ayr[ıi]ld[ıi])$/i.test(proc)) notes.push(`Durum: ${proc}`);

      // Aidat
      const feeText = clean(row[COL.fee]);
      if (isEnrolled && paid(feeText)) {
        const amount = lira(feeText);
        let discount: { name: string; percent: number } | null = null;
        if (amount && amount < feeTl) discount = { name: titleCase(/\(([^)]+)\)/.exec(feeText)?.[1]?.trim() || "İndirim"), percent: Math.round((1 - amount / feeTl) * 100) };
        if (discount && reg.discountName !== discount.name) {
          billing.setDiscount(reg.id, discount.name, discount.percent);
          lines.push(`indirim: ${discount.name} %${discount.percent}`);
        }
        const already = db.select({ id: payments.id }).from(payments).where(eq(payments.registrationId, reg.id)).get();
        if (!already) {
          billing.recordPayment(reg.id, { periodCount: 1, method: "cash", paidOn: clean(row[COL.enrolledOn]).match(/^\d{4}-\d{2}-\d{2}$/) ? clean(row[COL.enrolledOn]) : day, note: "Excel'den aktarıldı" }, null);
          counts.payments++;
          lines.push(`aidat ödemesi ${amount ?? feeTl} TL nakit`);
        }
      } else if (feeText && /vermedi/i.test(feeText)) {
        const promise = feeText.replace(/^vermedi\s*/i, "").replace(/[()]/g, "").trim();
        if (promise) notes.push(`Aidat: ${promise}`);
      }

      // Malzeme (forma, eşofman)
      for (const [item, col] of [
        [kitItem, COL.kit],
        [suitItem, COL.tracksuit],
      ] as const) {
        const text = clean(row[col]);
        if (!item || !text || !isEnrolled) continue;
        if (/sat[ıi]n almad[ıi]|^almad[ıi]$/i.test(text)) continue;
        // Henüz karar verilmediyse sipariş sayılmaz, not düşülür.
        if (/karar verilecek/i.test(text)) {
          notes.push(`${item.name}: ${text}`);
          continue;
        }
        const exists = db.select({ id: equipmentOrders.id }).from(equipmentOrders).where(and(eq(equipmentOrders.registrationId, reg.id), eq(equipmentOrders.itemId, item.id))).get();
        if (exists) continue;
        const isPaid = paid(text);
        const delivery = /sipari[sş] verilecek/i.test(text) ? "to_order" : /teslim edildi|ald[ıi]/i.test(text) && !/almad[ıi]|edilmedi/i.test(text) ? "delivered" : "waiting";
        equipment.createOrder(reg.id, { itemId: item.id, size: null, priceKurus: item.priceKurus, paid: isPaid, delivery, note: text }, null, day);
        counts.orders++;
        lines.push(`${item.name.toLocaleLowerCase("tr-TR")}: ${isPaid ? "ödendi" : "ödenmedi"}, ${{ to_order: "sipariş verilecek", delivered: "teslim edildi", waiting: "teslim edilmedi" }[delivery]}`);
      }

      // Notlar (aynı satır ikinci kez eklenmez)
      const current = regsLib.getRegistration(reg.id)?.adminNote ?? "";
      const fresh = notes.filter((n) => !current.includes(n));
      if (fresh.length) {
        regsLib.updateAdminNote(reg.id, [current, ...fresh].filter(Boolean).join("\n"));
        counts.notes++;
        lines.push(`not: ${fresh.join(" · ")}`);
      }

      if (lines.length) plan.push(`${reg.studentFullName}${reg.studentNo ? ` (No ${reg.studentNo})` : ""}: ${lines.join(" · ")}`);
      else counts.unchanged++;
    }

    // Aktarımdan sonra olası tekrarlar (panelde "Olası tekrar" olarak görünür, "Birleştir" ile tek kayda indirilir)
    const after = regsLib.listRegistrations();
    const byId = new Map(after.map((r) => [r.id, r]));
    const seen = new Set<string>();
    for (const [id, others] of duplicateMap(after)) {
      if (!touched.has(id)) continue;
      for (const o of others) {
        const k = [id, o].sort().join("-");
        if (seen.has(k)) continue;
        seen.add(k);
        warnings.push(`Olası tekrar: ${byId.get(id)?.studentFullName} (#${id}) ↔ ${byId.get(o)?.studentFullName} (#${o}) — panelden karşılaştırıp birleştirin.`);
      }
    }
    if (!apply) throw new DryRun();
  };

  const currentFeeDiffers = () => getSettings().feeAmountKurus !== feeKurus;

  try {
    db.transaction(run);
  } catch (err) {
    if (!(err instanceof DryRun)) throw err;
  }

  console.log(plan.length ? plan.map((p) => `• ${p}`).join("\n") : "Değişiklik yok.");
  if (warnings.length) console.log(`\nUyarılar:\n${warnings.map((w) => `  ! ${w}`).join("\n")}`);
  console.log(
    `\n${rows.length} satır: ${counts.enrolled} asıl kayıt, ${counts.created} yeni kayıt, ${counts.updated} bilgi güncellemesi (${counts.renamed} ad düzeltmesi), ${counts.payments} aidat ödemesi, ${counts.orders} malzeme, ${counts.notes} not, ${counts.unchanged} değişmedi.`,
  );
  console.log(apply ? "Yazıldı." : "Deneme: hiçbir şey yazılmadı. Uygulamak için --apply ekleyin.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
