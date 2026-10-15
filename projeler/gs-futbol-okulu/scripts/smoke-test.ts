/**
 * Mantıksal smoke test: geçici bir SQLite dosyası üzerinde tüm iş kurallarını uçtan uca doğrular.
 * Çalıştırma: npm run smoke
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gs-kayit-smoke-"));
process.env.DATABASE_PATH = path.join(tmpDir, "smoke.db");
process.env.NEXT_PUBLIC_SITE_URL = "https://123-123-123-123.sslip.io";

type Step = [name: string, fn: () => void | Promise<void>];
const steps: Step[] = [];
const test = (name: string, fn: () => void | Promise<void>) => steps.push([name, fn]);

/** Geçerli rastgele T.C. Kimlik No üretir (checksum kurallarına uygun). */
function makeTc(seed: number): string {
  const d: number[] = [];
  let x = seed;
  d.push(1 + (x % 9));
  for (let i = 1; i < 9; i++) {
    x = (x * 1103515245 + 12345) % 2147483648;
    d.push(x % 10);
  }
  const odd = d[0]! + d[2]! + d[4]! + d[6]! + d[8]!;
  const even = d[1]! + d[3]! + d[5]! + d[7]!;
  d.push((((odd * 7 - even) % 10) + 10) % 10);
  d.push(d.reduce((a, b) => a + b, 0) % 10);
  return d.join("");
}

