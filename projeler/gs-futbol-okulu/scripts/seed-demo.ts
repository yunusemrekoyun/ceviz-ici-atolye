import { loadEnvFile } from "../lib/load-env";

loadEnvFile();

/**
 * Yerel geliştirme için tam demo verisi: sahalar, grup programı, antrenörler, ~45 kayıtlı öğrenci (kardeşler,
 * kaleciler), adaylar, son 10 haftanın ödemeleri (düzenli, geciken, söz veren, yeni), yoklamalar, gelişim,
 * forma, duyurular, onaylar ve veli hesapları. Tüm demo şifreleri: demo1234 (veli girişi: öğrenci no + şifre).
 * Güvenlik: production'da veya veritabanında kayıt varken çalışmaz.
 * Kullanım: npm run db:seed-demo
 */

const DEMO_PASSWORD = "demo1234";

const BOYS = ["Ahmet", "Mehmet", "Emir", "Yusuf", "Eymen", "Ömer", "Aras", "Kerem", "Miraç", "Alperen", "Çınar", "Göktuğ", "Efe", "Kuzey", "Poyraz", "Burak", "Arda", "Deniz", "Mert", "Baran", "Ali Asaf", "Yiğit", "Talha", "Kaan", "Berat", "Umut", "Doruk", "Emre", "Onur", "Tuna", "Batuhan", "Selim", "Hamza", "Ayaz", "Mustafa", "Enes", "Furkan", "Serhat", "Alp", "Bora", "Egemen", "Utku", "Rüzgar", "Metehan", "Toprak"];
const LAST = ["Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Yıldız", "Aydın", "Öztürk", "Arslan", "Doğan", "Kılıç", "Aslan", "Koç", "Kurt", "Özdemir", "Karahan", "Olçar", "Gök", "Akıncı", "Eren", "Tekin", "Polat", "Erdem", "Bulut", "Güneş"];
const MOTHER = ["Ayşe", "Fatma", "Zeynep", "Elif", "Merve", "Esra", "Büşra", "Derya", "Hacer", "Duygu", "Nalan", "Reyhan", "Seda", "Gamze"];
const FATHER = ["Ali", "Hasan", "Hüseyin", "İbrahim", "Mustafa", "Murat", "Serkan", "Volkan", "Fatih", "Ahmet", "Eyyüp", "Bolat", "Mahmut", "Kadir"];

/** Tekrarlanabilir rastgele sayı (aynı demo her seferinde aynı çıksın). */
let seed = 20260926;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = <T>(arr: T[], i: number) => arr[i % arr.length]!;
const chance = (p: number) => rnd() < p;
const between = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));

