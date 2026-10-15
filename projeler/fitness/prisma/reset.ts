/**
 * DB Reset Script — tüm tablolar temizlenir, seed kullanıcılar oluşturulur.
 * Çalıştır: npx tsx prisma/reset.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("⚠️  Tüm veriler siliniyor...\n");

  // Bağımlılık sırasına göre sil (child → parent)
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.classBooking.deleteMany(),
    prisma.workoutExercise.deleteMany(),
    prisma.workoutDay.deleteMany(),
    prisma.workoutProgram.deleteMany(),
    prisma.groupClass.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.trainerAvailability.deleteMany(),
    prisma.trainer.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.progressPhoto.deleteMany(),
    prisma.measurement.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.membership.deleteMany(),
    prisma.member.deleteMany(),
    prisma.session.deleteMany(),
    prisma.mediaAsset.deleteMany(),
    prisma.blogPost.deleteMany(),
    prisma.testimonial.deleteMany(),
    prisma.siteSetting.deleteMany(),
    prisma.branch.deleteMany(),
    prisma.plan.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log("✅ Tüm tablolar temizlendi.\n");

  const hash123    = await bcrypt.hash("admin123", 12);
  const hashYunus  = await bcrypt.hash("yunus123", 12);

  // --- Admin ---
  await prisma.user.create({
    data: {
      email: "admin@gmail.com",
      name: "Sistem Yöneticisi",
      passwordHash: hash123,
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });
  console.log("✅ Admin: admin@gmail.com / admin123");

  // --- Eğitmen 1 ---
  const trainer1User = await prisma.user.create({
    data: {
      email: "egitmen1@gmail.com",
      name: "Eğitmen Bir",
      passwordHash: hash123,
      role: "TRAINER",
      emailVerified: new Date(),
    },
  });
  await prisma.trainer.create({
    data: {
      userId: trainer1User.id,
      specialty: "Kuvvet & Kondisyon",
      experience: 5,
      rating: 4.8,
      isActive: true,
    },
  });
  console.log("✅ Eğitmen 1: egitmen1@gmail.com / admin123");

  // --- Eğitmen 2 ---
  const trainer2User = await prisma.user.create({
    data: {
      email: "egitmen2@gmail.com",
      name: "Eğitmen İki",
      passwordHash: hash123,
      role: "TRAINER",
      emailVerified: new Date(),
    },
  });
  await prisma.trainer.create({
    data: {
      userId: trainer2User.id,
      specialty: "Pilates & Yoga",
      experience: 3,
      rating: 4.6,
      isActive: true,
    },
  });
  console.log("✅ Eğitmen 2: egitmen2@gmail.com / admin123");

  // --- Üye (Yunus) ---
  const yunusUser = await prisma.user.create({
    data: {
      email: "yunus@gmail.com",
      name: "Yunus Emre",
      passwordHash: hashYunus,
      role: "MEMBER",
      emailVerified: new Date(),
    },
  });

  // memberNo için sayaç
  const memberCount = await prisma.member.count();
  const memberNo = `BF-${String(memberCount + 1).padStart(6, "0")}`;
  const qrCode   = `BF-QR-${memberNo}`;

  await prisma.member.create({
    data: {
      userId: yunusUser.id,
      memberNo,
      qrCode,
      status: "ACTIVE",
    },
  });
  console.log("✅ Üye: yunus@gmail.com / yunus123");

  console.log("\n✨ Bitti. Sisteme giriş yapabilirsiniz.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