async function main() {
  const { isValidTcKimlikNo } = await import("../lib/tc");
  const { normalizePhone, formatPhone, maskPhoneInput } = await import("../lib/phone");
  const { validateRegistration, emptyFormValues, coerceFormValues } = await import("../lib/validation");
  const { computeAge } = await import("../lib/format");
  const { createRegistration, listRegistrations, updateRegistration, deleteRegistration, getRegistration, DuplicateStudentError, countRegistrations } =
    await import("../lib/registrations");
  const { buildRegistrationsXlsx, buildXlsxFileName } = await import("../lib/export/xlsx");
  const { buildRegistrationsVcf } = await import("../lib/export/vcf");
  const { buildQrPng } = await import("../lib/qr");
  const { getPublicFormUrl } = await import("../lib/site-url");
  const { matchesSearch } = await import("../lib/search");
  const { toRegistrationDto } = await import("../lib/api");
  const ExcelJS = (await import("exceljs")).default;
  const jsQR = (await import("jsqr")).default;
  const { PNG } = await import("pngjs");

  const studentTc = makeTc(7);
  const fatherTc = makeTc(11);
  const motherTc = makeTc(13);

  test("TC checksum: bilinen geçerli/geçersiz örnekler", () => {
    assert.equal(isValidTcKimlikNo("10000000146"), true);
    assert.equal(isValidTcKimlikNo("12345678901"), false);
    assert.equal(isValidTcKimlikNo("01234567890"), false); // 0 ile başlayamaz
    assert.equal(isValidTcKimlikNo("1234567890"), false); // 10 hane
    assert.equal(isValidTcKimlikNo(studentTc), true);
    assert.equal(isValidTcKimlikNo(fatherTc), true);
    assert.notEqual(studentTc, fatherTc);
  });

  test("Telefon normalizasyonu ve görüntü formatı", () => {
    assert.equal(normalizePhone("0555 555 55 55"), "05555555555");
    assert.equal(normalizePhone("5555555555"), "05555555555");
    assert.equal(normalizePhone("+90 555 555 55 55"), "05555555555");
    assert.equal(normalizePhone("905555555555"), "05555555555");
    assert.equal(normalizePhone("0274 123 45 67"), null); // sabit hat kabul edilmez
    assert.equal(normalizePhone("abc"), null);
    assert.equal(formatPhone("05555555555"), "0555 555 55 55");
    assert.equal(maskPhoneInput("5551234567"), "0555 123 45 67");
    assert.equal(maskPhoneInput("+905551234567"), "0555 123 45 67");
  });

  const validValues = () => ({
    ...emptyFormValues(),
    studentTc,
    studentFullName: "  Ahmet   Yılmaz ",
    birthDate: "2015-03-04",
    homeAddress: "Yıldırım Beyazıt Mah. 1. Sk. No:5 Kütahya",
    studentPhone: "0555 111 11 11",
    bloodGroup: "A Rh+",
    email: "Veli@Example.com",
    fatherFullName: "Mehmet Yılmaz",
    fatherTc,
    fatherPhone: "0555 222 22 22",
    motherFullName: "Ayşe Yılmaz",
    motherTc,
    motherPhone: "0555 333 33 33",
    contactParentType: "anne",
    emergencyFullName: "Ali Veli",
    emergencyRelation: "Dayı",
    emergencyPhone: "0555 444 44 44",
  });

  test("Validasyon: geçerli form normalize edilir", () => {
    const r = validateRegistration(validValues());
    assert.equal(r.success, true);
    if (!r.success) return;
    assert.equal(r.data.studentFullName, "Ahmet Yılmaz");
    assert.equal(r.data.studentPhone, "05551111111");
    assert.equal(r.data.email, "veli@example.com");
    assert.equal(r.data.contactParentFullName, null);
    assert.equal(r.data.contactParentPhone, null);
  });

  test("Validasyon: zorunlu alanlar, TC, telefon, e-mail, gelecek tarih", () => {
    const r = validateRegistration({
      ...validValues(),
      studentTc: "1234567890",
      studentFullName: "",
      studentPhone: "123",
      email: "gecersiz",
      birthDate: "2999-01-01",
      bloodGroup: "",
      contactParentType: "",
    });
    assert.equal(r.success, false);
    if (r.success) return;
    assert.ok(r.errors.studentTc);
    assert.ok(r.errors.studentFullName);
    assert.ok(r.errors.studentPhone);
    assert.ok(r.errors.email);
    assert.ok(r.errors.birthDate?.includes("gelecekte"));
    assert.ok(r.errors.bloodGroup);
    assert.ok(r.errors.contactParentType);
  });

  test("Validasyon: 'Diğer' seçilince iletişim velisi alanları zorunlu", () => {
    const r1 = validateRegistration({ ...validValues(), contactParentType: "diger" });
    assert.equal(r1.success, false);
    if (!r1.success) {
      assert.ok(r1.errors.contactParentFullName);
      assert.ok(r1.errors.contactParentPhone);
    }
    const r2 = validateRegistration({
      ...validValues(),
      contactParentType: "diger",
      contactParentFullName: "Fatma Kaya",
      contactParentPhone: "0555 666 66 66",
    });
    assert.equal(r2.success, true);
    if (r2.success) assert.equal(r2.data.contactParentPhone, "05556666666");
  });

  test("Validasyon: 'Baba' seçilince baba bilgileri zorunlu; yarım veli bloğu reddedilir", () => {
    const r = validateRegistration({ ...validValues(), contactParentType: "baba", fatherFullName: "", fatherPhone: "" });
    assert.equal(r.success, false);
    if (!r.success) assert.ok(r.errors.fatherFullName && r.errors.fatherPhone);
    const half = validateRegistration({ ...validValues(), fatherPhone: "" });
    assert.equal(half.success, false);
    if (!half.success) assert.ok(half.errors.fatherPhone);
  });

  test("Validasyon: tek veli (sadece anne) kabul edilir, hiç veli yoksa reddedilir", () => {
    const single = validateRegistration({ ...validValues(), fatherFullName: "", fatherTc: "", fatherPhone: "" });
    assert.equal(single.success, true);
    const none = validateRegistration({
      ...validValues(),
      fatherFullName: "",
      fatherTc: "",
      fatherPhone: "",
      motherFullName: "",
      motherTc: "",
      motherPhone: "",
    });
    assert.equal(none.success, false);
  });

  test("coerceFormValues bilinmeyen alanları atar, tipleri stringe çevirir", () => {
    const v = coerceFormValues({ studentTc: 123, hacker: "x", studentFullName: ["a"] });
    assert.equal(v.studentTc, "123");
    assert.equal(v.studentFullName, "");
    assert.equal("hacker" in v, false);
  });

  test("Yaş hesabı", () => {
    assert.equal(computeAge("2015-03-04", new Date(2026, 2, 3)), 10);
    assert.equal(computeAge("2015-03-04", new Date(2026, 2, 4)), 11);
    assert.equal(computeAge("gecersiz"), null);
  });

  let createdId = 0;
  test("DB: kayıt oluşturma", () => {
    const r = validateRegistration(validValues());
    assert.equal(r.success, true);
    if (!r.success) return;
    const created = createRegistration(r.data);
    createdId = created.id;
    assert.ok(created.id > 0);
    assert.equal(created.studentTc, studentTc);
    assert.equal(created.studentPhone, "05551111111");
    assert.equal(countRegistrations(), 1);
  });

  test("DB: aynı öğrenci TC ile ikinci kayıt engellenir", () => {
    const r = validateRegistration({ ...validValues(), studentFullName: "Başka İsim" });
    assert.equal(r.success, true);
    if (!r.success) return;
    assert.throws(() => createRegistration(r.data), DuplicateStudentError);
    assert.equal(countRegistrations(), 1);
  });

  let secondId = 0;
  test("DB: listeleme en yeni üstte", async () => {
    const r = validateRegistration({ ...validValues(), studentTc: makeTc(99), studentFullName: "Zeynep Kaya", contactParentType: "diger", contactParentFullName: "Hasan Kaya", contactParentPhone: "0555 777 77 77" });
    assert.equal(r.success, true);
    if (!r.success) return;
    await new Promise((res) => setTimeout(res, 5));
    secondId = createRegistration(r.data).id;
    const list = listRegistrations();
    assert.equal(list.length, 2);
    assert.equal(list[0]!.id, secondId);
    assert.equal(list[1]!.id, createdId);
  });

  test("DB: güncelleme (updated_at değişir, TC çakışması reddedilir)", async () => {
    const before = getRegistration(createdId)!;
    await new Promise((res) => setTimeout(res, 5));
    const r = validateRegistration({ ...validValues(), studentFullName: "Ahmet Can Yılmaz" });
    assert.equal(r.success, true);
    if (!r.success) return;
    const updated = updateRegistration(createdId, r.data);
    assert.equal(updated.studentFullName, "Ahmet Can Yılmaz");
    assert.notEqual(updated.updatedAt, before.updatedAt);
    assert.equal(updated.createdAt, before.createdAt);

    const clash = validateRegistration({ ...validValues(), studentTc: makeTc(99) });
    assert.equal(clash.success, true);
    if (clash.success) assert.throws(() => updateRegistration(createdId, clash.data), DuplicateStudentError);
  });

  test("Arama: ad, TC, anne/baba adı, telefon, e-mail", () => {
    const dto = toRegistrationDto(getRegistration(createdId)!);
    assert.equal(matchesSearch(dto, "ahmet"), true);
    assert.equal(matchesSearch(dto, "YILMAZ"), true);
    assert.equal(matchesSearch(dto, "yilmaz"), true);
    assert.equal(matchesSearch(dto, studentTc.slice(0, 6)), true);
    assert.equal(matchesSearch(dto, "Ayşe"), true);
    assert.equal(matchesSearch(dto, "Mehmet"), true);
    assert.equal(matchesSearch(dto, "0555 333"), true);
    assert.equal(matchesSearch(dto, "+90 555 333 33 33"), true);
    assert.equal(matchesSearch(dto, "veli@example"), true);
    assert.equal(matchesSearch(dto, "olmayan kisi"), false);
  });

  test("Excel: gerçek XLSX üretir; TC/telefon string, tarihler Date, başlık bold, filtre ve freeze var", async () => {
    const { ALL_COLUMNS } = await import("../lib/export/columns");
    // Varsayılan: hesaplanan sütunlar olmadan (onlar ayrı testte)
    const buffer = await buildRegistrationsXlsx(listRegistrations(), [], ALL_COLUMNS.filter((c) => !c.computed));
    assert.ok(buffer.length > 1000);
    assert.equal(buffer.subarray(0, 2).toString("ascii"), "PK"); // ZIP imzası
    assert.match(buildXlsxFileName(new Date(2026, 8, 19)), /^galatasaray-futbol-okulu-kayitlari-2026-09-19\.xlsx$/);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    const ws = wb.getWorksheet("Kayıtlar")!;
    assert.ok(ws);
    const header = ws.getRow(1);
    // Sütunlar başlık adıyla bulunur (yeni sütun eklendikçe test bozulmasın)
    const col = (name: string) => {
      for (let i = 1; i <= header.cellCount; i++) if (header.getCell(i).value === name) return i;
      throw new Error(`sütun yok: ${name}`);
    };
    assert.equal(header.getCell(1).value, "Sıra No");
    assert.equal(header.getCell(2).value, "Öğrenci No");
    assert.equal(header.getCell(header.cellCount).value, "Son Güncelleme Tarihi");
    assert.equal(header.getCell(1).font?.bold, true);
    assert.ok(ws.autoFilter);
    assert.equal(ws.views[0]?.state, "frozen");
    assert.equal(ws.views[0]?.ySplit, 1);
    assert.throws(() => col("Aidat Durumu"), "aidat sütunları yalnız istenince ve izinle");

    const row = ws.getRow(2); // en yeni kayıt (Zeynep)
    const tc = col("Öğrenci T.C. Kimlik No");
    assert.equal(typeof row.getCell(tc).value, "string");
    assert.equal(row.getCell(tc).value, makeTc(99));
    assert.equal(row.getCell(tc).numFmt, "@");
    assert.equal(typeof row.getCell(col("Öğrenci İrtibat Telefonu")).value, "string");
    assert.equal(row.getCell(col("Öğrenci İrtibat Telefonu")).value, "05551111111");
    assert.ok(row.getCell(col("Doğum Tarihi")).value instanceof Date);
    assert.equal(row.getCell(col("İletişimde Olunacak Veli")).value, "Diğer");
    assert.equal(row.getCell(col("İletişim Velisi Ad Soyad")).value, "Hasan Kaya");
    assert.equal(row.getCell(col("İletişim Velisi Telefon")).value, "05557777777");
    assert.equal(row.getCell(col("Durum")).value, "Randevu bekliyor");
    col("Kaleci");
    assert.ok(row.getCell(col("Başvuru Tarihi")).value instanceof Date);
  });

  test("Excel: filtre ve sütun seçimi uygulanır", async () => {
    const { filterRegistrations, parseExportFilter } = await import("../lib/export/filter");
    const { resolveColumns } = await import("../lib/export/columns");
    const all = listRegistrations();
    const f = parseExportFilter(new URLSearchParams("status=pending,bogus&group=none,abc&from=2000-01-01&to=kotu"));
    assert.deepEqual(f.statuses, ["pending"]);
    assert.deepEqual(f.groups, ["none"]);
    assert.equal(f.to, null);
    assert.equal(filterRegistrations(all, [], parseExportFilter(new URLSearchParams("status=enrolled"))).length, 0);
    const cols = resolveColumns(["studentFullName", "hacker", "age"]);
    assert.deepEqual(cols.map((c) => c.key), ["studentFullName", "age"]);
    assert.equal(resolveColumns(["yok"]).length > 20, true); // bilinmeyenlerde tüm sütunlar
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await buildRegistrationsXlsx(all, [], cols)) as unknown as ArrayBuffer);
    const header = wb.getWorksheet("Kayıtlar")!.getRow(1);
    assert.equal(header.cellCount, 3);
    assert.equal(header.getCell(2).value, "Öğrenci Ad Soyad");
  });

  test("Eksik bilgili kayıt: TC'siz açılır, eksikler hesaplanır, grup elle seçilenden gelir", async () => {
    const { createQuickRegistration, updateQuickRegistration } = await import("../lib/registrations");
    const { effectiveGroup } = await import("../lib/age-groups");
    const { missingFields } = await import("../lib/completeness");
    const { listAgeGroups } = await import("../lib/age-groups-db");
    const groups = listAgeGroups(); // migration'daki varsayılan gruplar
    const g2015 = groups.find((g) => 2015 >= g.minBirthYear && 2015 <= g.maxBirthYear)!;
    const other = groups.find((g) => g.id !== g2015.id)!;
    const a = createQuickRegistration({ studentFullName: "Eksik Bir", parentFullName: "Veli Bir", phone: "05551230000", groupId: other.id, birthDate: null, adminNote: "not" });
    const b = createQuickRegistration({ studentFullName: "Eksik İki", parentFullName: null, phone: null, groupId: null, birthDate: null, adminNote: null });
    assert.equal(a.studentTc, null);
    assert.equal(b.studentTc, null); // birden fazla boş TC UNIQUE index'e takılmaz
    assert.ok(missingFields(a).includes("T.C. Kimlik No"));
    assert.ok(missingFields(a).includes("Doğum tarihi"));
    assert.equal(effectiveGroup(a, groups).group?.id, other.id); // doğum tarihi yok → elle seçilen
    assert.equal(effectiveGroup(a, groups).suggested, false);
    const withBirth = updateQuickRegistration(a.id, { studentFullName: "Eksik Bir", parentFullName: "Veli Bir", phone: "05551230000", groupId: other.id, birthDate: "2015-05-05", adminNote: "not" });
    assert.equal(effectiveGroup(withBirth, groups).group?.id, g2015.id); // doğum yılı elle seçilenin önüne geçer
    assert.equal(effectiveGroup(withBirth, groups).suggested, true);
    assert.equal(toRegistrationDto(withBirth).contact.phone, "05551230000");
    deleteRegistration(a.id);
    deleteRegistration(b.id);
  });

  test("VCF: vCard 3.0, UTF-8, öğrenci başına tek kart, TC içermez, etiketler ve satır katlama doğru", () => {
    const vcf = buildRegistrationsVcf(listRegistrations());
    const cards = vcf.split("BEGIN:VCARD").filter(Boolean);
    assert.equal(cards.length, 2);
    assert.ok(vcf.includes("VERSION:3.0"));
    assert.ok(vcf.includes("FN:GS Futbol - Ahmet Can Yılmaz"));
    assert.ok(vcf.includes("FN:GS Futbol - Zeynep Kaya"));
    assert.ok(vcf.includes("TEL;type=CELL;type=VOICE;type=pref:+905551111111"));
    assert.ok(vcf.includes("X-ABLabel:Öğrenci"));
    assert.ok(vcf.includes("X-ABLabel:Anne"));
    assert.ok(vcf.includes("X-ABLabel:Baba"));
    assert.ok(vcf.includes("X-ABLabel:Acil Durum (Dayı)"));
    assert.ok(vcf.includes("X-ABLabel:İletişim Velisi (Hasan Kaya)"));
    assert.ok(vcf.includes("NOTE:Galatasaray Kütahya Futbol Okulu\\nÖğrenci: Ahmet Can Yılmaz"));
    assert.ok(vcf.includes("BDAY:2015-03-04"));
    assert.ok(vcf.includes("EMAIL;type=INTERNET;type=HOME;type=pref:veli@example.com"));
    assert.equal(vcf.includes(studentTc), false);
    assert.equal(vcf.includes(fatherTc), false);
    assert.equal(vcf.includes(motherTc), false);
    assert.equal(vcf.includes(makeTc(99)), false);
    // Satır sonları CRLF ve her fiziksel satır <= 75 oktet
    assert.equal(/[^\r]\n/.test(vcf), false);
    for (const line of vcf.split("\r\n")) {
      assert.ok(Buffer.byteLength(line, "utf8") <= 75, `Satır 75 okteti aşıyor: ${line}`);
    }
    assert.ok(vcf.endsWith("END:VCARD\r\n"));
  });

  test("QR: PNG üretir ve içeriği SITE_URL/on-kayit olarak çözülür", async () => {
    const url = getPublicFormUrl();
    assert.equal(url, "https://123-123-123-123.sslip.io/on-kayit");
    const png = await buildQrPng(url);
    assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
    const decodedPng = PNG.sync.read(png);
    assert.equal(decodedPng.width, 2048);
    const result = jsQR(new Uint8ClampedArray(decodedPng.data.buffer, decodedPng.data.byteOffset, decodedPng.data.length), decodedPng.width, decodedPng.height);
    assert.ok(result, "QR çözülemedi");
    assert.equal(result!.data, url);
  });

  test("DB: silme", () => {
    assert.equal(deleteRegistration(secondId), true);
    assert.equal(deleteRegistration(secondId), false);
    assert.equal(countRegistrations(), 1);
    assert.equal(getRegistration(secondId), null);
  });

  const { hashPassword, verifyPassword } = await import("../lib/auth/password");
  const { upsertAdmin, authenticate: authenticateAny } = await import("../lib/auth/users");
  const authenticate = (id: string, pw: string) => authenticateAny(id, pw, ["admin"]);
  const { createSession, validateSessionToken, deleteSession } = await import("../lib/auth/sessions");
  const { safeNextPath, SESSION_IDLE_SECONDS, SESSION_MAX_AGE_SECONDS } = await import("../lib/auth/cookie");
  const { checkRateLimit, resetRateLimit } = await import("../lib/rate-limit");

  test("Auth: şifre özeti doğrulanır, yanlış şifre ve bozuk özet reddedilir", async () => {
    const hash = await hashPassword("Doğru-Şifre-123");
    assert.match(hash, /^scrypt\$32768\$8\$1\$/);
    assert.notEqual(hash, await hashPassword("Doğru-Şifre-123")); // her seferinde farklı salt
    assert.equal(await verifyPassword("Doğru-Şifre-123", hash), true);
    assert.equal(await verifyPassword("dogru-sifre-123", hash), false);
    assert.equal(await verifyPassword("Doğru-Şifre-123", "bozuk"), false);
  });

  test("Auth: admin seed, giriş, şifre değişince eski şifre ve oturumlar geçersiz", async () => {
    await assert.rejects(upsertAdmin("a", "Uzun-Sifre-123"));
    await assert.rejects(upsertAdmin("yonetici", "kisa"));
    const { user: admin, created } = await upsertAdmin("  Yonetici ", "Ilk-Sifre-12345");
    assert.equal(created, true);
    assert.equal(admin.username, "yonetici");
    assert.equal((await authenticate("YONETICI", "Ilk-Sifre-12345"))?.id, admin.id);
    assert.equal(await authenticate("yonetici", "yanlis-sifre"), null);
    assert.equal(await authenticate("olmayan", "Ilk-Sifre-12345"), null);

    const token = createSession(admin.id);
    assert.equal(validateSessionToken(token)?.username, "yonetici");
    const again = await upsertAdmin("yonetici", "Yeni-Sifre-12345");
    assert.equal(again.created, false);
    assert.equal(validateSessionToken(token), null);
    assert.equal(await authenticate("yonetici", "Ilk-Sifre-12345"), null);
    assert.ok(await authenticate("yonetici", "Yeni-Sifre-12345"));
  });

  test("Auth: oturum hareketsizlik ve mutlak süre dolunca düşer, çıkışta silinir", async () => {
    const admin = (await authenticate("yonetici", "Yeni-Sifre-12345"))!;
    const t0 = new Date("2026-01-01T00:00:00Z");
    const at = (s: number) => new Date(t0.getTime() + s * 1000);

    const idle = createSession(admin.id, t0);
    assert.ok(validateSessionToken(idle, at(SESSION_IDLE_SECONDS - 60)));
    assert.equal(validateSessionToken(idle, at(2 * SESSION_IDLE_SECONDS)), null);

    const active = createSession(admin.id, t0);
    let now = 0;
    while (now + SESSION_IDLE_SECONDS / 2 < SESSION_MAX_AGE_SECONDS) {
      now += SESSION_IDLE_SECONDS / 2;
      assert.ok(validateSessionToken(active, at(now)), "aktif kullanımda oturum açık kalmalı");
    }
    assert.equal(validateSessionToken(active, at(SESSION_MAX_AGE_SECONDS + 1)), null);

    const out = createSession(admin.id);
    deleteSession(out);
    assert.equal(validateSessionToken(out), null);
    assert.equal(validateSessionToken(undefined), null);
    assert.equal(validateSessionToken("uydurma-token"), null);
  });

  test("Auth: rol kapısı ve pasif hesap", async () => {
    const { getDb } = await import("../lib/db");
    const { users } = await import("../lib/db/schema");
    const { hashPassword } = await import("../lib/auth/password");
    const { eq } = await import("drizzle-orm");
    const coach = getDb()
      .insert(users)
      .values({ role: "coach", username: "antrenor1", email: "Koc@Ornek.com".toLowerCase(), passwordHash: await hashPassword("Koc-Sifre-12345") })
      .returning()
      .get();
    assert.equal(await authenticateAny("antrenor1", "Koc-Sifre-12345", ["admin"]), null); // admin kapısından giremez
    assert.equal((await authenticateAny("KOC@ornek.com", "Koc-Sifre-12345", ["coach"]))?.id, coach.id); // e-postayla, büyük/küçük harf fark etmez
    const token = createSession(coach.id);
    assert.equal(validateSessionToken(token)?.role, "coach");
    getDb().update(users).set({ status: "disabled" }).where(eq(users.id, coach.id)).run();
    assert.equal(validateSessionToken(token), null); // pasifleştirilen hesabın oturumu düşer
    assert.equal(await authenticateAny("antrenor1", "Koc-Sifre-12345", ["coach"]), null);
  });

  test("Auth: giriş sonrası yönlendirme yalnızca panel içi yollara izin verir", () => {
    assert.equal(safeNextPath("/admin/qr-afis"), "/admin/qr-afis");
    assert.equal(safeNextPath("/admin"), "/admin");
    assert.equal(safeNextPath("//evil.com"), "/admin");
    assert.equal(safeNextPath("https://evil.com/admin"), "/admin");
    assert.equal(safeNextPath("/admin/giris"), "/admin");
    assert.equal(safeNextPath("/on-kayit"), "/admin");
    assert.equal(safeNextPath(null), "/admin");
  });

  test("Rate limit: özel limit uygulanır, sıfırlanınca yeniden izin verir", () => {
    const opts = { max: 2, windowMs: 60_000 };
    const now = Date.now();
    assert.equal(checkRateLimit("smoke-login", now, opts).allowed, true);
    assert.equal(checkRateLimit("smoke-login", now, opts).allowed, true);
    assert.equal(checkRateLimit("smoke-login", now, opts).allowed, false);
    resetRateLimit("smoke-login");
    assert.equal(checkRateLimit("smoke-login", now, opts).allowed, true);
  });

  /* ---------------- Aidat, yoklama, kart, veli (paket 2–6) ---------------- */
  const dates = await import("../lib/dates");
  const billingShared = await import("../lib/billing-shared");
  const billing = await import("../lib/billing");
  const settingsLib = await import("../lib/settings");
  const regsLib = await import("../lib/registrations");
  const program = await import("../lib/program");
  const att = await import("../lib/attendance");
  const gridLib = await import("../lib/attendance-grid");
  const cardsLib = await import("../lib/cards");
  const scanLib = await import("../lib/scan");
  const guardians = await import("../lib/guardians");
  const portalLogin = await import("../lib/auth/portal-login");
  const legal = await import("../lib/legal");
  const filesLib = await import("../lib/files");
  const cal = await import("../lib/calendar-feed");
  const cookieLib = await import("../lib/auth/cookie");
  const validationLib = await import("../lib/validation");
  const { listAgeGroups } = await import("../lib/age-groups-db");
  const dbMod = await import("../lib/db");
  const schema = await import("../lib/db/schema");
  const orm = await import("drizzle-orm");

  const quick = (name: string, phone: string) => regsLib.createQuickRegistration({ studentFullName: name, parentFullName: `${name} Veli`, phone, groupId: null, birthDate: "2016-05-05", adminNote: null });

  test("Tarih: kesim günü ay sonuna yuvarlanır, dönem sonu bir sonraki ayın kesim günü", () => {
    assert.equal(dates.periodEnd("2026-01-31", 31), "2026-02-28");
    assert.equal(dates.periodEnd("2026-02-28", 31), "2026-03-31");
    assert.equal(dates.latestBillingOnOrBefore("2026-03-05", 10), "2026-02-10");
    assert.equal(dates.addDaysTo("2026-12-30", 3), "2027-01-02");
  });

  test("Erişim: ödendi / tolerans / kilitli / elle açık / aidat başlamadı", () => {
    const p = (start: string, status = "open") => ({ id: 1, startDate: start, endDate: dates.periodEnd(start, 10), dueDate: start, amountKurus: 100000, status });
    const base = { enrolled: true, overrides: [], graceDays: 3 };
    assert.equal(billingShared.computeAccess({ ...base, periods: [], today: "2026-03-01" }).state, "unbilled");
    assert.equal(billingShared.computeAccess({ ...base, periods: [p("2026-03-10", "paid")], today: "2026-03-20" }).state, "paid");
    const g = billingShared.computeAccess({ ...base, periods: [p("2026-03-10")], today: "2026-03-12" });
    assert.equal(g.state, "grace");
    assert.equal(g.lastDay, "2026-03-12");
    assert.equal(billingShared.computeAccess({ ...base, periods: [p("2026-03-10")], today: "2026-03-13" }).state, "locked");
    const o = billingShared.computeAccess({ ...base, periods: [p("2026-03-10")], overrides: [{ id: 1, startsOn: "2026-03-13", endsOn: "2026-03-15", reason: "x", revokedAt: null, fulfilledAt: null }], today: "2026-03-14" });
    assert.equal(o.state, "override");
    assert.equal(o.allowed, true);
    // Ödeme sözü toleranstan önce de geçerli; söz günü geçince "gelmedi", ödeme gelince (fulfilledAt) sayılmaz
    const promise = (endsOn: string, fulfilledAt: string | null = null) => [{ id: 2, startsOn: "2026-03-09", endsOn, reason: "Ödeme sözü", revokedAt: null, fulfilledAt }];
    const early = billingShared.computeAccess({ ...base, periods: [p("2026-03-10")], overrides: promise("2026-03-20"), today: "2026-03-11" });
    assert.equal(early.state, "override");
    assert.equal(early.lastDay, "2026-03-20");
    const missed = billingShared.computeAccess({ ...base, periods: [p("2026-03-10")], overrides: promise("2026-03-20"), today: "2026-03-21" });
    assert.equal(missed.state, "locked");
    assert.equal(missed.promiseMissed, "2026-03-20");
    assert.equal(billingShared.computeAccess({ ...base, periods: [p("2026-03-10")], overrides: promise("2026-03-20", "2026-03-15T10:00:00Z"), today: "2026-03-21" }).promiseMissed, null);
    assert.equal(billingShared.dayLabelAt("2026-09-30"), "30 Eylül'de");
    assert.equal(billingShared.dayLabelAt("2026-04-03"), "3 Nisan'da");
    assert.equal(billingShared.computeAccess({ ...base, enrolled: false, periods: [], today: "2026-03-14" }).allowed, false);
    assert.equal(billingShared.parseMoney("1.500"), 150000);
    assert.equal(billingShared.parseMoney("1500,50"), 150050);
  });

  let billed = 0;
  test("Aidat: öğrenci no sıralı, dönem üretimi, ödeme, iptal, elle açılış, silme engeli", () => {
    const groups = listAgeGroups();
    const a = quick("Aidat Deneme", "05321112233");
    const b = quick("Aidat Kardeş", "05321112233");
    const ra = regsLib.enrollRegistration(a.id, { heightCm: 130, weightKg: 30, groupId: groups[0]!.id, enrolledAtIso: "2026-01-10T09:00:00.000Z" });
    const rb = regsLib.enrollRegistration(b.id, { heightCm: 120, weightKg: 25, groupId: groups[0]!.id, enrolledAtIso: "2026-01-10T09:00:00.000Z" });
    assert.ok(ra.studentNo && ra.studentNo >= 1001);
    assert.equal(rb.studentNo, ra.studentNo! + 1);
    assert.equal(ra.billingDay, 10);
    billed = a.id;
    settingsLib.setSetting("feeAmountKurus", 150000, null);
    const reg = () => regsLib.getRegistration(a.id)!;
    billing.ensurePeriods(reg(), "2026-01-10", 150000);
    assert.equal(billing.accessOf(reg(), "2026-01-11").state, "grace");
    billing.ensurePeriods(reg(), "2026-02-20", 150000);
    const locked = billing.accessOf(reg(), "2026-02-20");
    assert.equal(locked.state, "locked");
    assert.equal(locked.unpaidCount, 1); // hakkı yokken yeni paket açılmaz, borç birikmez
    const pay = billing.recordPayment(a.id, { periodCount: 2, method: "cash", paidOn: "2026-02-20", note: null }, null, "2026-02-20");
    assert.equal(pay.amountKurus, 300000);
    assert.match(pay.receiptNo, /^2026-\d{4}$/);
    assert.equal(billing.accessOf(reg(), "2026-02-20").state, "paid");
    billing.voidPayment(pay.id, "yanlış kayıt", 1);
    assert.equal(billing.accessOf(reg(), "2026-02-20").state, "locked");
    assert.throws(() => billing.createOverride({ registrationId: a.id, reason: "x", endsOn: "2026-04-30", userId: 1 }, "2026-02-20"), billing.BillingError);
    billing.createOverride({ registrationId: a.id, reason: "hafta sonu ödeyecek", endsOn: "2026-02-22", userId: 1 }, "2026-02-20");
    assert.equal(billing.accessOf(reg(), "2026-02-21").allowed, true);
    assert.equal(billing.accessOf(reg(), "2026-02-23").allowed, false);
    const pay2 = billing.recordPayment(a.id, { periodCount: 1, method: "eft", paidOn: "2026-02-20", note: null }, null, "2026-02-20");
    assert.notEqual(pay2.receiptNo, pay.receiptNo);
    assert.throws(() => regsLib.deleteRegistration(a.id), regsLib.RegistrationStateError);
    // Tüm ödemeleri iptal edilen (deneme) kayıt, iptal edilmiş ödemeleriyle birlikte silinir.
    const temp = regsLib.createQuickRegistration({ studentFullName: "Silinecek Deneme", parentFullName: null, phone: "05351119988", groupId: null, birthDate: "2016-01-01", adminNote: null });
    regsLib.enrollRegistration(temp.id, { heightCm: null, weightKg: null, groupId: null, enrolledAtIso: "2026-02-01T09:00:00.000Z" });
    const tempPay = billing.recordPayment(temp.id, { periodCount: 1, method: "cash", paidOn: "2026-02-20", note: null }, null, "2026-02-20");
    assert.throws(() => regsLib.deleteRegistration(temp.id), regsLib.RegistrationStateError);
    billing.voidPayment(tempPay.id, "deneme kaydı", 1);
    assert.equal(regsLib.deleteRegistration(temp.id), true);
    assert.equal(regsLib.getRegistration(temp.id), null);
    assert.equal(billing.listPayments({ registrationId: temp.id }).length, 0);
    // Silinen (iptal) makbuzun numarası yeniden verilmez; sıradaki ödeme çakışmadan yazılır.
    const after = billing.recordPayment(a.id, { periodCount: 1, method: "cash", paidOn: "2026-02-20", note: null }, null, "2026-02-20");
    assert.ok(after.receiptNo > tempPay.receiptNo, `${after.receiptNo} > ${tempPay.receiptNo}`);
  });

  test("Raporlar: seçilen aralık, beklenen aidat, hazır listeler", async () => {
    const insights = await import("../lib/insights");
    const lists = await import("../app/admin/(panel)/ogrenciler/lists");
    const m = insights.moneyOverview({ from: "2026-03-01", to: "2026-03-20" }, "2026-03-20");
    assert.ok(m.trend.every(t => t.day >= "2026-03-01" && t.day <= "2026-03-20"));
    assert.equal(m.trend.reduce((sum, t) => sum + t.amount, 0), m.collected);
    assert.equal(m.outstanding.students, m.outstanding.locked + m.outstanding.grace + m.outstanding.promise);
    const p = insights.peopleOverview({ from: "2026-03-01", to: "2026-03-20" });
    assert.ok(p.enrolled >= 1);
    const reg = { missing: [] } as unknown as Parameters<typeof lists.inStudentList>[1];
    const soon = { access: "paid" as const, paidUntil: "2026-03-25", attendanceRate: 40, attended: 5, kit: "none" as const };
    assert.equal(lists.inStudentList("yenileme", reg, soon, "2026-03-20"), true);
    assert.equal(lists.inStudentList("yenileme", reg, { ...soon, paidUntil: "2026-04-10" }, "2026-03-20"), false);
    assert.equal(lists.inStudentList("az-gelen", reg, soon, "2026-03-20"), true);
    assert.equal(lists.inStudentList("az-gelen", reg, { ...soon, attended: 2 }, "2026-03-20"), false);
    assert.equal(lists.inStudentList("forma", reg, soon, "2026-03-20"), true);
  });

  test("Sahada hızlı kayıt: veli anne/baba ise o alanlara yazılır, iletişim velisi odur", () => {
    const anne = regsLib.createQuickRegistration({ studentFullName: "Hızlı Anne", parentFullName: "Ayten Hızlı", phone: "05351112201", groupId: null, birthDate: "2017-05-05", adminNote: null, parentType: "anne" });
    assert.equal(anne.contactParentType, "anne");
    assert.equal(anne.motherFullName, "Ayten Hızlı");
    assert.equal(anne.motherPhone, "05351112201");
    assert.equal(anne.contactParentFullName, null);
    const dto = toRegistrationDto(anne);
    assert.equal(dto.contact.phone, "05351112201");
    const diger = regsLib.createQuickRegistration({ studentFullName: "Hızlı Diğer", parentFullName: "Teyze", phone: "05351112202", groupId: null, birthDate: null, adminNote: null });
    assert.equal(diger.contactParentType, "diger");
    assert.equal(diger.contactParentPhone, "05351112202");
  });

  test("Ödeme sözü: söz gününe kadar hak sürer, gelmezse işaretlenir, ödeme gelince kapanır", () => {
    const fee = settingsLib.getSettings().feeAmountKurus;
    const r = quick("Söz Deneme", "05351117779");
    regsLib.enrollRegistration(r.id, { heightCm: null, weightKg: null, groupId: null, enrolledAtIso: "2026-04-01T09:00:00.000Z" });
    const reg = () => regsLib.getRegistration(r.id)!;
    billing.ensurePeriods(reg(), "2026-04-01", fee); // ilk antrenman 4 Nisan Cumartesi (program yok: hafta sonu)
    billing.createOverride({ registrationId: r.id, reason: "  ", endsOn: "2026-04-10", userId: 1 }, "2026-04-01");
    const on = billing.accessOf(reg(), "2026-04-08");
    assert.equal(on.state, "override");
    assert.equal(on.allowed, true);
    assert.equal(on.override?.reason, billingShared.PROMISE_DEFAULT);
    assert.ok(billing.billingCounts("2026-04-10").promiseToday >= 1);
    const off = billing.accessOf(reg(), "2026-04-11");
    assert.equal(off.state, "locked");
    assert.equal(off.promiseMissed, "2026-04-10");
    assert.throws(() => billing.createOverride({ registrationId: r.id, reason: null, endsOn: "2026-06-01", userId: 1 }, "2026-04-11"), billing.BillingError);
    billing.recordPayment(r.id, { periodCount: 1, method: "cash", paidOn: "2026-04-11", note: null }, null, "2026-04-11");
    assert.ok(billing.billingDetail(r.id).overrides[0]?.fulfilledAt);
    const paid = billing.accessOf(reg(), "2026-04-11");
    assert.equal(paid.state, "paid");
    assert.equal(paid.promiseMissed, undefined);
  });

  test("Antrenman hakkı: aidat = grubun 8 antrenmanı, yenileme tarihi, iptal hak yemez, peşin paket, tolerans", async () => {
    const { createAgeGroup } = await import("../lib/age-groups-db");
    const g = createAgeGroup({ name: "Hak Testi", minBirthYear: 1980, maxBirthYear: 1980 });
    // Program: Cumartesi ve Pazar
    program.saveSchedule(null, { groupId: g.id, weekday: 6, startTime: "10:00", endTime: "11:00", venueId: null, validFrom: null, validTo: null });
    program.saveSchedule(null, { groupId: g.id, weekday: 7, startTime: "10:00", endTime: "11:00", venueId: null, validFrom: null, validTo: null });
    program.ensureSessions("2026-03-01", "2026-05-31");
    const fee = settingsLib.getSettings().feeAmountKurus;
    const graceDays = settingsLib.getSettings().graceDays;
    const r = quick("Hak Deneme", "05351117777");
    regsLib.enrollRegistration(r.id, { heightCm: null, weightKg: null, groupId: g.id, enrolledAtIso: "2026-03-04T09:00:00.000Z" }); // Çarşamba
    const reg = () => regsLib.getRegistration(r.id)!;
    billing.ensurePeriods(reg(), "2026-03-04", fee);
    // Aidatı gelmeden: ilk antrenman (Cumartesi) beklenen gün
    let a = billing.accessOf(reg(), "2026-03-04");
    assert.equal(a.state, "grace");
    assert.equal(a.dueDate, "2026-03-07");
    // Aidat: 7, 8, 14, 15, 21, 22, 28, 29 Mart → yenileme 4 Nisan, 8 antrenman kaldı
    billing.recordPayment(r.id, { periodCount: 1, method: "cash", paidOn: "2026-03-04", note: null }, null, "2026-03-04");
    a = billing.accessOf(reg(), "2026-03-04");
    assert.equal(a.state, "paid");
    assert.equal(a.paidUntil, "2026-04-04");
    assert.equal(a.sessionsLeft, 8);
    assert.equal(billing.accessOf(reg(), "2026-03-16").sessionsLeft, 4); // 7, 8, 14, 15 geçti
    // 14 Mart iptal: hak yemez, yenileme bir antrenman kayar
    const s14 = dbMod.getDb().select().from(schema.trainingSessions).where(orm.and(orm.eq(schema.trainingSessions.groupId, g.id), orm.eq(schema.trainingSessions.date, "2026-03-14"))).get()!;
    program.cancelSession(s14.id, "yağmur");
    billing.ensurePeriods(reg(), "2026-03-04", fee);
    assert.equal(billing.accessOf(reg(), "2026-03-04").paidUntil, "2026-04-05");
    // Peşin 2 aidat daha (16 antrenman): 5 Nisan–2 Mayıs, 3–30 Mayıs → yenileme 31 Mayıs
    billing.recordPayment(r.id, { periodCount: 2, method: "cash", paidOn: "2026-03-04", note: null }, null, "2026-03-04");
    assert.equal(billing.accessOf(reg(), "2026-03-04").paidUntil, "2026-05-31");
    // Yenileme günü gelince aidat bekleniyor, tolerans bitince hakkı biter
    billing.ensurePeriods(reg(), "2026-05-31", fee);
    a = billing.accessOf(reg(), "2026-05-31");
    assert.equal(a.state, "grace");
    assert.equal(a.dueDate, "2026-05-31");
    assert.equal(billing.accessOf(reg(), dates.addDaysTo("2026-05-31", graceDays)).state, "locked");
    // Bir ay gelmedi: yeni paket birikmez, tek bekleyen paket
    billing.ensurePeriods(reg(), "2026-07-01", fee);
    assert.equal(billing.accessOf(reg(), "2026-07-01").unpaidCount, 1);
    // Önizleme veritabanına iz bırakmaz; ara verene "ödeme tarihinden" önerilir
    const periodCount = billing.billingDetail(r.id).periods.length;
    const plans = billing.paymentPlans(r.id, 1, "2026-07-01", "2026-07-01");
    assert.equal(plans.suggested, "restart");
    assert.deepEqual(plans.chain, { from: "2026-05-31", until: "2026-06-28" });
    assert.deepEqual(plans.restart, { from: "2026-07-04", until: "2026-08-01" });
    assert.equal(billing.billingDetail(r.id).periods.length, periodCount);
    // Ödeme tarihinden başlat: eski paket kullanılmadı sayılır, hak 4 Temmuz'dan
    billing.recordPayment(r.id, { periodCount: 1, method: "cash", paidOn: "2026-07-01", note: null, startFrom: "2026-07-01" }, null, "2026-07-01");
    a = billing.accessOf(reg(), "2026-07-01");
    assert.equal(a.state, "paid");
    assert.equal(a.paidUntil, "2026-08-01");
    assert.equal(billing.billingDetail(r.id).periods.find((p) => p.startDate === "2026-05-31")?.status, "void");
    // Hakkı sürerken yeniden başlatılamaz
    assert.throws(() => billing.recordPayment(r.id, { periodCount: 1, method: "cash", paidOn: "2026-07-10", note: null, startFrom: "2026-07-10" }, null, "2026-07-10"), billing.BillingError);

    // Geriye dönük ilk ödeme: sisteme 18 Mart'ta girilen öğrenci 7 Mart'ta ödemiş, o günden beri geliyor
    const r2 = quick("Hak Geriye", "05351117778");
    regsLib.enrollRegistration(r2.id, { heightCm: null, weightKg: null, groupId: g.id, enrolledAtIso: "2026-03-18T09:00:00.000Z" });
    billing.ensurePeriods(regsLib.getRegistration(r2.id)!, "2026-03-18", fee);
    const back = billing.paymentPlans(r2.id, 1, "2026-03-07", "2026-03-18");
    assert.equal(back.hadPaid, false);
    assert.equal(back.chain?.from, "2026-03-21");
    assert.deepEqual(back.restart, { from: "2026-03-07", until: "2026-04-05" }); // 14 Mart iptal: hak yemez
    assert.equal(back.suggested, "restart");
    billing.recordPayment(r2.id, { periodCount: 1, method: "eft", paidOn: "2026-03-07", note: null, startFrom: "2026-03-07" }, null, "2026-03-18");
    assert.equal(billing.accessOf(regsLib.getRegistration(r2.id)!, "2026-03-18").paidUntil, "2026-04-05");
    assert.equal(billing.billingDetail(r2.id).periods.length, 1);
  });

  test("Veli ödeme bildirimi: tek bekleyen bildirim, onayla ödeme oluşur, ret kaydedilir", () => {
    const c = billing.createClaim({ registrationId: billed, userId: 1, method: "eft", fileId: null, note: null });
    assert.throws(() => billing.createClaim({ registrationId: billed, userId: 1, method: "eft", fileId: null, note: null }), billing.BillingError);
    const { payment } = billing.approveClaim(c.id, 1, 1, "2026-02-20");
    assert.equal(payment.claimId, c.id);
    assert.throws(() => billing.approveClaim(c.id, 1, 1, "2026-02-20"), billing.BillingError);
    const c2 = billing.createClaim({ registrationId: billed, userId: 1, method: "cash", fileId: null, note: null });
    assert.equal(billing.rejectClaim(c2.id, "ödeme görünmüyor", 1).status, "rejected");
  });

  test("Yoklama ve kart: kapsam dışı antrenör reddedilir, kilitli öğrenci kartla 'geldi' yazılamaz (elle yazılır), iptal kart çalışmaz", () => {
    const db = dbMod.getDb();
    const groups = listAgeGroups();
    const today = billing.todayKey();
    const s = program.saveSchedule(null, { groupId: groups[0]!.id, weekday: program.weekdayOf(today), startTime: "00:00", endTime: "23:59", venueId: null, validFrom: null, validTo: null });
    program.ensureSessions(today, today);
    const session = program.sessionsOn(today, [groups[0]!.id]).find((x) => x.scheduleId === s.id)!;
    assert.ok(session);
    const coach = db.insert(schema.users).values({ role: "coach", username: "smoke-hoca", status: "active" }).returning().get();
    const coachUser = { id: coach.id, role: "coach", portal: "coach" as const, permissions: ["yoklama.al"] as never[], username: "smoke-hoca", fullName: null, sessionId: 0 };
    const card = cardsLib.ensureCard(billed, null);
    assert.equal(scanLib.scan(card.code, coachUser as never).outcome, "not_allowed");
    program.setGroupCoaches(groups[0]!.id, [coach.id]);
    // Öğrenciyi bugün için kilitli yap: bugünden 10 gün önce açılmış ödenmemiş dönem.
    db.insert(schema.feePeriods).values({ registrationId: billed, startDate: dates.addDaysTo(today, -10), endDate: dates.addDaysTo(today, 20), dueDate: dates.addDaysTo(today, -10), amountKurus: 150000 }).run();
    assert.equal(scanLib.scan(card.code, coachUser as never, { sessionId: session.id }).outcome, "locked");
    assert.throws(() => att.markAttendance({ sessionId: session.id, registrationId: billed, status: "present", source: "qr", userId: coach.id }), att.AttendanceError);
    // Elle yoklama: sahaya gelen her çocuk "geldi" yazılır, aidat ayrıca görünür
    assert.equal(att.markAttendance({ sessionId: session.id, registrationId: billed, status: "present", source: "manual", userId: coach.id }).status, "present");
    att.markAttendance({ sessionId: session.id, registrationId: billed, status: "absent", source: "manual", userId: coach.id });

    // Yoklama tablosu: bugünün sütunu, öğrencinin hücresi bu antrenman, yoklaması ve aidat durumu görünür
    const grid = gridLib.loadAttendanceGrid({ scope: null, today, perms: { billing: true, contact: true } });
    const day = grid.days.find((d) => d.date === today && d.sessions[groups[0]!.id]?.id === session.id);
    assert.ok(day, "bugünün sütunu");
    const row = grid.students.find((r) => r.id === billed);
    assert.ok(row);
    assert.equal(row!.cells[day!.key], session.id);
    assert.equal(grid.marks[`${session.id}:${billed}`], "absent");
    assert.equal(row!.billing?.status, "late");
    assert.ok(grid.to >= `${today.slice(0, 4)}-06-30`, "dönem sonuna kadar");
    const coachGrid = gridLib.loadAttendanceGrid({ scope: [groups[0]!.id], today, perms: { billing: false, contact: false } });
    assert.ok(coachGrid.students.every((r) => r.groupId === groups[0]!.id && r.billing === null && r.phone === null), "antrenör yalnız kendi grubunu, aidatsız ve telefonsuz görür");
    // Toplu: işaretlenmemişler geldi; işaretli olan değişmez
    const filled = att.markRest(session.id, "present", null);
    assert.equal(att.sessionRoster(session.id).rows.find((r) => r.id === billed)?.status, "absent");
    assert.equal(att.sessionRoster(session.id).rows.filter((r) => r.status === "present").length, filled);
    const fresh = cardsLib.issueCard(billed, null, "kayıp");
    assert.equal(scanLib.scan(card.code, coachUser as never).outcome, "revoked");
    assert.notEqual(fresh.code, card.code);
    assert.deepEqual(scanLib.parseScanInput(`https://x.com/k/${fresh.code}`), { code: fresh.code });
    assert.deepEqual(scanLib.parseScanInput("1001"), { studentNo: 1001 });
    assert.equal(scanLib.parseScanInput("<script>"), null);
  });

  test("Veli hesabı: kardeşler aynı telefonla tek hesapta, davet bağlantısı tek kullanımlık, numarayla bulunur", async () => {
    const all = regsLib.listRegistrations().filter((r) => r.status === "enrolled" && r.contactParentPhone === "05321112233");
    assert.equal(all.length, 2);
    const g1 = guardians.ensureGuardianForStudent(all[0]!.id);
    const g2 = guardians.ensureGuardianForStudent(all[1]!.id);
    assert.equal(g1.user.id, g2.user.id);
    assert.equal(guardians.guardianChildren(g1.user.id).length, 2);
    const raw = guardians.createAuthToken(g1.user.id, "invite", null);
    await assert.rejects(guardians.redeemAuthToken(raw, "kısa"));
    await guardians.redeemAuthToken(raw, "uzunsifre1");
    await assert.rejects(guardians.redeemAuthToken(raw, "uzunsifre2"));
    assert.equal(portalLogin.findPortalUser(String(all[0]!.studentNo))?.id, g1.user.id);
    assert.equal(guardians.guardianCanSee(g1.user.id, all[0]!.id), true);
    const other = quick("Başka Çocuk", "05329998877");
    assert.equal(guardians.guardianCanSee(g1.user.id, other.id), false);
    assert.equal(guardians.peekAuthToken("x".repeat(30)), null);
  });

  test("Metinler: yeni sürüm yayınlanınca zorunlu onay yeniden istenir", () => {
    const reg = billed;
    const before = legal.missingRequiredConsents([reg]).length;
    assert.ok(before > 0);
    for (const m of legal.missingRequiredConsents([reg])) legal.recordConsent({ userId: null, registrationId: reg, versionId: m.version.id, accepted: true, method: "admin_attest" });
    assert.equal(legal.missingRequiredConsents([reg]).length, 0);
    legal.saveDraft("okul-kurallari", "Yeni kural metni", null);
    legal.publishDraft("okul-kurallari");
    assert.deepEqual(legal.missingRequiredConsents([reg]).map((m) => m.text.key), ["okul-kurallari"]);
  });

  test("Dosya: içerik türü kontrolü, EXIF temizlenir, SVG/sahte içerik reddedilir", async () => {
    const sharp = (await import("sharp")).default;
    const jpg = await sharp({ create: { width: 2000, height: 1500, channels: 3, background: "#123456" } }).jpeg().withMetadata({ exif: { IFD0: { Artist: "x" } } }).toBuffer();
    const f = await filesLib.saveUpload(jpg, "photo", { registrationId: billed, userId: null });
    const meta = await sharp(filesLib.readFileData(f)!).metadata();
    assert.equal(Boolean(meta.exif), false);
    assert.ok((f.width ?? 0) <= 900);
    await assert.rejects(filesLib.saveUpload(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script/></svg>"), "photo", { registrationId: null, userId: null }), filesLib.FileRejectedError);
    await assert.rejects(filesLib.saveUpload(Buffer.from("%PDF-1.4 sahte"), "photo", { registrationId: null, userId: null }), filesLib.FileRejectedError);
    filesLib.deleteFile(f.id);
  });

  test("Takvim aboneliği: imzasız anahtar reddedilir, iptal CANCELLED olarak yazılır", () => {
    const key = cal.calendarKey(1);
    assert.equal(cal.parseCalendarKey(key), 1);
    assert.equal(cal.parseCalendarKey(key.replace(/.$/, key.endsWith("A") ? "B" : "A")), null);
    assert.equal(cal.parseCalendarKey("2-" + key.split("-").slice(1).join("-")), null);
    const today = billing.todayKey();
    const s = program.sessionsOn(today, null)[0]!;
    program.cancelSession(s.id, "yağmur");
    const ics = cal.buildIcs("1. Grup", program.listSessions({ from: today, to: today, includeCancelled: true }));
    assert.match(ics, /STATUS:CANCELLED/);
    assert.match(ics, /BEGIN:VTIMEZONE/);
  });

  test("Yönlendirme: veli/antrenör girişi sonrası yalnız kendi paneline döner", () => {
    assert.equal(cookieLib.safePortalNext("/veli/takvim", "/veli"), "/veli/takvim");
    assert.equal(cookieLib.safePortalNext("/admin", "/veli"), "/veli");
    assert.equal(cookieLib.safePortalNext("//evil.com", "/veli"), "/veli");
    assert.equal(cookieLib.safePortalNext("https://evil.com", "/antrenor"), "/antrenor");
    void orm;
  });

  test("İndirim: 8 antrenmanlık tutar indirime göre, ödenmemiş dönemler güncellenir, ada göre listelenir", () => {
    const groups = listAgeGroups();
    assert.equal(billingShared.discountedFee(250000, 20), 200000);
    assert.equal(billingShared.discountedFee(250000, 0), 250000);
    const r = quick("İndirim Deneme", "05330001122");
    regsLib.enrollRegistration(r.id, { heightCm: null, weightKg: null, groupId: groups[0]!.id, enrolledAtIso: "2026-01-05T09:00:00.000Z" });
    settingsLib.setSetting("feeAmountKurus", 250000, null);
    billing.setDiscount(r.id, "Kardeş indirimi", 20);
    billing.ensurePeriods(regsLib.getRegistration(r.id)!, "2026-01-05", 250000);
    const p = billing.recordPayment(r.id, { periodCount: 2, method: "cash", paidOn: "2026-01-05", note: null }, null, "2026-01-05");
    assert.equal(p.amountKurus, 400000);
    billing.setDiscount(r.id, null, null);
    const open = dbMod.getDb().select().from(schema.feePeriods).where(orm.eq(schema.feePeriods.registrationId, r.id)).all();
    assert.ok(open.every((x) => x.status === "paid" && x.amountKurus === 200000), "ödenmiş dönem değişmez");
    billing.setDiscount(r.id, "kardeş indirimi", 20);
    assert.throws(() => billing.setDiscount(r.id, "x", 150), billing.BillingError);
    const list = billing.listDiscounts();
    assert.equal(list.filter((d) => d.name.toLocaleLowerCase("tr-TR") === "kardeş indirimi").length, 1);
  });

  test("Malzeme: sipariş, ödeme ve teslim durumu", async () => {
    const eq = await import("../lib/equipment");
    const item = eq.listItems().find((i) => /forma/i.test(i.name))!;
    assert.equal(item.priceKurus, 220000);
    const r = regsLib.listRegistrations()[0]!;
    const o = eq.createOrder(r.id, { itemId: item.id, size: "10-11", priceKurus: item.priceKurus, paid: false, delivery: "to_order", note: null }, null, "2026-09-23");
    assert.equal(o.paidOn, null);
    const u = eq.updateOrder(o.id, { itemId: item.id, size: "10-11", priceKurus: item.priceKurus, paid: true, delivery: "delivered", note: null }, "2026-09-25");
    assert.equal(u.paidOn, "2026-09-25");
    assert.equal(u.deliveredOn, "2026-09-25");
    assert.equal(eq.listOrders().filter((x) => x.id === o.id).length, 1);
  });

  test("Forma bedenleri: eski yazı ayrılır, tozluk formadan ayrı izlenir, beden tablosu ve toplu sipariş", async () => {
    const eq = await import("../lib/equipment");
    const kit = await import("../lib/equipment-shared");
    // Canlıda tek alana yazılmış bedenlerden örnekler
    const cases: [string, string | null, string | null, string | null][] = [
      ["9-10 Yaş 34-36", "9-10", "34-36", null],
      ["M Beden 40-42", "M", "40-42", null],
      ["36-38, 11-12 yaş", "11-12", "36-38", null],
      ["13-14 34-36", "13-14", "34-36", null],
      ["13-14 yaş 38-40(K)", "13-14", "38-40", "(K)"],
      ["34-36 Kaleci forması", null, "34-36", "Kaleci forması"],
      ["27-28 çorap", null, "27-28", null],
      ["belirlencek", null, null, null],
      ["M 36-38", "M", "36-38", null],
      ["", null, null, null],
    ];
    for (const [raw, shirt, socks, rest] of cases) assert.deepEqual(kit.parseKitSizes(raw), { shirt, socks, rest }, raw);
    assert.equal(kit.normalizeShirt("9-10 yaş"), "9-10");
    assert.equal(kit.normalizeShirt("m"), "M");
    assert.equal(kit.normalizeShirt("belirlenecek"), null);
    assert.equal(kit.normalizeSock("34 - 36"), "34-36");
    assert.equal(kit.shirtLabel("9-10"), "9-10 yaş");
    assert.deepEqual(["M", null, "9-10", "S", "5-6", "12-13"].sort(kit.compareSizes), ["5-6", "9-10", "12-13", "S", "M", null]);

    const forma = eq.listItems().find((i) => kit.hasSocks(i.name))!;
    const esofman = eq.listItems().find((i) => !kit.isFormaItem(i.name))!;
    assert.ok(forma && esofman);
    const [r1, r2] = regsLib.listRegistrations();
    // Forma elden verildiyse tozluk ayrıca "verildi" denmedikçe verilmemiş sayılır; sipariş edilecekse birlikte sipariş edilir
    const a = eq.createOrder(r1!.id, { itemId: forma.id, size: "9-10 yaş", sockSize: "34-36", priceKurus: forma.priceKurus, paid: true, delivery: "delivered", note: null }, null, "2026-09-28");
    assert.equal(a.size, "9-10");
    assert.equal(a.sockSize, "34-36");
    assert.equal(a.sockDelivery, "waiting");
    const b = eq.createOrder(r2!.id, { itemId: forma.id, size: "M", priceKurus: forma.priceKurus, paid: false, delivery: "to_order", note: null }, null, "2026-09-28");
    assert.equal(b.sockDelivery, "to_order");
    const e = eq.createOrder(r2!.id, { itemId: esofman.id, size: "M", sockSize: "34-36", priceKurus: esofman.priceKurus, paid: false, delivery: "to_order", note: null }, null);
    assert.equal(e.sockDelivery, null, "eşofmanda tozluk yok");
    assert.equal(e.sockSize, null);
    // Tozluk teslimi formadan bağımsız; güncellemede verilmezse korunur
    const a2 = eq.updateOrder(a.id, { itemId: forma.id, size: "9-10", priceKurus: forma.priceKurus, paid: true, delivery: "delivered", note: null, sockDelivery: "delivered" }, "2026-09-29");
    assert.equal(a2.sockDelivery, "delivered");
    assert.equal(a2.sockDeliveredOn, "2026-09-29");
    const a3 = eq.updateOrder(a.id, { itemId: forma.id, size: "9-10", priceKurus: forma.priceKurus, paid: true, delivery: "delivered", note: "not" }, "2026-09-30");
    assert.equal(a3.sockDelivery, "delivered");
    assert.equal(a3.sockDeliveredOn, "2026-09-29");
    assert.equal(a3.sockSize, "34-36");
    // Beden tablosu: forma-şort ve tozluk ayrı; eksik numara sayılır
    const mine = eq.listOrders().filter((o) => [a.id, b.id, e.id].includes(o.id));
    const t = kit.kitTables(mine, "to_order");
    assert.deepEqual(
      t.map((x) => `${x.title}:${x.total}`),
      ["Forma ve şort:1", "Tozluk:1", `${esofman.name}:1`],
    );
    assert.equal(t[1]!.missing, 1, "tozluk numarası girilmemiş");
    assert.equal(kit.sizeMissing(mine.find((o) => o.id === b.id)!), true);
    // Toplu "sipariş verildi": yalnız sipariş verilecek / bekleyenler değişir, forma etkilenmez
    const changed = eq.markOrdered([a.id, b.id], "socks");
    assert.deepEqual(
      changed.map((o) => o.id),
      [b.id],
    );
    const b2 = eq.listOrders().find((o) => o.id === b.id)!;
    assert.equal(b2.sockDelivery, "ordered");
    assert.equal(b2.delivery, "to_order");
    // Dışa aktar: forma sütunları hesaplanır; aynı süzgeç ve sütunlarla PDF üretilir
    const { extraRecords } = await import("../lib/export/extras");
    const x = extraRecords([regsLib.getRegistration(r1!.id)!], { billing: true }).get(r1!.id)!;
    assert.equal(x.kitShirt, "9-10 yaş");
    assert.equal(x.kitState, "Teslim edildi");
    assert.equal(x.kitPaid, "Ödendi");
    assert.equal(x.kitSocks, "34-36");
    assert.equal(x.kitSocksState, "Teslim edildi");
    const { prepareExport } = await import("../lib/export/request");
    const { listPdf } = await import("../lib/pdf");
    const { FORMA_LIST_COLUMNS } = await import("../lib/export/columns");
    const data = prepareExport(new URLSearchParams({ status: "enrolled", cols: FORMA_LIST_COLUMNS.join(","), split: "grup" }), true);
    assert.deepEqual(
      data.columns.map((c) => c.key),
      FORMA_LIST_COLUMNS,
    );
    assert.equal((await listPdf(data, "Forma listesi")).subarray(0, 4).toString(), "%PDF");
    assert.equal(prepareExport(new URLSearchParams({ cols: "kitShirt,studentFullName" }), false).columns.map((c) => c.key).join(), "studentFullName", "aidat izni yoksa forma sütunu yok");
    for (const id of [a.id, b.id, e.id]) eq.deleteOrder(id);
  });

  test("Kasa defteri: aidat ve forma gün gün, nakit/havale ayrı, iptal toplama girmez; ödeme ve forma parası düzeltilir", async () => {
    const eq = await import("../lib/equipment");
    const { cashbook } = await import("../lib/cashbook");
    const { createAgeGroup } = await import("../lib/age-groups-db");
    const db = dbMod.getDb();
    const cashier = db.insert(schema.users).values({ role: "admin", username: "smoke-kasa", fullName: "Kasa Görevlisi", status: "active" }).returning().get();
    const g = createAgeGroup({ name: "Kasa Testi", minBirthYear: 1981, maxBirthYear: 1981 });
    program.saveSchedule(null, { groupId: g.id, weekday: 6, startTime: "10:00", endTime: "11:00", venueId: null, validFrom: null, validTo: null });
    program.saveSchedule(null, { groupId: g.id, weekday: 7, startTime: "10:00", endTime: "11:00", venueId: null, validFrom: null, validTo: null });
    program.ensureSessions("2025-11-01", "2026-01-31");
    const fee = settingsLib.getSettings().feeAmountKurus;
    const r = quick("Kasa Deneme", "05351119999");
    regsLib.enrollRegistration(r.id, { heightCm: null, weightKg: null, groupId: g.id, enrolledAtIso: "2025-11-03T09:00:00.000Z" });
    billing.ensurePeriods(regsLib.getRegistration(r.id)!, "2025-11-03", fee);
    const p1 = billing.recordPayment(r.id, { periodCount: 1, method: "cash", paidOn: "2025-11-03", note: null }, cashier.id, "2025-11-03");
    const p2 = billing.recordPayment(r.id, { periodCount: 1, method: "eft", paidOn: "2025-11-05", note: null }, null, "2025-11-05");
    const p3 = billing.recordPayment(r.id, { periodCount: 1, method: "cash", paidOn: "2025-11-05", note: null }, null, "2025-11-05");
    billing.voidPayment(p3.id, "yanlış giriş", cashier.id);
    const item = eq.listItems().find((i) => /forma/i.test(i.name))!;
    const o = eq.createOrder(r.id, { itemId: item.id, size: null, priceKurus: item.priceKurus, paid: true, paidOn: "2025-11-05", paidMethod: "eft", delivery: "delivered", note: null }, cashier.id, "2025-11-06");
    assert.equal(o.paidOn, "2025-11-05");
    assert.equal(o.paidMethod, "eft");
    assert.equal(o.paidBy, cashier.id);
    assert.equal(o.deliveredOn, "2025-11-06");
    assert.throws(() => eq.createOrder(r.id, { itemId: item.id, size: null, priceKurus: 1, paid: true, paidOn: "2999-01-01", delivery: "waiting", note: null }, null), eq.EquipmentError);

    let book = cashbook("2025-11-01", "2025-11-30");
    assert.equal(book.total, p1.amountKurus + p2.amountKurus + item.priceKurus, "iptal edilen ödeme toplama girmez");
    assert.equal(book.cash, p1.amountKurus);
    assert.equal(book.eft, p2.amountKurus + item.priceKurus);
    assert.equal(book.forma, item.priceKurus);
    assert.equal(book.voidedCount, 1);
    assert.deepEqual(
      book.days.map((d) => [d.day, d.count]),
      [
        ["2025-11-05", 2],
        ["2025-11-03", 1],
      ],
    );
    assert.equal(book.days[1]!.entries[0]!.takenBy, "Kasa Görevlisi");

    // Düzeltme: şekil ve gün değişir; tutar, makbuz no ve hak paketleri aynı kalır
    const packs = billing.periodsForPayment(p2.id).map((p) => p.id);
    const { after } = billing.updatePayment(p2.id, { method: "cash", paidOn: "2025-11-04", note: "elden verdi" }, "2025-11-06");
    assert.equal(after.amountKurus, p2.amountKurus);
    assert.equal(after.receiptNo, p2.receiptNo);
    assert.deepEqual(billing.periodsForPayment(p2.id).map((p) => p.id), packs);
    assert.throws(() => billing.updatePayment(p3.id, { method: "eft", paidOn: "2025-11-05", note: null }, "2025-11-06"), billing.BillingError, "iptal edilmiş ödeme düzeltilemez");
    assert.throws(() => billing.updatePayment(p1.id, { method: "cash", paidOn: "2025-11-10", note: null }, "2025-11-06"), billing.BillingError, "ileri tarih olmaz");
    eq.updateKitPayment(o.id, { method: "cash", paidOn: "2025-11-03" });
    book = cashbook("2025-11-01", "2025-11-30");
    assert.equal(book.eft, 0);
    assert.equal(book.cash, book.total);
    assert.deepEqual(
      book.days.filter((d) => d.count).map((d) => d.day),
      ["2025-11-04", "2025-11-03"],
    );

    // Forma kaydı yeniden kaydedilince parayı alan ve gün korunur; "ödenmedi"ye dönünce silinir
    const kept = eq.updateOrder(o.id, { itemId: item.id, size: "12", priceKurus: item.priceKurus, paid: true, delivery: "delivered", note: null }, "2025-11-20", null);
    assert.equal(kept.paidOn, "2025-11-03");
    assert.equal(kept.paidBy, cashier.id);
    const cleared = eq.updateOrder(o.id, { itemId: item.id, size: "12", priceKurus: item.priceKurus, paid: false, delivery: "delivered", note: null }, "2025-11-20", null);
    assert.equal(cleared.paidOn, null);
    assert.equal(cleared.paidMethod, null);
    assert.equal(cleared.paidBy, null);
  });

  test("Ödeme dili: gecikti, ödeme günü geldi, ilk aidat, söz, yaklaşıyor, ödedi", () => {
    const t = "2026-09-25";
    const ps = (a: { state: "locked" | "grace" | "override" | "paid" | "unbilled"; firstPack?: boolean; paidUntil?: string | null }) => billingShared.payStatus({ firstPack: false, paidUntil: null, ...a }, t);
    assert.equal(ps({ state: "locked" }), "late");
    assert.equal(ps({ state: "grace" }), "due");
    assert.equal(ps({ state: "grace", firstPack: true }), "first");
    assert.equal(ps({ state: "override" }), "promise");
    assert.equal(ps({ state: "paid", paidUntil: "2026-10-02" }), "soon");
    assert.equal(ps({ state: "paid", paidUntil: "2026-10-03" }), "paid");
    assert.equal(billingShared.PAY_STATUS.paid.label, "Ödedi");
  });

  test("Öğrenci sıralama: ad, numara, yaş, son kayıt, ödeme ve devam", async () => {
    const { studentComparator } = await import("../lib/student-sort");
    const rows = [
      { id: 1, studentFullName: "Can", studentNo: 1003, birthDate: "2015-01-01", enrolledAt: "2026-09-01T10:00:00Z" },
      { id: 2, studentFullName: "Ali", studentNo: 1001, birthDate: "2018-05-05", enrolledAt: "2026-09-20T10:00:00Z" },
      { id: 3, studentFullName: "Berk", studentNo: null, birthDate: null, enrolledAt: null },
    ];
    const names = (sort: Parameters<typeof studentComparator>[0], ctx = {}) => [...rows].sort(studentComparator(sort, ctx)).map((r) => r.studentFullName).join(",");
    assert.equal(names("ad"), "Ali,Berk,Can");
    assert.equal(names("no"), "Ali,Can,Berk");
    assert.equal(names("yas"), "Ali,Can,Berk", "küçük önce, doğum tarihi olmayan sonda");
    assert.equal(names("yeni"), "Ali,Can,Berk");
    assert.equal(names("odeme", { payRank: (r: { id: number }) => ({ 1: 0, 2: 5, 3: 1 })[r.id] ?? 9 }), "Can,Berk,Ali");
    assert.equal(names("devam", { attendanceRate: (r: { id: number }) => ({ 1: 90, 2: 40, 3: null })[r.id] ?? null }), "Ali,Can,Berk");
  });

  test("Forma zaten var: ücret, ödeme ve sipariş yok; forması eksik sayılmaz; satışa çevrilebilir", async () => {
    const eq = await import("../lib/equipment");
    const { cashEntries } = await import("../lib/cashbook");
    const { studentInsights } = await import("../lib/insights");
    const groups = listAgeGroups();
    const r = quick("Forma Varmış", "05351116666");
    regsLib.enrollRegistration(r.id, { heightCm: null, weightKg: null, groupId: groups[0]!.id, enrolledAtIso: "2026-09-20T09:00:00.000Z" });
    const item = eq.listItems().find((i) => /forma/i.test(i.name))!;
    const o = eq.createOrder(r.id, { itemId: item.id, size: "12", priceKurus: item.priceKurus, paid: false, owned: true, delivery: "to_order", note: null }, 1, "2026-09-20");
    assert.equal(o.owned, true);
    assert.equal(o.priceKurus, 0);
    assert.equal(o.paid, true);
    assert.equal(o.delivery, "delivered");
    assert.equal(o.paidOn, null);
    assert.equal(o.paidBy, null);
    assert.equal(studentInsights([r.id], "2026-09-25", { billing: true })[r.id]?.kit, "ok", "forması var sayılır");
    assert.equal(cashEntries("2026-09-01", "2026-09-30").some((e) => e.kind === "forma" && e.id === o.id), false, "kasaya girmez");
    assert.throws(() => eq.updateKitPayment(o.id, { method: "cash", paidOn: "2026-09-20" }), eq.EquipmentError);
    // Sonradan okuldan aldı: satışa döner, ödeme bilgisi yeni yazılır
    const sold = eq.updateOrder(o.id, { itemId: item.id, size: "12", priceKurus: item.priceKurus, paid: true, paidOn: "2026-09-22", owned: false, delivery: "delivered", note: null }, "2026-09-22", 1);
    assert.equal(sold.owned, false);
    assert.equal(sold.priceKurus, item.priceKurus);
    assert.equal(sold.paidOn, "2026-09-22");
    assert.equal(sold.paidBy, 1);
  });

  test("Çıktılar: haftalık program, yoklama kağıdı geçmişe seans eklemez, PDF ve Excel sütunları", async () => {
    const sheets = await import("../lib/program-sheets");
    const pdf = await import("../lib/pdf");
    const { extraRecords, groupAgeRange } = await import("../lib/export/extras");
    const t = "2026-09-26";
    assert.equal(groupAgeRange(2015, 2016, t), "9–11");
    assert.equal(groupAgeRange(2019, 2019, t), "6–7");
    const prog = sheets.weeklyProgram(t);
    assert.ok(prog.rows.some((r) => r.slots.length > 0), "programı olan grup var");
    const db = dbMod.getDb();
    const count = () => db.select().from(schema.trainingSessions).all().length;
    const before = count();
    const past = sheets.attendanceSheets({ from: "2020-01-01", to: "2020-01-31" }, null, true, t);
    assert.equal(count(), before, "geçmiş ay için seans üretilmez (hak hesabı bozulmasın)");
    assert.ok(past.every((sh) => sh.sessions.length === 0));
    const isPdf = (b: Buffer) => b.subarray(0, 4).toString("ascii") === "%PDF";
    assert.ok(isPdf(await pdf.programPdf(t)));
    assert.ok(isPdf(await pdf.rosterPdf(regsLib.listRegistrations(), { groupIds: null, preset: "tam", billing: true, today: t })));
    assert.ok(isPdf(await pdf.attendanceSheetPdf({ from: "2026-03-01", to: "2026-03-31" }, null, true, t)));
    assert.equal((await sheets.programXlsx(t)).subarray(0, 2).toString("ascii"), "PK");
    const paid = regsLib.listRegistrations().find((r) => r.status === "enrolled" && r.studentFullName === "Hak Deneme")!;
    const x = extraRecords([paid], { billing: true, today: "2026-07-01" }).get(paid.id)!;
    assert.ok(Object.values(billingShared.PAY_STATUS).some((st) => st.label === x.payStatus), "ödeme durumu ödeme dilinde");
    assert.match(String(x.nextPayment), /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Number(x.paidTotal) > 0, "toplam ödenen dolu");
    assert.ok(String(x.schedule).includes("Cumartesi"));
    assert.equal(extraRecords([paid], { billing: false, today: t }).get(paid.id)!.payStatus, undefined, "aidat izni yoksa ödeme bilgisi yok");
  });

  test("Yoklama listesi (Excel): okul şablonu, her grup ayrı sayfa, en az 21 satır, aidat / forma boş", async () => {
    const { attendanceListXlsx, LIST_ROWS } = await import("../lib/export/attendance-list");
    const groups = listAgeGroups();
    const g = groups[0]!;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await attendanceListXlsx([g.id], "2026-09-26")) as unknown as ArrayBuffer);
    assert.equal(wb.worksheets.length, 1);
    const ws = wb.worksheets[0]!;
    assert.equal(ws.name, g.name.slice(0, 31));
    const head = ws.getRow(1);
    assert.deepEqual(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => head.getCell(i).value),
      ["  ", "Öğrenci No", "Öğrenci Ad Soyad", "Doğum Tarihi", "Yaş", "İletişim Velisi Ad Soyad", "İletişim Velisi Telefon", "Grup", "Kaleci Mi", "Yoklama", "Aidat", "Forma"],
    );
    assert.equal(head.height, 32.1);
    assert.deepEqual(
      [1, 2, 3, 11, 12].map((i) => ws.getColumn(i).width),
      [9, 10, 28, 68.140625, 73],
    );
    const students = regsLib.listRegistrations().filter((r) => r.status === "enrolled" && r.groupId === g.id);
    assert.ok(students.length < LIST_ROWS);
    assert.equal(ws.rowCount, LIST_ROWS + 1, "öğrenci az olsa da 21 satır");
    assert.equal(ws.getRow(LIST_ROWS + 1).height, 48.75);
    const names = [...students].map((r) => r.studentFullName).sort((a, b) => a.localeCompare(b, "tr"));
    assert.equal(ws.getCell("C2").value, names[0]);
    assert.equal(ws.getCell("H2").value, g.name);
    for (const col of ["J", "K", "L"]) assert.equal(ws.getCell(`${col}2`).value, null, "yoklama / aidat / forma boş");
    assert.equal(ws.pageSetup.orientation, "landscape");
    assert.equal(ws.pageSetup.fitToHeight, 1);
    const keeper = students.find((r) => r.isGoalkeeper);
    if (keeper) assert.equal(ws.getCell(`I${names.indexOf(keeper.studentFullName) + 2}`).value, "Evet");
  });

  test("Kaleci: kayıtta işaretlenir, grup düzenlemesinde korunur, dosyadan değişir; forma siparişinde görünür", async () => {
    const eq = await import("../lib/equipment");
    const groups = listAgeGroups();
    const r = quick("Kaleci Deneme", "05351118888");
    assert.equal(r.isGoalkeeper, false, "varsayılan oyuncu");
    regsLib.enrollRegistration(r.id, { heightCm: null, weightKg: null, groupId: groups[0]!.id, enrolledAtIso: "2026-09-20T09:00:00.000Z", isGoalkeeper: true });
    assert.equal(regsLib.getRegistration(r.id)!.isGoalkeeper, true);
    regsLib.enrollRegistration(r.id, { heightCm: 140, weightKg: null, groupId: groups[0]!.id, enrolledAtIso: "2026-09-20T09:00:00.000Z" });
    assert.equal(regsLib.getRegistration(r.id)!.isGoalkeeper, true, "verilmezse eski değer kalır");
    const item = eq.listItems().find((i) => /forma/i.test(i.name))!;
    eq.createOrder(r.id, { itemId: item.id, size: "12", priceKurus: item.priceKurus, paid: false, delivery: "to_order", note: null }, null);
    assert.equal(eq.listOrders().find((o) => o.registrationId === r.id)?.isGoalkeeper, true);
    regsLib.setGoalkeeper(r.id, false);
    assert.equal(regsLib.getRegistration(r.id)!.isGoalkeeper, false);
    assert.throws(() => regsLib.setGoalkeeper(999999, true), regsLib.RegistrationNotFoundError);
  });

  test("Panelden kayıt: yalnız ad zorunlu, dolu alanlar biçim kontrolünden geçer", async () => {
    const { validateRegistrationAdmin, emptyFormValues } = validationLib;
    assert.equal(validateRegistrationAdmin({ ...emptyFormValues(), studentFullName: "" }).success, false);
    const ok = validateRegistrationAdmin({ ...emptyFormValues(), studentFullName: "Elle Eklenen", contactParentType: "" });
    assert.equal(ok.success, true);
    const bad = validateRegistrationAdmin({ ...emptyFormValues(), studentFullName: "X Y", studentTc: "12AB", studentPhone: "123" });
    assert.equal(bad.success, false);
    if (!bad.success) {
      assert.ok(bad.errors.studentTc);
      assert.ok(bad.errors.studentPhone);
    }
    // Kontrol hanesi tutmayan numara kaydı durdurmaz (ne panelde ne veli formunda); Veri kontrolünde bozuk veri olarak işaretlenir.
    assert.equal(validateRegistrationAdmin({ ...emptyFormValues(), studentFullName: "X Y", studentTc: "33031161682" }).success, true);
    const publicForm = validationLib.validateRegistration({ ...emptyFormValues(), studentTc: "33031161682" });
    assert.ok(publicForm.success || !publicForm.errors.studentTc);
    const tcLib = await import("../lib/tc");
    assert.deepEqual(tcLib.tcSwapSuggestions("33031161682").sort(), ["30331161682", "33301161682"]);
    assert.match(tcLib.tcCheckProblem("33031161682") ?? "", /10\. hane 4/);
    if (ok.success) {
      const created = regsLib.createRegistrationAdmin(ok.data);
      assert.ok(toRegistrationDto(created).missing.length > 0);
    }
  });

  test("Tekrar kayıt: aynı telefon + aynı ilk ad eşleşir, kardeşler eşleşmez, birleştirme ve veliden gelen güncelleme", async () => {
    const { duplicateMap } = await import("../lib/duplicates");
    const merge = await import("../lib/merge");
    const a = quick("Ali Tekrar", "05441112233");
    const b = quick("Ali Tekrar Yılmaz", "0544 111 22 33");
    const sib = quick("Veli Tekrar", "05441112233");
    const map = duplicateMap(regsLib.listRegistrations());
    assert.ok(map.get(a.id)?.includes(b.id));
    assert.ok(!map.get(a.id)?.includes(sib.id));
    merge.markNotDuplicate(a.id, b.id);
    assert.ok(!duplicateMap(regsLib.listRegistrations()).get(a.id)?.includes(b.id));
    const values = { ...validationLib.emptyFormValues(), studentFullName: "Ali Tekrar", studentTc: makeTc(101), contactParentType: "diger", contactParentFullName: "Ali Veli", contactParentPhone: "05441112233" };
    const parsed = validationLib.validateRegistrationAdmin(values);
    assert.ok(parsed.success);
    if (parsed.success) merge.mergeRegistrations(a.id, b.id, parsed.data);
    assert.equal(regsLib.getRegistration(b.id), null);
    assert.equal(regsLib.getRegistration(a.id)?.studentTc, makeTc(101));
    // Kayıtlı öğrenci silinecek taraf olamaz
    const enrolledOne = regsLib.listRegistrations().find((r) => r.status === "enrolled")!;
    if (parsed.success) assert.throws(() => merge.mergeRegistrations(a.id, enrolledOne.id, parsed.data), merge.MergeError);
    // Veliden gelen güncelleme
    merge.savePendingSubmission(a.id, { ...values, homeAddress: "Yeni adres" });
    const sub = merge.pendingSubmissions().get(a.id)!;
    assert.equal(sub.values.homeAddress, "Yeni adres");
    const upd = validationLib.validateRegistrationAdmin(sub.values);
    if (upd.success) merge.applySubmission(sub.id, upd.data, 1);
    assert.equal(regsLib.getRegistration(a.id)?.homeAddress, "Yeni adres");
    assert.throws(() => merge.dismissSubmission(sub.id, 1), merge.MergeError);
    // Durum elle değiştirme: kayıtlı öğrenci geri alınamaz, randevusuz "randevu verildi" olmaz
    assert.throws(() => regsLib.changeStatus(enrolledOne.id, "pending"), regsLib.RegistrationStateError);
    assert.throws(() => regsLib.changeStatus(a.id, "scheduled"), regsLib.RegistrationStateError);
    assert.equal(regsLib.changeStatus(a.id, "cancelled").status, "cancelled");
  });

  test("Randevu geri alma: randevu bekliyora döner, tarih silinir, geri al ile eski randevu gelir", () => {
    const r = quick("Randevu Geri", "05351234567");
    const at = "2026-10-01T14:00:00.000Z";
    regsLib.scheduleAppointment(r.id, at);
    const c = regsLib.cancelAppointment(r.id);
    assert.equal(c.status, "pending");
    assert.equal(c.appointmentAt, null);
    assert.throws(() => regsLib.cancelAppointment(r.id), regsLib.RegistrationStateError);
    const back = regsLib.restoreProcess(r.id, "scheduled", 0, at);
    assert.equal(back.appointmentAt, at);
    assert.equal(regsLib.changeStatus(r.id, "pending").appointmentAt, null);
  });

  test("Hassas alan koruması: izinsiz düzenlemede boş gelen TC, adres ve kan grubu eskisiyle kalır", () => {
    const current = { studentTc: "10000000146", fatherTc: null, motherTc: "", homeAddress: "Merkez", bloodGroup: "A Rh+" };
    const kept = regsLib.keepSensitiveFields({ studentFullName: "Yeni Ad", studentTc: null, fatherTc: null, motherTc: null, homeAddress: "", bloodGroup: "" }, current);
    assert.equal(kept.studentFullName, "Yeni Ad");
    assert.equal(kept.studentTc, "10000000146");
    assert.equal(kept.homeAddress, "Merkez");
    assert.equal(kept.bloodGroup, "A Rh+");
    assert.equal(kept.fatherTc, null);
    // İkinci kaynak: ilk kaynak boşsa (ör. veliden gelen güncelleme) ondan alınır.
    assert.equal(regsLib.keepSensitiveFields({ motherTc: "" }, current, { motherTc: "10000000078" }).motherTc, "10000000078");
  });

  test("Veri kontrolü: geçersiz T.C./telefon, şüpheli doğum tarihi, grupsuz öğrenci işaretlenir ve düzeltme adresi alana gider", async () => {
    const { issuesOf, fixHref } = await import("../lib/data-issues");
    const { toRegistrationDto } = await import("../lib/api");
    const r = quick("Veri Kontrol", "05351112233");
    const { getDb } = await import("../lib/db");
    const { registrations } = await import("../lib/db/schema");
    const { eq } = await import("drizzle-orm");
    getDb().update(registrations).set({ fatherTc: "3763989526", motherPhone: "12345", birthDate: "2026-04-07" }).where(eq(registrations.id, r.id)).run();
    regsLib.enrollRegistration(r.id, { heightCm: null, weightKg: null, groupId: null, enrolledAtIso: new Date().toISOString() });
    const issues = issuesOf(toRegistrationDto(regsLib.getRegistration(r.id)!));
    const types = issues.map((i) => i.type);
    for (const t of ["tc", "phone", "birth", "group"]) assert.ok(types.includes(t as never), `${t} bekleniyordu`);
    const tc = issues.find((i) => i.type === "tc")!;
    assert.equal(fixHref(r.id, tc.fix), `/admin/kayit/${r.id}/duzenle?alan=fatherTc`);
    assert.equal(fixHref(r.id, issues.find((i) => i.type === "group")!.fix), `/admin/kayit/${r.id}/asil-kayit`);
    // Düzgün kayıtta bozuk sorun yok
    const ok = quick("Temiz Kayit", "05351112244");
    assert.ok(!issuesOf(toRegistrationDto(ok)).some((i) => i.severity === "error"));
  });

  test("Veli özeti: grup, program, ilk aidat, boş yoklama ve onay durumları tek yerden", async () => {
    const { childSummary } = await import("../lib/guardian-summary");
    const { getSettings } = await import("../lib/settings");
    const { discountedFee } = await import("../lib/billing-shared");
    const groups = listAgeGroups();
    const r = quick("Veli Ozet", "05351119999");
    regsLib.enrollRegistration(r.id, { heightCm: null, weightKg: null, groupId: groups[0]!.id, enrolledAtIso: new Date().toISOString() });
    const s = childSummary(regsLib.getRegistration(r.id)!);
    assert.equal(s.firstName, "Veli");
    assert.equal(s.group?.id, groups[0]!.id);
    assert.equal(s.fee, discountedFee(getSettings().feeAmountKurus, 0));
    assert.equal(s.payments.length, 0);
    assert.equal(s.recent.length, 0);
    assert.ok(["first", "unbilled"].includes(s.pay), `yeni öğrenci ödeme durumu: ${s.pay}`);
    assert.ok(s.consents.every((c) => !c.ok), "veli henüz onay vermedi");
  });

  test("Grup değişikliği: geçmiş hak yeniden sayılmaz, kalan antrenmanlar yeni grubun günlerinden, peşin paket kayar", async () => {
    const { createAgeGroup } = await import("../lib/age-groups-db");
    const a = createAgeGroup({ name: "Değişim A", minBirthYear: 1976, maxBirthYear: 1976 });
    const b = createAgeGroup({ name: "Değişim B", minBirthYear: 1977, maxBirthYear: 1977 });
    // A: Cumartesi, Pazar · B: Çarşamba, Cumartesi, Pazar
    for (const [gid, day] of [[a.id, 6], [a.id, 7], [b.id, 3], [b.id, 6], [b.id, 7]] as const)
      program.saveSchedule(null, { groupId: gid, weekday: day, startTime: "10:00", endTime: "11:00", venueId: null, validFrom: null, validTo: null });
    program.ensureSessions("2026-06-01", "2026-08-31");
    const fee = settingsLib.getSettings().feeAmountKurus;
    const enroll = (name: string, phone: string, packs: number) => {
      const r = quick(name, phone);
      regsLib.enrollRegistration(r.id, { heightCm: null, weightKg: null, groupId: a.id, enrolledAtIso: "2026-06-03T09:00:00.000Z" });
      billing.ensurePeriods(regsLib.getRegistration(r.id)!, "2026-06-03", fee);
      if (packs) billing.recordPayment(r.id, { periodCount: packs, method: "cash", paidOn: "2026-06-03", note: null }, null, "2026-06-03");
      return r.id;
    };
    const reg = (id: number) => regsLib.getRegistration(id)!;
    // Ödedi: A'da 6, 7, 13, 14 Haziran kullanıldı (4 hak kaldı), 17 Haziran'da B'ye geçti → 17, 20, 21, 24 → yenileme 27 Haziran
    const paid = enroll("Degisim Odedi", "05351116601", 1);
    assert.equal(billing.accessOf(reg(paid), "2026-06-17").paidUntil, "2026-07-04");
    billing.changeGroupKeepingRights(paid, b.id, "2026-06-17");
    let acc = billing.accessOf(reg(paid), "2026-06-17");
    assert.equal(reg(paid).groupId, b.id);
    assert.equal(acc.state, "paid", "ödemiş öğrenci grup değişince gecikmiş sayılmaz");
    assert.equal(acc.paidUntil, "2026-06-27");
    assert.equal(acc.sessionsLeft, 4);
    // Grup değişikliğinden sonra iptal edilen antrenman da hak yemez: 20 Haziran iptal → yenileme 28 Haziran
    const s20 = program.listSessions({ from: "2026-06-20", to: "2026-06-20", groupIds: [b.id] })[0]!;
    program.cancelSession(s20.id, "Saha kapalı");
    billing.ensurePeriods(reg(paid), "2026-06-17", fee);
    assert.equal(billing.accessOf(reg(paid), "2026-06-17").paidUntil, "2026-06-28");
    program.restoreSession(s20.id);
    billing.ensurePeriods(reg(paid), "2026-06-17", fee);
    // Peşin 2 aidat: ikinci paket yeni yenilemeden 8 B antrenmanı (27, 28 Haz; 1, 4, 5, 8, 11, 12 Tem) → 15 Temmuz
    const ahead = enroll("Degisim Pesin", "05351116602", 2);
    billing.changeGroupKeepingRights(ahead, b.id, "2026-06-17");
    acc = billing.accessOf(reg(ahead), "2026-06-17");
    assert.equal(acc.state, "paid");
    assert.equal(acc.paidUntil, "2026-07-15");
    // Ödemedi: ödeme günü (ilk antrenman) olduğu gibi kalır, borç ikiye katlanmaz
    const unpaid = enroll("Degisim Odemedi", "05351116603", 0);
    billing.changeGroupKeepingRights(unpaid, b.id, "2026-06-17");
    acc = billing.accessOf(reg(unpaid), "2026-06-17");
    assert.equal(acc.dueDate, "2026-06-06");
    assert.equal(acc.unpaidCount, 1);
  });

  test("Grup aralığı: genişleyen grup komşusunu birleştirir ya da daraltır, bölme reddedilir, öğrenciler doğru gruba geçer", async () => {
    const ranges = await import("../lib/group-ranges");
    const { AgeGroupError } = await import("../lib/age-groups-db");
    const groups = [
      { id: 1, name: "A", minBirthYear: 2011, maxBirthYear: 2012 },
      { id: 2, name: "B", minBirthYear: 2013, maxBirthYear: 2014 },
      { id: 3, name: "C", minBirthYear: 2015, maxBirthYear: 2016 },
    ];
    const p = (id: number, year: number, groupId: number | null, status = "enrolled") => ({ id, studentFullName: `Ö${id}`, birthDate: `${year}-05-05`, groupId, status });
    const people = [p(1, 2011, 1), p(2, 2013, 2), p(3, 2014, 2), p(4, 2015, 3), p(5, 2017, null), p(6, 2013, null, "pending"), p(7, 2012, 2), p(8, 2012, 1)];
    const ids = (xs: { id: number }[]) => xs.map((x) => x.id);
    // 2011–2012 ile 2013–2014 birleşir: B'nin bütün öğrencileri (yaşı uymayan dahil) A'ya
    let plan = ranges.planRangeChange(groups, people, 1, { minBirthYear: 2011, maxBirthYear: 2014 });
    assert.deepEqual(ids(plan.merged), [2]);
    assert.deepEqual(ids(plan.merged[0]!.students), [2, 3, 7]);
    assert.equal(plan.trimmed.length + plan.adopted.length + plan.leaving.length, 0);
    assert.equal(plan.candidates, 1, "2013 doğumlu aday A'da görünür");
    // Bir ucu kapsanan grup daralır, yalnız o yıldaki öğrencileri geçer
    plan = ranges.planRangeChange(groups, people, 2, { minBirthYear: 2013, maxBirthYear: 2015 });
    assert.deepEqual(plan.trimmed.map((t) => [t.id, t.newYears, ids(t.students)]), [[3, "2016", [4]]]);
    // Hiçbir grubun yaşında olmayan öğrenci yeni yıla gelen gruba girer
    plan = ranges.planRangeChange(groups, people, 3, { minBirthYear: 2015, maxBirthYear: 2017 });
    assert.deepEqual(ids(plan.adopted), [5]);
    // Daralan grubun dışarıda kalan öğrencisi grubunda kalır, uyarılır
    plan = ranges.planRangeChange(groups, people, 1, { minBirthYear: 2011, maxBirthYear: 2011 });
    assert.deepEqual(ids(plan.leaving), [8]);
    assert.ok(ranges.needsConfirm(plan));
    assert.equal(ranges.needsConfirm(ranges.planRangeChange(groups, people, 1, { minBirthYear: 2010, maxBirthYear: 2012 })), false);
    // Bir grubu ikiye bölen aralık reddedilir
    assert.throws(() => ranges.planRangeChange([{ id: 9, name: "Geniş", minBirthYear: 2000, maxBirthYear: 2004 }], [], null, { minBirthYear: 2002, maxBirthYear: 2002 }), AgeGroupError);
  });

  test("Grup birleştirme: haklar ve geçmiş yoklama kalır, antrenör geçer, eski grubun antrenmanları kalkar, grup arşive alınır", async () => {
    const ranges = await import("../lib/group-ranges");
    const { createAgeGroup } = await import("../lib/age-groups-db");
    const db = dbMod.getDb();
    const today = "2026-07-15"; // Çarşamba
    const big = createAgeGroup({ name: "Aralık Büyük", minBirthYear: 1941, maxBirthYear: 1942 });
    const small = createAgeGroup({ name: "Aralık Küçük", minBirthYear: 1943, maxBirthYear: 1944 });
    // Büyük: Cumartesi · Küçük: Pazar
    program.saveSchedule(null, { groupId: big.id, weekday: 6, startTime: "10:00", endTime: "11:00", venueId: null, validFrom: null, validTo: null });
    program.saveSchedule(null, { groupId: small.id, weekday: 7, startTime: "10:00", endTime: "11:00", venueId: null, validFrom: null, validTo: null });
    program.ensureSessions("2026-07-01", "2026-08-31");
    const coach = db.insert(schema.users).values({ role: "coach", username: "aralik-hoca", status: "active" }).returning().get();
    program.setGroupCoaches(small.id, [coach.id]);
    const fee = settingsLib.getSettings().feeAmountKurus;
    const enroll = (name: string, phone: string, birthDate: string, groupId: number) => {
      const r = regsLib.createQuickRegistration({ studentFullName: name, parentFullName: `${name} Veli`, phone, groupId: null, birthDate, adminNote: null });
      regsLib.enrollRegistration(r.id, { heightCm: null, weightKg: null, groupId, enrolledAtIso: "2026-07-01T09:00:00.000Z" });
      billing.ensurePeriods(regsLib.getRegistration(r.id)!, "2026-07-01", fee);
      billing.recordPayment(r.id, { periodCount: 1, method: "cash", paidOn: "2026-07-01", note: null }, null, "2026-07-01");
      return r.id;
    };
    const kid = enroll("Aralik Kucuk", "05351118801", "1944-03-03", small.id);
    const s5 = program.listSessions({ from: "2026-07-05", to: "2026-07-05", groupIds: [small.id] })[0]!;
    att.markAttendance({ sessionId: s5.id, registrationId: kid, status: "present", source: "manual", userId: null }, "2026-07-05");
    // Pazar 5 ve 12 Temmuz kullanıldı: 6 hak kaldı
    assert.equal(billing.accessOf(regsLib.getRegistration(kid)!, today).sessionsLeft, 6);

    const plan = ranges.previewGroupRange(big.id, { name: "Aralık Büyük", minBirthYear: 1941, maxBirthYear: 1944 });
    assert.deepEqual(plan.merged.map((m) => [m.id, m.students.map((s) => s.id), m.coaches, m.schedule]), [[small.id, [kid], ["aralik-hoca"], "Pazar 10:00"]]);
    assert.equal(plan.schedule, "Cumartesi 10:00");
    assert.equal(plan.takeoverFrom, null);

    ranges.saveGroupRange(big.id, { name: "Aralık Büyük", minBirthYear: 1941, maxBirthYear: 1944 }, today);
    const kidReg = regsLib.getRegistration(kid)!;
    assert.equal(kidReg.groupId, big.id);
    // Kalan 6 hak Cumartesilerden: 18, 25 Tem; 1, 8, 15, 22 Ağu → yenileme 29 Ağustos
    const acc = billing.accessOf(kidReg, today);
    assert.equal(acc.state, "paid", "birleşen gruptaki ödemiş öğrenci gecikmiş sayılmaz");
    assert.equal(acc.sessionsLeft, 6);
    assert.equal(acc.paidUntil, "2026-08-29");
    assert.ok(!listAgeGroups().some((g) => g.id === small.id), "birleşen grup listelerden kalkar");
    assert.ok(db.select().from(schema.ageGroups).where(orm.eq(schema.ageGroups.id, small.id)).get()?.archivedAt, "geçmişi olan grup silinmez, arşive alınır");
    assert.equal(db.select().from(schema.attendance).where(orm.eq(schema.attendance.sessionId, s5.id)).all().length, 1, "geçmiş yoklama kalır");
    assert.equal(program.listSessions({ from: today, to: "2026-08-31", groupIds: [small.id], includeCancelled: true }).length, 0, "eski grubun sıradaki antrenmanları kalkar");
    assert.equal(db.select().from(schema.groupSchedules).where(orm.eq(schema.groupSchedules.groupId, small.id)).all().length, 0);
    assert.ok(program.listGroupCoaches().some((c) => c.groupId === big.id && c.userId === coach.id), "antrenör birleşen gruba geçer");
    // Yoklama tablosu: birleşmeden önceki günlerde eski grubun (Pazar) antrenmanı, sonra yeni grubun (Cumartesi)
    const g2 = gridLib.loadAttendanceGrid({ scope: null, today, perms: { billing: false, contact: false } });
    const krow = g2.students.find((r) => r.id === kid)!;
    const s12 = program.listSessions({ from: "2026-07-12", to: "2026-07-12", groupIds: [small.id] })[0]!;
    const sat18 = program.listSessions({ from: "2026-07-18", to: "2026-07-18", groupIds: [big.id] })[0]!;
    assert.equal(krow.groupId, big.id);
    assert.equal(krow.cells["2026-07-05"], s5.id, "yoklaması olan gün");
    assert.equal(krow.cells["2026-07-12"], s12.id, "birleşmeden önce eski grubun antrenmanı");
    assert.equal(krow.cells["2026-07-11"], undefined, "birleşmeden önce yeni grubun günü onun değil");
    assert.equal(krow.cells["2026-07-18"], sat18.id, "birleşmeden sonra yeni grubun antrenmanı");

    // Boş eski hücre güncel seans listesinde yoktur: çizelgedeki hücre kaydetme için de geçerlidir.
    const gridScope = { scope: null, today };
    assert.ok(!att.sessionRoster(s12.id, today).rows.some((r) => r.id === kid), "taşınan öğrenci eski seansın güncel listesinde yok");
    assert.equal(gridLib.isAttendanceGridCell(s12.id, kid, gridScope), true, "eski grubun boş yoklaması yeni grup satırından girilebilir");
    assert.equal(gridLib.isAttendanceGridCell(s12.id, kid, { scope: [big.id], today }), false, "kapsamı sınırlı kullanıcı arşiv grubuna erişemez");
    assert.equal(gridLib.isAttendanceGridCell(s12.id, -1, gridScope), false, "çizelgede olmayan öğrenci reddedilir");
    assert.equal(gridLib.isAttendanceGridCell(-1, kid, gridScope), false, "çizelgede olmayan seans reddedilir");
    const ownKid = enroll("Aralik Buyuk", "05351118804", "1941-03-03", big.id);
    assert.equal(gridLib.isAttendanceGridCell(s12.id, ownKid, gridScope), false, "aynı yeni gruptaki ilgisiz öğrenciye eski grubun yoklaması açılmaz");
    const attendanceWhere = orm.and(orm.eq(schema.attendance.sessionId, s12.id), orm.eq(schema.attendance.registrationId, kid));
    for (const status of ["present", "absent", "excused"] as const) {
      assert.equal(gridLib.isAttendanceGridCell(s12.id, kid, gridScope), true);
      att.markAttendance({ sessionId: s12.id, registrationId: kid, status, source: "manual", userId: null }, today);
      const movedGrid = gridLib.loadAttendanceGrid({ ...gridScope, perms: { billing: false, contact: false } });
      assert.equal(movedGrid.students.find((r) => r.id === kid)!.groupId, big.id);
      assert.equal(movedGrid.students.find((r) => r.id === kid)!.cells["2026-07-12"], s12.id, "tarih ve eski seans korunur");
      assert.equal(movedGrid.marks[`${s12.id}:${kid}`], status, "yeni grup satırından geçmiş yoklama değişir");
      assert.equal(db.select().from(schema.attendance).where(attendanceWhere).all().length, 1, "yoklama çoğaltılmaz");
      assert.equal(movedGrid.marks[`${s5.id}:${kid}`], "present", "diğer geçmiş yoklamalar korunur");
    }
    att.clearAttendance(s12.id, kid);
    assert.equal(gridLib.isAttendanceGridCell(s12.id, kid, gridScope), true, "temizlenen eski hücre yeniden girilebilir");
    att.markAttendance({ sessionId: s12.id, registrationId: kid, status: "present", source: "manual", userId: null }, today);
    assert.equal(db.select().from(schema.attendance).where(attendanceWhere).get()!.status, "present");
    assert.equal(regsLib.getRegistration(kid)!.groupId, big.id);
    const afterAttendance = billing.accessOf(regsLib.getRegistration(kid)!, today);
    assert.deepEqual([afterAttendance.sessionsLeft, afterAttendance.paidUntil], [acc.sessionsLeft, acc.paidUntil], "yoklama düzenlemek aidat haklarını değiştirmez");

    // Daralma: 1952 doğumlu geçer, 1953 kalır
    const f = createAgeGroup({ name: "Aralık F", minBirthYear: 1950, maxBirthYear: 1951 });
    const g = createAgeGroup({ name: "Aralık G", minBirthYear: 1952, maxBirthYear: 1954 });
    const born52 = enroll("Aralik Elliiki", "05351118802", "1952-01-01", g.id);
    const born53 = enroll("Aralik Elliuc", "05351118803", "1953-01-01", g.id);
    ranges.saveGroupRange(f.id, { name: "Aralık F", minBirthYear: 1950, maxBirthYear: 1952 }, today);
    const gNow = listAgeGroups().find((x) => x.id === g.id)!;
    assert.deepEqual([gNow.minBirthYear, gNow.maxBirthYear], [1953, 1954]);
    assert.equal(regsLib.getRegistration(born52)!.groupId, f.id);
    assert.equal(regsLib.getRegistration(born53)!.groupId, g.id);

    // Geçmişi olmayan grup silinince tamamen silinir
    const empty = createAgeGroup({ name: "Aralık Boş", minBirthYear: 1960, maxBirthYear: 1960 });
    ranges.deleteAgeGroup(empty.id, null, today);
    assert.equal(db.select().from(schema.ageGroups).where(orm.eq(schema.ageGroups.id, empty.id)).get(), undefined);
  });

  test("Elle hak girişi: kalan antrenman sayısı yenilemeyi kaydırır, peşin aidat alt sınırdır, bugün biten antrenman sayılmaz", async () => {
    const { createAgeGroup } = await import("../lib/age-groups-db");
    const g = createAgeGroup({ name: "Hak Girişi", minBirthYear: 1930, maxBirthYear: 1930 });
    // Çarşamba 10:00–11:00 ve Cumartesi 10:00–11:00
    for (const day of [3, 6]) program.saveSchedule(null, { groupId: g.id, weekday: day, startTime: "10:00", endTime: "11:00", venueId: null, validFrom: null, validTo: null });
    program.ensureSessions("2026-07-01", "2026-09-30");
    const fee = settingsLib.getSettings().feeAmountKurus;
    const enroll = (name: string, phone: string, packs: number) => {
      const r = regsLib.createQuickRegistration({ studentFullName: name, parentFullName: `${name} Veli`, phone, groupId: null, birthDate: "1930-02-02", adminNote: null });
      regsLib.enrollRegistration(r.id, { heightCm: null, weightKg: null, groupId: g.id, enrolledAtIso: "2026-07-01T09:00:00.000Z" });
      billing.ensurePeriods(regsLib.getRegistration(r.id)!, "2026-07-01", fee);
      if (packs) billing.recordPayment(r.id, { periodCount: packs, method: "cash", paidOn: "2026-07-01", note: null }, null, "2026-07-01");
      return r.id;
    };
    const before = new Date("2026-07-15T05:00:00Z"); // Çarşamba 08:00, antrenman yapılmadı
    const after = new Date("2026-07-15T09:30:00Z"); // Çarşamba 12:30, antrenman bitti
    const access = (id: number) => billing.accessOf(regsLib.getRegistration(id)!, "2026-07-15", after);

    const one = enroll("Hak Girisi Bir", "05351119901", 1);
    // Bitmiş antrenman sayılmaz: 3 hak → Cmt 18, Çar 22, Cmt 25 → sonraki ödeme 29 Temmuz
    let res = billing.setSessionsLeft(one, 3, after);
    assert.equal(res.paidUntil, "2026-07-29");
    assert.equal(access(one).sessionsLeft, 3);
    // Girilen hak zincirde kalır: sonradan iptal edilen antrenman hak yemez, yenileme kayar (22 Temmuz iptal → 1 Ağustos)
    const s22 = program.listSessions({ from: "2026-07-22", to: "2026-07-22", groupIds: [g.id] })[0]!;
    program.cancelSession(s22.id, "Yağmur");
    billing.ensurePeriods(regsLib.getRegistration(one)!, "2026-07-15", fee);
    assert.equal(access(one).paidUntil, "2026-08-01");
    assert.equal(access(one).sessionsLeft, 3);
    program.restoreSession(s22.id);
    billing.ensurePeriods(regsLib.getRegistration(one)!, "2026-07-15", fee);
    assert.equal(access(one).paidUntil, "2026-07-29");
    // Antrenmandan önce girilirse bugünkü antrenman da sayılır: Çar 15, Cmt 18, Çar 22 → 25 Temmuz
    res = billing.setSessionsLeft(one, 3, before);
    assert.equal(res.paidUntil, "2026-07-25");
    // 0 hak: sıradaki antrenman ödeme günü olur
    res = billing.setSessionsLeft(one, 0, after);
    assert.equal(res.paidUntil, "2026-07-18");
    assert.equal(access(one).state, "paid");
    billing.ensurePeriods(regsLib.getRegistration(one)!, "2026-07-18", fee); // gün gelince sıradaki paket açılır
    assert.equal(billing.accessOf(regsLib.getRegistration(one)!, "2026-07-18").state, "grace", "hakkı biten öğrencinin ödeme günü gelir");
    // Geri 8'e çıkar; ödeme ve makbuz sayısı değişmez
    billing.setSessionsLeft(one, 8, after);
    assert.equal(access(one).sessionsLeft, 8);
    assert.equal(billing.listPayments({ registrationId: one }).filter((p) => !p.voidedAt).length, 1);
    assert.throws(() => billing.setSessionsLeft(one, 9, after), billing.BillingError, "tek aidatla 8'den fazla hak olmaz");

    // Peşin 2 aidat: kalan hak 8–16 arası
    const two = enroll("Hak Girisi Iki", "05351119902", 2);
    assert.throws(() => billing.setSessionsLeft(two, 5, after), billing.BillingError);
    billing.setSessionsLeft(two, 10, after);
    assert.equal(access(two).sessionsLeft, 10);
    assert.equal(access(two).state, "paid");

    // Ödemesi olmayan öğrenci: önce aidat
    const none = enroll("Hak Girisi Yok", "05351119903", 0);
    assert.throws(() => billing.setSessionsLeft(none, 4, after), billing.BillingError);

    // Antrenmandan sonra yapılan kayıt / ödemede hak ertesi günden başlar
    const rights = await import("../lib/training-rights");
    assert.equal(rights.rightsStartDay(g.id, "2026-07-15", after), "2026-07-16");
    assert.equal(rights.rightsStartDay(g.id, "2026-07-15", before), "2026-07-15");
    assert.equal(rights.rightsStartDay(g.id, "2026-07-14", after), "2026-07-14", "başka gün olduğu gibi kalır");
    assert.equal(rights.rightsStartDay(g.id, "2026-07-16", new Date("2026-07-16T12:00:00Z")), "2026-07-16", "antrenmanı olmayan gün olduğu gibi kalır");
  });

  test("Yoklama tablosu dönem sonu: Aralık ya da Haziran sonu, en az dört hafta ileri", () => {
    assert.equal(gridLib.gridEnd("2026-10-05"), "2026-12-31");
    assert.equal(gridLib.gridEnd("2026-12-20"), "2027-01-17");
    assert.equal(gridLib.gridEnd("2027-02-10"), "2027-06-30");
  });

  test("Veli paneli bilgi uyarısı: eksik ve hatalı bilgiler listelenir, gönderilen bilgi onay bekler ve kayda yazılmaz", async () => {
    const info = await import("../lib/guardian-info");
    const { savePendingSubmission } = await import("../lib/merge");
    const { registrationToFormValues } = await import("../lib/registrations-client");
    const r = quick("Eksik Bilgili", "05351117701");
    const labels = info.infoProblems(regsLib.getRegistration(r.id)!).map((p) => p.label);
    assert.ok(labels.includes("Kan grubu eksik") && labels.includes("Ev adresi eksik"), labels.join(", "));
    dbMod.getDb().update(schema.registrations).set({ studentTc: "12345678901" }).where(orm.eq(schema.registrations.id, r.id)).run();
    assert.ok(info.infoProblems(regsLib.getRegistration(r.id)!).some((p) => p.label === "Öğrenci T.C. hatalı görünüyor"));
    assert.equal(info.pendingInfoAt(r.id), null);
    savePendingSubmission(r.id, { ...registrationToFormValues(regsLib.getRegistration(r.id)!), bloodGroup: "A Rh+" });
    assert.ok(info.pendingInfoAt(r.id), "gönderim onay bekliyor");
    assert.equal(regsLib.getRegistration(r.id)!.bloodGroup, "", "kayıt doğrudan değişmez");
  });

  test("Veli 'gelemeyecek': izinli yazılır ve geri alınır; başka grup, geçmiş antrenman reddedilir; antrenörün yoklaması korunur", async () => {
    const att = await import("../lib/attendance");
    const db = dbMod.getDb();
    const groups = listAgeGroups();
    const a = groups.find((g) => g.name === "Değişim A")!;
    const b = groups.find((g) => g.name === "Değişim B")!;
    const parent = db.insert(schema.users).values({ role: "admin", username: "smoke-veli-izin", fullName: "İzin Veli", status: "active" }).returning().get();
    const r = quick("Izin Deneme", "05351116604");
    regsLib.enrollRegistration(r.id, { heightCm: null, weightKg: null, groupId: a.id, enrolledAtIso: "2026-06-03T09:00:00.000Z" });
    const sessionOf = (gid: number, date: string) => db.select().from(schema.trainingSessions).where(orm.and(orm.eq(schema.trainingSessions.groupId, gid), orm.eq(schema.trainingSessions.date, date))).get()!;
    const mark = (sid: number) => db.select().from(schema.attendance).where(orm.and(orm.eq(schema.attendance.sessionId, sid), orm.eq(schema.attendance.registrationId, r.id))).get();
    const s20 = sessionOf(a.id, "2026-06-20");
    att.guardianExcuse({ registrationId: r.id, sessionId: s20.id, userId: parent.id, on: true }, "2026-06-17");
    assert.equal(mark(s20.id)?.status, "excused");
    assert.equal(mark(s20.id)?.source, att.GUARDIAN_SOURCE);
    assert.ok(att.guardianExcusedSessions(r.id, [s20.id]).has(s20.id));
    att.guardianExcuse({ registrationId: r.id, sessionId: s20.id, userId: parent.id, on: false }, "2026-06-17");
    assert.equal(mark(s20.id), undefined, "geri alınınca kayıt silinir");
    assert.throws(() => att.guardianExcuse({ registrationId: r.id, sessionId: sessionOf(a.id, "2026-06-13").id, userId: parent.id, on: true }, "2026-06-17"), att.AttendanceError, "geçmiş antrenman");
    assert.throws(() => att.guardianExcuse({ registrationId: r.id, sessionId: sessionOf(b.id, "2026-06-20").id, userId: parent.id, on: true }, "2026-06-17"), att.AttendanceError, "başka grubun antrenmanı");
    // Antrenör "gelmedi" yazdıysa veli bildirimi üstüne yazmaz, geri almak da silmez
    att.markAttendance({ sessionId: s20.id, registrationId: r.id, status: "absent", source: "manual", userId: null }, "2026-06-20");
    att.guardianExcuse({ registrationId: r.id, sessionId: s20.id, userId: parent.id, on: true }, "2026-06-20");
    assert.equal(mark(s20.id)?.status, "absent");
    att.guardianExcuse({ registrationId: r.id, sessionId: s20.id, userId: parent.id, on: false }, "2026-06-20");
    assert.equal(mark(s20.id)?.status, "absent");
  });

  test("Tarih aralığı: geçersiz gün, ay sınırı, iki uç dahil ve önceki eş uzunluk", async () => {
    const range = await import("../lib/date-range");
    assert.equal(range.isDateKey("2026-02-30"), false);
    assert.equal(range.isDateKey("2024-02-29"), true);
    assert.equal(range.validDateRange({ from: "2026-10-01", to: "2026-09-30" }), false);
    assert.deepEqual(range.defaultDateRange("2026-10-06"), { from: "2026-09-26", to: "2026-10-06" });
    const selected = { from: "2026-09-26", to: "2026-10-06" };
    assert.deepEqual(range.previousDateRange(selected), { from: "2026-09-15", to: "2026-09-25" });
    assert.deepEqual(range.previousDateRange({ from: "2024-03-01", to: "2024-03-03" }), { from: "2024-02-27", to: "2024-02-29" });
    assert.equal(range.inDateRange("2026-09-26", selected), true);
    assert.equal(range.inDateRange("2026-10-06", selected), true);
    assert.equal(range.inDateRange("2026-09-25", selected), false);
    assert.equal(range.inDateRange("2026-10-07", selected), false);
    assert.equal(range.withDateRange("/admin/kasa?ay=2026-10&tur=cash#kayit", selected), "/admin/kasa?tur=cash&from=2026-09-26&to=2026-10-06#kayit");
  });

  test("Aralık tahsilatı: Eylül–Ekim sınırları, iptal, ödeme filtresi ve Excel aynı tutarı verir", async () => {
    const reports = await import("../lib/reports");
    const cash = await import("../lib/cashbook");
    const shared = await import("../lib/cashbook-shared");
    const insights = await import("../lib/insights");
    const extras = await import("../lib/export/extras");
    const exportFilter = await import("../lib/export/filter");
    const range = { from: "2026-09-26", to: "2026-10-06" };
    const before = reports.collectionReport(range).collected;
    const r = quick("Aralık Sınır Deneme", "05351118811");
    regsLib.enrollRegistration(r.id, { heightCm: null, weightKg: null, groupId: listAgeGroups()[0]!.id, enrolledAtIso: "2026-09-25T22:30:00.000Z" });
    const amounts: [string, number, string, boolean][] = [
      ["2026-09-25", 50000, "cash", false], ["2026-09-26", 10000, "cash", false],
      ["2026-09-30", 20000, "eft", false], ["2026-10-01", 30000, "cash", false],
      ["2026-10-06", 40000, "eft", false], ["2026-10-07", 60000, "cash", false],
      ["2026-10-01", 70000, "cash", true],
    ];
    for (const [i, [paidOn, amountKurus, method, voided]] of amounts.entries()) dbMod.getDb().insert(schema.payments).values({ registrationId: r.id, receiptNo: `range-${i}`, amountKurus, method, paidOn, periodCount: 1, voidedAt: voided ? "2026-10-02T09:00:00Z" : null }).run();
    assert.equal(reports.collectionReport(range).collected - before, 100000);
    const m = insights.moneyOverview(range, "2026-10-06");
    assert.equal(m.collected, reports.collectionReport(range).collected);
    assert.equal(m.trend.reduce((n, d) => n + d.amount, 0), m.collected);
    const entries = cash.cashEntries(range.from, range.to);
    const filter = { kind: "cash" as const, query: r.studentFullName };
    const totals = shared.cashTotals(shared.filterCashEntries(entries, filter));
    assert.equal(totals.total, 40000);
    assert.equal(totals.count, 2);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await reports.collectionXlsx(range, filter)) as unknown as ArrayBuffer);
    assert.equal(wb.getWorksheet("Özet")!.getCell("B2").value, 400);
    const rows = wb.getWorksheet("Ödemeler")!;
    assert.equal(rows.rowCount, 3);
    assert.deepEqual([rows.getCell("A2").value, rows.getCell("A3").value].sort(), ["2026-09-26", "2026-10-01"]);
    assert.equal(shared.cashTotals(shared.filterCashEntries(entries, { ...filter, showVoided: true })).total, 40000);
    assert.equal(extras.extraRecords([regsLib.getRegistration(r.id)!], { billing: true, today: "2026-10-06", range }).get(r.id)!.paidTotal, 100000);
    assert.equal(exportFilter.validExportDates(new URLSearchParams({ from: "2026-02-30" })), false);
    assert.equal(exportFilter.validExportDates(new URLSearchParams({ devamFrom: range.to, devamTo: range.from })), false);
    const parsed = exportFilter.parseExportFilter(new URLSearchParams({ from: range.from, to: range.to, dateField: "enrolled" }));
    assert.equal(exportFilter.filterRegistrations([regsLib.getRegistration(r.id)!], listAgeGroups(), parsed).length, 1, "İstanbul günü: 25 Eylül 22.30 UTC, 26 Eylül kayıt");
  });

  test("Yoklama aralığı: 26 Eylül öncesi gizlenir, geçmiş veri kalır, PDF çok sayfaya bölünür", async () => {
    const { createAgeGroup } = await import("../lib/age-groups-db");
    const reports = await import("../lib/reports");
    const sheets = await import("../lib/program-sheets");
    const pdf = await import("../lib/pdf");
    const extras = await import("../lib/export/extras");
    const group = createAgeGroup({ name: "Aralık Yoklama", minBirthYear: 1961, maxBirthYear: 1962 });
    const r = quick("Aralık Yoklama Oyuncusu", "05351118812");
    regsLib.enrollRegistration(r.id, { heightCm: null, weightKg: null, groupId: group.id, enrolledAtIso: "2026-09-19T09:00:00.000Z" });
    const dates = ["2026-09-19", "2026-09-26", "2026-09-27", "2026-10-03", "2026-10-04"];
    for (const [i, date] of dates.entries()) {
      const session = dbMod.getDb().insert(schema.trainingSessions).values({ groupId: group.id, date, startTime: "10:00", endTime: "11:00" }).returning().get();
      dbMod.getDb().insert(schema.attendance).values({ sessionId: session.id, registrationId: r.id, status: i === 2 ? "absent" : "present", source: "manual", markedAt: "2026-10-06T09:00:00.000Z" }).run();
    }
    const range = { from: "2026-09-26", to: "2026-10-06" };
    const grid = gridLib.loadAttendanceGrid({ scope: [group.id], today: range.to, range, perms: { billing: false, contact: false } });
    assert.deepEqual(grid.days.map(d => d.date), dates.slice(1));
    assert.equal(Object.keys(grid.marks).length, 4);
    assert.equal(dbMod.getDb().select().from(schema.attendance).where(orm.eq(schema.attendance.registrationId, r.id)).all().length, 5, "eski yoklama silinmedi");
    const student = reports.attendanceReport(range).students.find(s => s.id === r.id)!;
    assert.equal(student.present, 3); assert.equal(student.absent, 1); assert.equal(student.rate, 75);
    assert.equal(extras.extraRecords([regsLib.getRegistration(r.id)!], { billing: false, range }).get(r.id)!.attendanceRate, 75);
    assert.equal(sheets.attendanceSheets(range, [group.id], true, range.to)[0]!.sessions.length, 4);
    for (let d = 1; d <= 20; d++) dbMod.getDb().insert(schema.trainingSessions).values({ groupId: group.id, date: `2026-09-${String(d).padStart(2, "0")}`, startTime: "12:00", endTime: "13:00" }).run();
    const longRange = { from: "2026-09-01", to: range.to };
    const buffer = await pdf.attendanceSheetPdf(longRange, [group.id], true, range.to);
    assert.ok((buffer.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length >= 2, "uzun aralık ikinci PDF sayfasına geçer");
  });

  let failed = 0;
  for (const [name, fn] of steps) {
    try {
      await fn();
      console.log(`✔ ${name}`);
    } catch (err) {
      failed++;
      console.error(`✘ ${name}`);
      console.error(err instanceof Error ? err.stack ?? err.message : err);
    }
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });

  if (failed > 0) {
    console.error(`\n${failed} test başarısız.`);
    process.exit(1);
  }
  console.log(`\nTüm testler geçti (${steps.length}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
