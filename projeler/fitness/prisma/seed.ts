import {
  PrismaClient, Role, MemberStatus, PaymentStatus,
  PaymentMethod, PlanInterval, Gender,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log("🌱 Seed başlatılıyor...");

  // ─── Şubeler ────────────────────────────────────────────────
  const branches = await Promise.all([
    prisma.branch.upsert({ where: { id: "branch-merkez" }, update: {}, create: { id: "branch-merkez", name: "Merkez Şube", address: "Bağdat Caddesi No:1", city: "İstanbul", phone: "+90 555 000 00 01", lat: 40.9603, lng: 29.0566 } }),
    prisma.branch.upsert({ where: { id: "branch-kadikoy" }, update: {}, create: { id: "branch-kadikoy", name: "Kadıköy Şube", address: "Moda Caddesi No:12", city: "İstanbul", phone: "+90 555 000 00 02", lat: 40.9907, lng: 29.0245 } }),
    prisma.branch.upsert({ where: { id: "branch-besiktas" }, update: {}, create: { id: "branch-besiktas", name: "Beşiktaş Şube", address: "Çırağan Caddesi No:5", city: "İstanbul", phone: "+90 555 000 00 03", lat: 41.0452, lng: 29.0062 } }),
    prisma.branch.upsert({ where: { id: "branch-sisli" }, update: {}, create: { id: "branch-sisli", name: "Şişli Şube", address: "Büyükdere Caddesi No:55", city: "İstanbul", phone: "+90 555 000 00 04", lat: 41.0606, lng: 28.9872 } }),
    prisma.branch.upsert({ where: { id: "branch-atasehir" }, update: {}, create: { id: "branch-atasehir", name: "Ataşehir Şube", address: "Atatürk Mahallesi No:8", city: "İstanbul", phone: "+90 555 000 00 05", lat: 40.9927, lng: 29.1177 } }),
  ]);

  // ─── Planlar ─────────────────────────────────────────────────
  await Promise.all([
    prisma.plan.upsert({ where: { id: "plan-aylik" },  update: {}, create: { id: "plan-aylik",  name: "Aylık Üyelik",  price: 1499,  interval: PlanInterval.MONTHLY,   durationDays: 30,  isPopular: false, order: 1, features: ["Sınırsız antrenman", "Soyunma odası", "Wi-Fi"] } }),
    prisma.plan.upsert({ where: { id: "plan-3aylik" }, update: {}, create: { id: "plan-3aylik", name: "3 Aylık Üyelik", price: 3999,  interval: PlanInterval.QUARTERLY, durationDays: 90,  isPopular: true,  order: 2, features: ["Sınırsız antrenman", "Grup dersleri", "Beslenme planı", "Soyunma odası"] } }),
    prisma.plan.upsert({ where: { id: "plan-yillik" }, update: {}, create: { id: "plan-yillik", name: "Yıllık Premium", price: 12999, interval: PlanInterval.YEARLY,    durationDays: 365, isPopular: false, order: 3, features: ["Tüm dersler", "Kişisel antrenör (4 seans/ay)", "InBody analiz", "Yoga & Pilates", "Misafir hakkı"] } }),
  ]);

  // ─── Admin ───────────────────────────────────────────────────
  const adminPass = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@bahafitness.com" },
    update: {},
    create: { email: "admin@bahafitness.com", name: "Sistem Yöneticisi", passwordHash: adminPass, role: Role.ADMIN, emailVerified: new Date() },
  });

  // ─── Eğitmenler ──────────────────────────────────────────────
  const trainersData = [
    { email: "elif@bahafitness.com",  name: "Elif Aydın",    specialty: "Fonksiyonel Antrenman / HIIT",    experience: 8, rating: 4.9, avatar: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400" },
    { email: "mert@bahafitness.com",  name: "Mert Kaya",     specialty: "Güç & Kondisyon / Powerlifting",  experience: 6, rating: 4.7, avatar: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400" },
    { email: "selin@bahafitness.com", name: "Selin Çelik",   specialty: "Yoga & Pilates / Esneklik",       experience: 5, rating: 4.8, avatar: "https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=400" },
  ];

  const trainerPass = await bcrypt.hash("trainer123", 10);
  const trainers = [];
  for (const t of trainersData) {
    const u = await prisma.user.upsert({
      where: { email: t.email }, update: {},
      create: { email: t.email, name: t.name, passwordHash: trainerPass, role: Role.TRAINER, emailVerified: new Date(), avatarUrl: t.avatar },
    });
    const tr = await prisma.trainer.upsert({
      where: { userId: u.id }, update: {},
      create: { userId: u.id, bio: `${t.experience} yıllık deneyimli ${t.specialty.split("/")[0].trim()} uzmanı.`, specialty: t.specialty, experience: t.experience, rating: t.rating },
    });
    trainers.push({ ...tr, user: u });
  }

  // ─── Demo Üye ────────────────────────────────────────────────
  const memberPass = await bcrypt.hash("member123", 10);
  const demoMemberUser = await prisma.user.upsert({
    where: { email: "uye@bahafitness.com" }, update: {},
    create: { email: "uye@bahafitness.com", name: "Mehmet Demir", passwordHash: memberPass, role: Role.MEMBER, emailVerified: new Date(), phone: "+90 555 111 22 33" },
  });
  const demoMember = await prisma.member.upsert({
    where: { memberNo: "BF-000001" }, update: {},
    create: { userId: demoMemberUser.id, memberNo: "BF-000001", status: MemberStatus.ACTIVE, qrCode: "BF-QR-000001", branchId: branches[0].id, trainerId: trainers[0].id, heightCm: 178, startWeightKg: 84, goal: "Kilo vermek ve kas oranını artırmak", gender: Gender.MALE, birthDate: new Date("1995-03-15") },
  });

  // ─── 24 Ek Üye ───────────────────────────────────────────────
  const names = [
    ["Ayşe", "Kaya"], ["Burak", "Yıldız"], ["Zeynep", "Şahin"], ["Can", "Öztürk"], ["Fatma", "Arslan"],
    ["Emre", "Çelik"], ["Merve", "Aydın"], ["Kerem", "Koç"], ["Selin", "Yılmaz"], ["Taner", "Güneş"],
    ["Derya", "Kurt"], ["Oğuz", "Demir"], ["Hande", "Çalışkan"], ["Serkan", "Polat"], ["Gizem", "Tekin"],
    ["Alp", "Uzun"], ["Naz", "Doğan"], ["Volkan", "Erdoğan"], ["Esra", "Kaplan"], ["Murat", "Yıldırım"],
    ["Pınar", "Özcan"], ["Arda", "Şimşek"], ["Tuğba", "Güler"], ["Baran", "Acar"],
  ];

  const planIds = ["plan-aylik", "plan-3aylik", "plan-yillik"];
  const statuses: MemberStatus[] = [MemberStatus.ACTIVE, MemberStatus.ACTIVE, MemberStatus.ACTIVE, MemberStatus.EXPIRED, MemberStatus.FROZEN];

  const allMembers = [demoMember];

  for (let i = 0; i < names.length; i++) {
    const [first, last] = names[i];
    const email = `${first.toLowerCase()}.${last.toLowerCase()}@demo.com`;
    const memberNo = `BF-${String(i + 2).padStart(6, "0")}`;
    const status = statuses[i % statuses.length];
    const branchId = branches[i % branches.length].id;
    const trainerId = trainers[i % trainers.length].id;

    const u = await prisma.user.upsert({
      where: { email }, update: {},
      create: { email, name: `${first} ${last}`, passwordHash: memberPass, role: Role.MEMBER, emailVerified: new Date() },
    });
    const m = await prisma.member.upsert({
      where: { memberNo }, update: {},
      create: {
        userId: u.id, memberNo, status, qrCode: `BF-QR-${memberNo}`,
        branchId, trainerId,
        gender: i % 2 === 0 ? Gender.FEMALE : Gender.MALE,
        birthDate: new Date(1990 + (i % 15), i % 12, (i % 28) + 1),
        heightCm: 160 + (i % 25), startWeightKg: 55 + (i % 35),
        goal: ["Kilo vermek", "Kas yapmak", "Forma girmek", "Sağlıklı yaşam"][i % 4],
        createdAt: daysAgo(randomBetween(30, 180)),
      },
    });
    allMembers.push(m);
  }

  // ─── Üyelikler & Ödemeler (6 aylık geçmiş) ───────────────────
  for (const member of allMembers) {
    const idx = allMembers.indexOf(member);
    const planId = planIds[idx % planIds.length];
    const plan = { "plan-aylik": { days: 30, price: 1499 }, "plan-3aylik": { days: 90, price: 3999 }, "plan-yillik": { days: 365, price: 12999 } }[planId]!;

    // Üyelik: yoksa oluştur
    const existingMs = await prisma.membership.findFirst({ where: { memberId: member.id } });
    let msId = existingMs?.id;
    if (!existingMs) {
      const startDate = daysAgo(randomBetween(10, 80));
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + plan.days);
      const ms = await prisma.membership.create({
        data: { memberId: member.id, planId, startDate, endDate, isActive: member.status === MemberStatus.ACTIVE },
      });
      msId = ms.id;
    }

    // Ödemeler: yoksa oluştur
    const existingPayments = await prisma.payment.count({ where: { memberId: member.id } });
    if (existingPayments === 0) {
      const paymentCount = randomBetween(1, 3);
      for (let p = 0; p < paymentCount; p++) {
        const paidAt = daysAgo(randomBetween(0, 150));
        const invoiceNo = `INV-${member.memberNo}-${p + 1}`;
        await prisma.payment.create({
          data: {
            memberId: member.id,
            membershipId: p === 0 ? msId : undefined,
            amount: plan.price,
            status: PaymentStatus.PAID,
            method: [PaymentMethod.CARD, PaymentMethod.CASH, PaymentMethod.TRANSFER][p % 3],
            paidAt,
            invoiceNo,
          },
        });
      }
    }

    // Ölçümler: yoksa oluştur
    const existingMeasurements = await prisma.measurement.count({ where: { memberId: member.id } });
    if (existingMeasurements === 0) {
      const measureCount = randomBetween(2, 4);
      for (let m2 = 0; m2 < measureCount; m2++) {
        await prisma.measurement.create({
          data: {
            memberId: member.id,
            weightKg: 60 + randomBetween(0, 30) - m2 * 0.8,
            bodyFatPct: 15 + randomBetween(0, 15) - m2 * 0.5,
            musclePct: 35 + randomBetween(0, 10) + m2 * 0.3,
            waistCm: 75 + randomBetween(0, 20),
            recordedAt: daysAgo(randomBetween(5, 120)),
          },
        });
      }
    }
  }

  // ─── Yoklama (son 30 gün) ─────────────────────────────────────
  const activeMembers = allMembers.slice(0, 18);
  for (const member of activeMembers) {
    const existingAttendance = await prisma.attendance.count({ where: { memberId: member.id } });
    if (existingAttendance > 0) continue;

    const checkInCount = randomBetween(8, 20);
    for (let c = 0; c < checkInCount; c++) {
      const checkIn = daysAgo(randomBetween(0, 29));
      checkIn.setHours(randomBetween(7, 21), randomBetween(0, 59), 0, 0);
      const checkOut = new Date(checkIn);
      checkOut.setMinutes(checkOut.getMinutes() + randomBetween(45, 120));
      await prisma.attendance.create({
        data: {
          memberId: member.id,
          branchId: branches[randomBetween(0, 4)].id,
          checkIn, checkOut,
          source: c % 5 === 0 ? "MANUAL" : "QR",
        },
      });
    }
  }

  // ─── Yorumlar ────────────────────────────────────────────────
  await prisma.testimonial.createMany({
    skipDuplicates: true,
    data: [
      { name: "Ayşe K.",  role: "Üye · 8 ay",  content: "Hayatımın en iyi yatırımı. Antrenörler harika, mekan müthiş.", rating: 5, order: 1, isVisible: true },
      { name: "Burak T.", role: "Üye · 1 yıl", content: "12 kilo verdim, formum hiç bu kadar iyi olmamıştı.",           rating: 5, order: 2, isVisible: true },
      { name: "Selin M.", role: "Üye · 6 ay",  content: "Grup dersleri inanılmaz enerjik. Kesinlikle tavsiye ederim.",  rating: 5, order: 3, isVisible: true },
      { name: "Emre Y.",  role: "Üye · 3 ay",  content: "Eğitmenler çok ilgili, program kişiye özel hazırlanıyor.",     rating: 4, order: 4, isVisible: true },
    ],
  });

  // ─── Site Ayarları ────────────────────────────────────────────
  const settings = [
    { key: "site.title",       value: "Baha Fitness — Premium Spor Kulübü", group: "seo" },
    { key: "site.description", value: "İstanbul'un kalbinde premium fitness deneyimi.", group: "seo" },
    { key: "contact.phone",    value: "+90 555 000 00 00", group: "contact" },
    { key: "contact.email",    value: "info@bahafitness.com", group: "contact" },
    { key: "social.instagram", value: "https://instagram.com/bahafitness", group: "social" },
    { key: "social.youtube",   value: "https://youtube.com/@bahafitness", group: "social" },
  ];
  for (const s of settings) {
    await prisma.siteSetting.upsert({ where: { key: s.key }, update: { value: s.value }, create: s });
  }

  console.log("✅ Seed tamamlandı.");
  console.log(`   Şube: ${branches.length} | Eğitmen: ${trainers.length} | Üye: ${allMembers.length}`);
  console.log("   Admin   : admin@bahafitness.com / admin123");
  console.log("   Eğitmen : elif@bahafitness.com  / trainer123");
  console.log("   Üye     : uye@bahafitness.com   / member123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
