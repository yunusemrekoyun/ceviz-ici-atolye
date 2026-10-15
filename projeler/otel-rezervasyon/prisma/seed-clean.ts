/**
 * CLEAN reset for go-live: wipes ALL data and creates ONLY the 5 role accounts.
 * No rooms, room types, reservations, reviews, contacts or settings — the hotel
 * builds its real content from the admin UI.
 *
 *   npx tsx prisma/seed-clean.ts      (veya: npm run db:seed:clean)
 *
 * Giriş bilgileri:
 *   admin@gmail.com       / admin123
 *   personel@gmail.com    / yunus123
 *   muhasebe@gmail.com    / yunus123
 *   musteri@gmail.com     / yunus123
 *   temizlikci@gmail.com  / yunus123
 */
import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

process.loadEnvFile('.env');

const prisma = new PrismaClient();

const roles = [
  { name: 'Admin',          slug: 'admin'      },
  { name: 'Personel',       slug: 'personel'   },
  { name: 'Muhasebe',       slug: 'muhasebe'   },
  { name: 'Müşteri',        slug: 'musteri'    },
  { name: 'Kat Hizmetleri', slug: 'temizlikci' },
] as const;

const profiles: Record<string, { firstName: string; lastName: string }> = {
  admin:      { firstName: 'Admin',    lastName: 'Kullanıcı' },
  personel:   { firstName: 'Personel', lastName: 'Kullanıcı' },
  muhasebe:   { firstName: 'Muhasebe', lastName: 'Kullanıcı' },
  musteri:    { firstName: 'Müşteri',  lastName: 'Kullanıcı' },
  temizlikci: { firstName: 'Kat',      lastName: 'Hizmetleri' },
};

async function main() {
  console.log('Temiz reset başlıyor — TÜM veriler silinecek…');

  // Child → parent sırasıyla sil (FK güvenli). KbsBildirim rezervasyona bağlı.
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.kbsBildirim.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.pointsLedger.deleteMany(),
    prisma.couponProduct.deleteMany(),
    prisma.hotelReview.deleteMany(),
    prisma.reservationGuest.deleteMany(),
    prisma.cleaningTask.deleteMany(),
    prisma.maintenanceReport.deleteMany(),
    prisma.lostItem.deleteMany(),
    prisma.reservation.deleteMany(),
    prisma.room.deleteMany(),
    prisma.roomType.deleteMany(),
    prisma.media.deleteMany(),
    prisma.experienceBooking.deleteMany(),
    prisma.contactRequest.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.emailVerificationToken.deleteMany(),
    prisma.accountPerson.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
    prisma.role.deleteMany(),
    prisma.systemSetting.deleteMany(),
  ]);

  const passwordHash = await argon2.hash('yunus123', { type: argon2.argon2id });
  const adminPasswordHash = await argon2.hash('admin123', { type: argon2.argon2id });

  for (const role of roles) {
    const createdRole = await prisma.role.create({ data: role });
    await prisma.user.create({
      data: {
        email: `${role.slug}@gmail.com`,
        passwordHash: role.slug === 'admin' ? adminPasswordHash : passwordHash,
        roleId: createdRole.id,
        firstName: profiles[role.slug].firstName,
        lastName: profiles[role.slug].lastName,
        phone: '0530 000 0000',
        nationality: 'TR',
        emailVerified: true,
      },
    });
  }

  console.log('Tamamlandı. 5 rol hesabı oluşturuldu (admin=admin123, diğerleri=yunus123). Başka veri yok.');
}

main()
  .catch((e) => {
    console.error('Temiz reset başarısız.', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
