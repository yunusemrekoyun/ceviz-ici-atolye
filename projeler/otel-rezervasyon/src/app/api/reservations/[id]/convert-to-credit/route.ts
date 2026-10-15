import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import { renderBrandedMail, sendMail } from '@/lib/mail';

export const runtime = 'nodejs';

const ELIGIBLE = ['pending', 'confirmed', 'payment_pending'];
const DEFAULT_CUTOFF_HOURS = 48;

async function generateUniqueCode(): Promise<string> {
  for (let i = 0; i < 10; i += 1) {
    const code = `KG-${randomBytes(4).toString('hex').toUpperCase()}`;
    const exists = await prisma.coupon.findUnique({ where: { code }, select: { id: true } });
    if (!exists) return code;
  }
  return `KG-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Self-service "change" = cancel the reservation and convert the amount already
 * paid into a credit coupon the guest can spend on a fresh booking (paying only
 * the difference through the normal payment flow).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth) return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 401 });

  const { id } = await params;
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { room: { select: { name: true } }, payments: true },
  }).catch(() => null);
  if (!reservation) {
    return NextResponse.json({ ok: false, message: 'Rezervasyon bulunamadı.' }, { status: 404 });
  }

  const isStaff = ['admin', 'personel'].includes(auth.user.roleSlug);
  const isOwn = reservation.userId === auth.user.id || reservation.email === auth.user.email;
  if (!isStaff && !isOwn) {
    return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 403 });
  }

  if (!ELIGIBLE.includes(reservation.status)) {
    return NextResponse.json({ ok: false, message: 'Bu rezervasyon değiştirilemez.' }, { status: 409 });
  }

  // The credit coupon is owned by a real customer account.
  const couponUserId = reservation.userId ?? (auth.user.roleSlug === 'musteri' ? auth.user.id : null);
  if (!couponUserId) {
    return NextResponse.json(
      { ok: false, message: 'Krediye dönüştürme için rezervasyonun bir müşteri hesabına bağlı olması gerekir.' },
      { status: 409 },
    );
  }

  // Cutoff window (staff override).
  if (!isStaff) {
    const cutoffRow = await prisma.systemSetting.findUnique({ where: { key: 'cancel_cutoff_hours' } });
    const cutoffHours = cutoffRow ? Number(cutoffRow.value) : DEFAULT_CUTOFF_HOURS;
    const deadline = reservation.checkInDate.getTime() - cutoffHours * 3_600_000;
    if (Date.now() > deadline) {
      return NextResponse.json(
        { ok: false, message: `Değişim süresi doldu. En geç girişten ${cutoffHours} saat önce yapılabilir.` },
        { status: 409 },
      );
    }
  }

  const paidAmount = reservation.payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  if (paidAmount <= 0) {
    return NextResponse.json(
      { ok: false, message: 'Bu rezervasyonda krediye dönüştürülecek ödeme yok. Bunun yerine iptal edebilirsiniz.' },
      { status: 409 },
    );
  }

  const code = await generateUniqueCode();

  const coupon = await prisma.$transaction(async (tx) => {
    const created = await tx.coupon.create({
      data: {
        code,
        userId: couponUserId,
        kind: 'credit',
        discountType: 'fixed',
        value: paidAmount,
        balance: paidAmount,
        minSpend: 0,
        status: 'active',
        sourceLabel: `Değişim kredisi · #${reservation.confirmationId}`,
      },
    });

    // Abandon any still-pending online attempt; keep paid payments as revenue
    // (the money is retained as store credit, not refunded to the card).
    await tx.payment.updateMany({
      where: { reservationId: id, status: 'initialized' },
      data: { status: 'cancelled', failedAt: new Date() },
    });

    await tx.reservation.update({
      where: { id },
      data: { status: 'cancelled', paymentStatus: 'converted', paymentExpiresAt: null },
    });

    return created;
  });

  await writeAuditLog({
    request,
    auth,
    action: 'reservation.convert_to_credit',
    entityType: 'reservation',
    entityId: reservation.id,
    summary: `Rezervasyon krediye dönüştürüldü: #${reservation.confirmationId} → ${code} (₺${paidAmount.toLocaleString('tr-TR')})`,
    after: { couponCode: code, amount: paidAmount },
  });

  // Inform the guest (fire-and-forget).
  try {
    const { html, text } = renderBrandedMail({
      title: 'Rezervasyon kredisi oluşturuldu',
      preview: `Rezervasyonunuz iptal edildi ve ₺${paidAmount.toLocaleString('tr-TR')} kredi kuponuna dönüştürüldü.`,
      intro: `Merhaba ${reservation.firstName}, #${reservation.confirmationId} numaralı rezervasyonunuz değişiklik için iptal edildi.`,
      lines: [
        `Kredi kuponunuz: ${code} (₺${paidAmount.toLocaleString('tr-TR')})`,
        'Yeni tarih/oda için rezervasyon yaparken bu kodu girerek tutardan düşebilir, kalan farkı ödeyebilirsiniz.',
        'Kalan bakiye kuponunuzda kalır ve sonraki rezervasyonlarda kullanılabilir.',
      ],
    });
    sendMail({ to: reservation.email, subject: `Rezervasyon Kredisi — ${code}`, html, text }).catch(console.error);
  } catch (mailError) {
    console.error('Credit conversion email failed.', mailError);
  }

  return NextResponse.json({ ok: true, couponCode: coupon.code, amount: paidAmount });
}