function makeTc(n: number): string {
  const d: number[] = [];
  let x = n;
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
const phone = (i: number) => `05${pick(["30", "32", "33", "35", "36", "38", "42", "44", "53", "55"], i)}${String(1000000 + ((i * 7919) % 9000000)).slice(-7)}`;

type Persona = "regular" | "late" | "promise" | "new-paid" | "new-unpaid";

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Production ortamında çalıştırılamaz.");
  const { eq } = await import("drizzle-orm");
  const { getDb } = await import("../lib/db");
  const schema = await import("../lib/db/schema");
  const regs = await import("../lib/registrations");
  const { listAgeGroups } = await import("../lib/age-groups-db");
  const { findGroupForBirthDate } = await import("../lib/age-groups");
  const settingsLib = await import("../lib/settings");
  const program = await import("../lib/program");
  const billing = await import("../lib/billing");
  const eqLib = await import("../lib/equipment");
  const dev = await import("../lib/development");
  const ann = await import("../lib/announcements");
  const guardians = await import("../lib/guardians");
  const legal = await import("../lib/legal");
  const cards = await import("../lib/cards");
  const { hashPassword } = await import("../lib/auth/password");
  const { addDaysTo } = await import("../lib/dates");

  if (regs.countRegistrations() > 0) throw new Error("Veritabanında kayıt var; demo veri yalnızca boş veritabanına eklenir.");
  const db = getDb();
  const today = billing.todayKey();
  const start = addDaysTo(today, -70);
  const iso = (day: string, hour = 12) => new Date(`${day}T${String(hour).padStart(2, "0")}:00:00+03:00`).toISOString();
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  /* ---------- Ayarlar, kullanıcılar ---------- */
  settingsLib.setSetting("feeAmountKurus", 250000, null);
  settingsLib.setSetting("graceDays", 3, null);
  const staff = (role: string, username: string, fullName: string) => db.insert(schema.users).values({ role, username, fullName, passwordHash, status: "active" }).returning().get();
  const admin = db.select().from(schema.users).where(eq(schema.users.role, "admin")).get() ?? staff("admin", "demo-yonetici", "Demo Yönetici");
  const secretary = staff("admin", "sekreter", "Ayşe Hanım");
  const coaches = [staff("coach", "emre.hoca", "Emre Hoca"), staff("coach", "murat.hoca", "Murat Hoca"), staff("coach", "kaleci.hoca", "Serkan Hoca (kaleci)")];
  const takers = [admin.id, secretary.id, secretary.id];

  /* ---------- Sahalar ve program ---------- */
  const zafer = program.saveVenue(null, { name: "Zafer Stadı Yan Saha", address: "Zafer Stadı, Merkez / Kütahya", location: { lat: 39.4196, lng: 29.9855 }, note: "Otopark girişi arka kapıdan" });
  const hali = program.saveVenue(null, { name: "Dumlupınar Halı Saha", address: "Evliya Çelebi Yerleşkesi / Kütahya", location: { lat: 39.4815, lng: 29.9003 }, note: "Kış aylarında kapalı saha" });
  const groups = listAgeGroups();
  const plan: [number, number, string, string, number][] = [
    // grup sırası, gün (1=Pzt), başlangıç, bitiş, saha
    [0, 6, "10:00", "11:00", zafer.id],
    [0, 7, "10:00", "11:00", zafer.id],
    [1, 6, "11:00", "12:30", zafer.id],
    [1, 7, "11:00", "12:30", zafer.id],
    [2, 6, "13:00", "14:30", zafer.id],
    [2, 7, "13:00", "14:30", zafer.id],
    [3, 3, "17:30", "19:00", hali.id],
    [3, 6, "14:30", "16:00", zafer.id],
    [3, 7, "14:30", "16:00", zafer.id],
    [4, 3, "17:30", "19:00", hali.id],
    [4, 6, "16:00", "17:30", zafer.id],
    [4, 7, "16:00", "17:30", zafer.id],
  ];
  for (const [gi, weekday, startTime, endTime, venueId] of plan) {
    const g = groups[gi];
    if (g) program.saveSchedule(null, { groupId: g.id, weekday, startTime, endTime, venueId, validFrom: null, validTo: null });
  }
  groups.forEach((g, i) => program.setGroupCoaches(g.id, i < 2 ? [coaches[0]!.id, coaches[2]!.id] : [coaches[1]!.id, coaches[2]!.id]));
  program.ensureSessions(start, addDaysTo(today, 35));

  // Geçen hafta yağmurdan iptal, önümüzdeki hafta bir iptal (duyurulu)
  const sessionsOf = (from: string, to: string, gid: number) => program.listSessions({ from, to, groupIds: [gid] });
  const rainy = sessionsOf(addDaysTo(today, -9), addDaysTo(today, -2), groups[2]!.id)[0];
  if (rainy) program.cancelSession(rainy.id, "Yağmur nedeniyle saha kapalıydı");
  const upcoming = sessionsOf(addDaysTo(today, 5), addDaysTo(today, 12), groups[1]!.id)[0];
  if (upcoming) {
    program.cancelSession(upcoming.id, "Sahada bakım çalışması var");
    ann.createAnnouncement({
      title: `${groups[1]!.name}: antrenman iptal`,
      body: "Sahada bakım çalışması olduğu için bu antrenman yapılmayacak. Antrenman hakkınız bir antrenman ileri kayar.",
      groupIds: [groups[1]!.id],
      kind: "cancel",
      sessionId: upcoming.id,
      userId: admin.id,
    });
  }

  /* ---------- Öğrenciler ---------- */
  const enrolled: { id: number; persona: Persona; attendance: number; enrolledDay: string }[] = [];
  const siblingPhones = [phone(900), phone(901)];
  for (let i = 0; i < 45; i++) {
    const g = groups[i % groups.length]!;
    const year = g.minBirthYear + (i % (g.maxBirthYear - g.minBirthYear + 1));
    const sibling = i === 7 || i === 12 ? 0 : i === 20 || i === 26 ? 1 : -1;
    const last = sibling === 0 ? "Olçar" : sibling === 1 ? "Karahan" : pick(LAST, i * 3 + 1);
    const motherFirst = sibling === 0 ? "Duygu" : sibling === 1 ? "Hacer" : pick(MOTHER, i);
    const contactIsMother = sibling >= 0 || i % 3 !== 0;
    const reg = regs.createRegistrationAdmin({
      studentTc: i % 9 === 4 ? null : makeTc(5000 + i * 37),
      studentFullName: `${pick(BOYS, i)} ${last}`,
      birthDate: `${year}-${String(1 + (i % 12)).padStart(2, "0")}-${String(1 + ((i * 5) % 27)).padStart(2, "0")}`,
      homeAddress: `${pick(["Zafertepe", "Yunus Emre", "Cumhuriyet", "Alipaşa", "Servi", "Sofu"], i)} Mah. ${10 + i}. Sok. No:${i + 1} Merkez/Kütahya`,
      studentPhone: "",
      bloodGroup: pick(["A Rh+", "0 Rh+", "B Rh+", "AB Rh+", "A Rh-", "0 Rh-"], i),
      email: i % 4 === 0 ? `veli${i}@ornek.com` : null,
      fatherFullName: `${pick(FATHER, i)} ${last}`,
      fatherTc: null,
      fatherPhone: phone(i + 100),
      motherFullName: `${motherFirst} ${last}`,
      motherTc: null,
      motherPhone: sibling >= 0 ? siblingPhones[sibling]! : phone(i + 200),
      contactParentType: contactIsMother ? "anne" : "baba",
      contactParentFullName: null,
      contactParentPhone: null,
      emergencyFullName: `${pick(FATHER, i + 3)} ${pick(LAST, i + 2)}`,
      emergencyRelation: pick(["Amca", "Dayı", "Teyze", "Hala", "Dede", "Babaanne"], i),
      emergencyPhone: phone(i + 300),
    });
    // Katılım günü: çoğu 7–10 hafta önce, "yeni"ler son 10 günde
    const persona: Persona = i % 11 === 3 ? "new-unpaid" : i % 13 === 5 ? "new-paid" : i % 9 === 2 ? "late" : i % 14 === 6 ? "promise" : "regular";
    const enrolledDay = persona.startsWith("new") ? addDaysTo(today, -between(2, 9)) : addDaysTo(start, between(0, 21));
    regs.scheduleAppointment(reg.id, iso(addDaysTo(enrolledDay, -2), 15));
    regs.enrollRegistration(reg.id, {
      heightCm: 105 + (2021 - year) * 5 + between(0, 6),
      weightKg: 17 + (2021 - year) * 2.5 + between(0, 4),
      groupId: findGroupForBirthDate(groups, reg.birthDate)?.id ?? g.id,
      enrolledAtIso: iso(enrolledDay, 11),
      isGoalkeeper: i % 10 === 4,
    });
    if (i === 12 || i === 26) billing.setDiscount(reg.id, "Kardeş indirimi", 20);
    if (i % 8 === 1) regs.updateAdminNote(reg.id, pick(["Astım var, spreyini çantasında taşıyor.", "Babası akşam 18:00'den sonra aranmalı.", "Kardeşiyle aynı saatte gelmek istiyor.", "Gözlük kullanıyor, maçta spor gözlüğü takıyor."], i));
    enrolled.push({ id: reg.id, persona, attendance: persona === "late" ? 0.55 : 0.7 + rnd() * 0.28, enrolledDay });
  }

  /* ---------- Ödemeler: gerçekçi geçmiş ---------- */
  const grace = settingsLib.getSettings().graceDays;
  for (const s of enrolled) {
    if (s.persona === "new-unpaid") continue;
    let payDay = s.enrolledDay;
    let first = true;
    for (let cycle = 0; cycle < 12 && payDay <= today; cycle++) {
      const method = chance(0.65) ? "cash" : "eft";
      billing.recordPayment(s.id, { periodCount: 1, method, paidOn: payDay, note: first ? "Kayıtta alındı" : null }, pick(takers, cycle + s.id), payDay);
      first = false;
      const next = billing.accessOf(regs.getRegistration(s.id)!, payDay).paidUntil;
      if (!next || next > today) break;
      // Geciken / söz veren: son yenilemeyi ödemez
      if ((s.persona === "late" || s.persona === "promise") && addDaysTo(next, grace) <= today) break;
      payDay = addDaysTo(next, -between(0, 2));
      if (payDay > today) break;
    }
  }
  // Bugüne kadarki açık paketler (panel her gün açılışta da yapar), sonra ödeme sözleri
  billing.ensurePeriodsToday();
  for (const s of enrolled.filter((x) => x.persona === "promise")) {
    const a = billing.accessOf(regs.getRegistration(s.id)!, today);
    if (a.state === "grace" || a.state === "locked") billing.createOverride({ registrationId: s.id, reason: null, endsOn: addDaysTo(today, between(1, 5)), userId: secretary.id });
  }

  /* ---------- Yoklama: geçmiş antrenmanlar ---------- */
  const past = program.listSessions({ from: start, to: addDaysTo(today, -1) });
  for (const session of past) {
    if (chance(0.08)) continue; // antrenör yoklamayı unutmuş
    const coach = coaches[groups.findIndex((g) => g.id === session.groupId) < 2 ? 0 : 1]!;
    for (const s of enrolled) {
      const reg = regs.getRegistration(s.id)!;
      if (reg.groupId !== session.groupId || s.enrolledDay > session.date) continue;
      const allowed = billing.accessOf(reg, session.date).allowed;
      const status = !allowed ? "absent" : chance(s.attendance) ? "present" : chance(0.25) ? "excused" : "absent";
      db.insert(schema.attendance)
        .values({ sessionId: session.id, registrationId: s.id, status, source: status === "present" && chance(0.6) ? "qr" : "manual", markedBy: coach.id, markedAt: iso(session.date, 18) })
        .onConflictDoNothing()
        .run();
    }
  }

  /* ---------- Forma ve eşofman ---------- */
  const items = eqLib.listItems();
  const forma = items.find((x) => /forma/i.test(x.name))!;
  const esofman = items.find((x) => /eşofman/i.test(x.name));
  enrolled.forEach((s, i) => {
    const size = pick(["6-7", "8-9", "10-11", "12-13", "14-15", "S"], i);
    const r = rnd();
    if (r < 0.05) return; // forması girilmemiş
    const owned = r < 0.12;
    const paid = owned || r < 0.82;
    const delivery = owned ? "delivered" : r < 0.72 ? "delivered" : r < 0.82 ? "to_order" : r < 0.9 ? "delivered" : "ordered";
    eqLib.createOrder(s.id, { itemId: forma.id, size, priceKurus: forma.priceKurus, paid, paidOn: paid && !owned ? s.enrolledDay : null, paidMethod: chance(0.7) ? "cash" : "eft", owned, delivery, note: null }, secretary.id, s.enrolledDay);
    if (esofman && chance(0.4))
      eqLib.createOrder(s.id, { itemId: esofman.id, size, priceKurus: esofman.priceKurus || 220000, paid: chance(0.7), paidOn: s.enrolledDay, paidMethod: "cash", delivery: chance(0.6) ? "delivered" : "to_order", note: null }, secretary.id, s.enrolledDay);
  });

  /* ---------- Gelişim ---------- */
  const allGroups = groups.map((g) => g.id);
  const tests = [
    dev.saveTest(null, { name: "30 m sürat", unit: "sn", higherBetter: false, decimals: 2, groupIds: allGroups, description: "Duruş başlangıcından 30 metre koşu." }),
    dev.saveTest(null, { name: "Slalom top sürme", unit: "sn", higherBetter: false, decimals: 1, groupIds: allGroups, description: "8 huni arasında topla gidiş-dönüş." }),
    dev.saveTest(null, { name: "Durarak uzun atlama", unit: "cm", higherBetter: true, decimals: 0, groupIds: allGroups, description: null }),
  ];
  [addDaysTo(today, -42), addDaysTo(today, -7)].forEach((day, round) => {
    for (const t of tests) {
      const values = enrolled
        .filter((s) => s.enrolledDay <= day)
        .map((s) => {
          const age = Number(today.slice(0, 4)) - Number(regs.getRegistration(s.id)!.birthDate!.slice(0, 4));
          const base = t.unit === "cm" ? 90 + age * 9 : t.name.startsWith("30") ? 8.4 - age * 0.22 : 19 - age * 0.6;
          const better = round * (t.unit === "cm" ? 6 : -0.25);
          const v = base + better + (rnd() - 0.5) * (t.unit === "cm" ? 14 : 0.8);
          return { registrationId: s.id, value: Math.round(v * 100) / 100 };
        });
      if (values.length) dev.saveTestResults(t.id, day, values, coaches[0]!.id);
    }
  });
  const criteria = settingsLib.getSettings().evaluationCriteria;
  const comments = [
    "Top kontrolü çok gelişti, sol ayağını daha çok kullanmalı.",
    "Takım arkadaşlarıyla paslaşması güzel; sabırlı olmayı öğreniyor.",
    "Kondisyonu arttı, antrenmanlara hevesle geliyor.",
    "Pozisyon almayı öğreniyor, şutları daha isabetli.",
    "Disiplinli ve dikkatli, liderlik vasfı var.",
  ];
  enrolled.forEach((s, i) => {
    const reg = regs.getRegistration(s.id)!;
    if (s.enrolledDay <= addDaysTo(today, -35))
      dev.recordMeasurement({ registrationId: s.id, measuredOn: addDaysTo(today, -35), heightCm: (reg.heightCm ?? 120) + 1, weightKg: (reg.weightKg ?? 25) + 0.5, userId: coaches[0]!.id });
    if (s.persona.startsWith("new") || chance(0.25)) return;
    const scores = Object.fromEntries(criteria.map((c) => [c, between(3, 5)]));
    dev.saveEvaluation({ registrationId: s.id, evaluatedOn: addDaysTo(today, -between(3, 20)), scores, comment: pick(comments, i), userId: pick(coaches, i).id });
  });

  /* ---------- Duyurular ---------- */
  ann.createAnnouncement({ title: "Yeni sezona hoş geldiniz", body: "Antrenmanlarımız hafta sonu. Lütfen çocuklarımızı antrenmandan 10 dakika önce sahada hazır bulundurun; su ve krampon unutulmasın.", groupIds: [], userId: admin.id });
  ann.createAnnouncement({ title: "Forma dağıtımı", body: "Siparişi verilen formalar geldi. Cumartesi antrenman sonrası saha girişinde teslim edilecek.", groupIds: [], userId: secretary.id });
  ann.createAnnouncement({ title: "Veli toplantısı", body: "Önümüzdeki Pazar 12:00'de Zafer Stadı toplantı salonunda sezon planını konuşacağız. Tüm velilerimizi bekliyoruz.", groupIds: [], userId: admin.id });

  /* ---------- Veli hesapları, onaylar, kartlar, bildirimler ---------- */
  for (const s of enrolled) {
    guardians.ensureGuardianForStudent(s.id);
    cards.ensureCard(s.id, admin.id);
  }
  db.update(schema.users).set({ passwordHash, status: "active" }).where(eq(schema.users.role, "guardian")).run();
  const photo = legal.getPublishedText("foto-izni");
  enrolled.forEach((s, i) => {
    if (i % 12 === 7) return; // birkaçının onayı eksik kalsın
    for (const m of legal.missingRequiredConsents([s.id])) legal.recordConsent({ userId: null, registrationId: s.id, versionId: m.version.id, accepted: true, method: "admin_attest" });
    if (photo && i % 3 !== 0) legal.recordConsent({ userId: null, registrationId: s.id, versionId: photo.version.id, accepted: true, method: "admin_attest" });
  });
  for (const s of enrolled.filter((x) => x.persona === "late").slice(0, 2)) {
    const g = guardians.guardiansOfStudent(s.id)[0];
    if (g) billing.createClaim({ registrationId: s.id, userId: g.id, method: "eft", fileId: null, note: "Havale ile gönderdim." });
  }

  /* ---------- Adaylar ---------- */
  for (let i = 0; i < 15; i++) {
    const year = 2011 + (i % 11);
    const last = pick(LAST, i * 5 + 2);
    const reg = regs.createRegistrationAdmin({
      studentTc: null,
      studentFullName: `${pick(BOYS, i + 17)} ${last}`,
      birthDate: `${year}-${String(1 + ((i * 2) % 12)).padStart(2, "0")}-${String(1 + ((i * 7) % 27)).padStart(2, "0")}`,
      homeAddress: "",
      studentPhone: "",
      bloodGroup: "",
      email: null,
      fatherFullName: `${pick(FATHER, i + 4)} ${last}`,
      fatherTc: null,
      fatherPhone: phone(i + 500),
      motherFullName: `${pick(MOTHER, i + 5)} ${last}`,
      motherTc: null,
      motherPhone: phone(i + 600),
      contactParentType: i % 2 ? "anne" : "baba",
      contactParentFullName: null,
      contactParentPhone: null,
      emergencyFullName: "",
      emergencyRelation: "",
      emergencyPhone: "",
    });
    const stage = i % 5;
    if (stage === 1) regs.scheduleAppointment(reg.id, iso(addDaysTo(today, between(0, 4)), 10 + (i % 8)));
    if (stage === 2) regs.scheduleAppointment(reg.id, iso(addDaysTo(today, -2), 14));
    if (stage === 3) {
      regs.scheduleAppointment(reg.id, iso(addDaysTo(today, -4), 11));
      regs.markNoShow(reg.id);
    }
  }

  const siblingGuardian = guardians.guardiansOfStudent(enrolled[7]!.id)[0]!;
  const kids = guardians.guardianChildren(siblingGuardian.id);
  console.log(`${regs.countRegistrations()} kayıt, ${enrolled.length} öğrenci, ${past.length} geçmiş antrenman.`);
  console.log(`Veli girişi: öğrenci no ${regs.getRegistration(enrolled[0]!.id)!.studentNo} (kardeşli veli: ${kids.map((k) => k.studentNo).join(" / ")}), şifre ${DEMO_PASSWORD}`);
  console.log(`Antrenör girişi: emre.hoca / ${DEMO_PASSWORD} · Sekreter: sekreter / ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error("Demo veri eklenemedi:", err instanceof Error ? err.stack : err);
  process.exit(1);
});
