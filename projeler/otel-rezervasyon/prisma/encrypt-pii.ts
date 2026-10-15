/**
 * One-time backfill: encrypt pre-existing plaintext identity numbers
 * (tcKimlikNo / passportNo) across User, AccountPerson, Reservation and
 * ReservationGuest. Idempotent — already-encrypted values are skipped, so it
 * is safe to re-run. Uses a RAW (unextended) Prisma client so it reads the
 * stored values verbatim and writes the encrypted form directly.
 *
 *   npx tsx prisma/encrypt-pii.ts
 */
import { PrismaClient } from '@prisma/client';
import { encryptPii, isEncryptedPii } from '../src/lib/pii';

process.loadEnvFile('.env');

const prisma = new PrismaClient();

const PII_FIELDS = ['tcKimlikNo', 'passportNo'] as const;

async function backfill<T extends { id: string }>(
  label: string,
  rows: (T & Record<string, unknown>)[],
  update: (id: string, data: Record<string, string>) => Promise<unknown>,
) {
  let touched = 0;
  for (const row of rows) {
    const data: Record<string, string> = {};
    for (const field of PII_FIELDS) {
      const v = row[field];
      if (typeof v === 'string' && v.length > 0 && !isEncryptedPii(v)) {
        data[field] = encryptPii(v);
      }
    }
    if (Object.keys(data).length > 0) {
      await update(row.id, data);
      touched += 1;
    }
  }
  console.log(`  ${label}: ${touched}/${rows.length} satır şifrelendi`);
}

async function main() {
  if (!process.env.PII_ENCRYPTION_KEY) {
    throw new Error('PII_ENCRYPTION_KEY tanımlı değil — .env kontrol edin.');
  }
  console.log('PII backfill başlıyor…');

  await backfill(
    'User',
    await prisma.user.findMany({ select: { id: true, tcKimlikNo: true, passportNo: true } }),
    (id, data) => prisma.user.update({ where: { id }, data }),
  );
  await backfill(
    'AccountPerson',
    await prisma.accountPerson.findMany({ select: { id: true, tcKimlikNo: true, passportNo: true } }),
    (id, data) => prisma.accountPerson.update({ where: { id }, data }),
  );
  await backfill(
    'Reservation',
    await prisma.reservation.findMany({ select: { id: true, tcKimlikNo: true, passportNo: true } }),
    (id, data) => prisma.reservation.update({ where: { id }, data }),
  );
  await backfill(
    'ReservationGuest',
    await prisma.reservationGuest.findMany({ select: { id: true, tcKimlikNo: true, passportNo: true } }),
    (id, data) => prisma.reservationGuest.update({ where: { id }, data }),
  );

  console.log('PII backfill tamamlandı.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
