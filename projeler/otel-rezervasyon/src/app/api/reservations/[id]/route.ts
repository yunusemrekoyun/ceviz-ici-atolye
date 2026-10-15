import { NextRequest, NextResponse } from 'next/server';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import { sendMail } from '@/lib/mail';
import { renderCancellationEmail } from '@/lib/mail/hotel-templates';
import { getPaymentTransactionId, refundPayment, cancelIyzicoPayment } from '@/lib/payments/iyzico';
import { restoreCoupon } from '@/lib/loyalty/coupons';

export const runtime = 'nodejs';

const CANCELLABLE = ['pending', 'confirmed', 'payment_pending'];
const DEFAULT_CUTOFF_HOURS = 48;
const DEFAULT_REFUND_RATE = 100;

function getClientIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1';
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const { action } = body ?? {};

  if (action !== 'cancel') {
    return NextResponse.json({ ok: false, message: 'Geçersiz işlem.' }, { status: 400 });
  }

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

  if (!CANCELLABLE.includes(reservation.status)) {
    return NextResponse.json({ ok: false, message: 'Bu rezervasyon iptal edilemez.' }, { status: 409 });
  }

  // ── Policy: cutoff window (staff may override) ────────────────────────────
  const [cutoffRow, rateRow] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: 'cancel_cutoff_hours' } }),
    prisma.systemSetting.findUnique({ where: { key: 'refund_rate_percent' } }),
  ]);
  const cutoffHours = cutoffRow ? Number(cutoffRow.value) : DEFAULT_CUTOFF_HOURS;
  const refundRate = rateRow ? Number(rateRow.value) : DEFAULT_REFUND_RATE;

  if (!isStaff) {
    const deadline = reservation.checkInDate.getTime() - cutoffHours * 3_600_000;
    if (Date.now() > deadline) {
      return NextResponse.json(
        { ok: false, message: `İptal süresi doldu. İptal, girişten en geç ${cutoffHours} saat önce yapılabilir.` },
        { status: 409 },
      );
    }
  }

  // ── Refund paid payments ──────────────────────────────────────────────────
  const ip = getClientIp(request);
  const paidPayments = reservation.payments.filter(p => p.status === 'paid');
  let totalRefunded = 0;
  let anyRefundFailed = false;

  for (const p of paidPayments) {
    const refundAmount = Math.round((p.amount * refundRate) / 100);

    if (p.provider === 'iyzico' && p.iyzicoToken) {
      try {
        if (refundAmount > 0) {
          const isFull = refundAmount >= p.amount;
          // Full refund → /payment/cancel by paymentId (reliable, pre-settlement).
          // Partial → /payment/refund needs the per-item paymentTransactionId.
          const result = isFull && p.iyzicoPaymentId
            ? await cancelIyzicoPayment({ paymentId: p.iyzicoPaymentId, ip, conversationId: p.conversationId })
            : await (async () => {
                const ptid = await getPaymentTransactionId(p.iyzicoToken!, p.conversationId);
                if (!ptid) throw new Error('PAYMENT_TRANSACTION_NOT_FOUND');
                return refundPayment({ paymentTransactionId: ptid, price: refundAmount, ip, conversationId: p.conversationId });
              })();
          if (result.status !== 'success') {
            console.error('iyzico refund/cancel did not succeed', { paymentId: p.id, result });
            throw new Error(result.errorMessage || 'IYZICO_REFUND_FAILED');
          }
        }
        await prisma.payment.update({
          where: { id: p.id },
          data: { status: 'refunded', refundedAmount: refundAmount, refundedAt: new Date() },
        });
        totalRefunded += refundAmount;
      } catch (error) {
        console.error('Refund failed for payment', p.id, error);
        anyRefundFailed = true;
        await prisma.payment.update({
          where: { id: p.id },
          data: { status: 'refund_failed', errorMessage: error instanceof Error ? error.message : 'REFUND_FAILED' },
        }).catch(() => null);
      }
    } else {
      // Manual / cash payments are refunded at the desk; just record it.
      await prisma.payment.update({
        where: { id: p.id },
        data: { status: 'refunded', refundedAmount: refundAmount, refundedAt: new Date() },
      });
      totalRefunded += refundAmount;
    }
  }

  // Abandon any still-pending online attempt.
  await prisma.payment.updateMany({
    where: { reservationId: id, status: 'initialized' },
    data: { status: 'cancelled', failedAt: new Date() },
  });

  // Give back the coupon that was used on this (paid) reservation.
  if (reservation.couponCode && reservation.discountAmount > 0 && paidPayments.length > 0) {
    await prisma.$transaction((tx) => restoreCoupon(tx, reservation.couponCode!, reservation.discountAmount));
  }

  const newPaymentStatus = paidPayments.length === 0
    ? (reservation.paymentStatus === 'paid' ? 'refunded' : 'cancelled')
    : anyRefundFailed ? 'refund_failed' : 'refunded';

  const updated = await prisma.reservation.update({
    where: { id },
    data: { status: 'cancelled', paymentStatus: newPaymentStatus, paymentExpiresAt: null },
  });

  await writeAuditLog({
    request,
    auth,
    action: 'reservation.cancel',
    entityType: 'reservation',
    entityId: updated.id,
    summary: `Rezervasyon iptal edildi: #${updated.confirmationId}${totalRefunded > 0 ? ` (iade ₺${totalRefunded.toLocaleString('tr-TR')})` : ''}`,
    before: { status: reservation.status, paymentStatus: reservation.paymentStatus },
    after: { status: updated.status, paymentStatus: newPaymentStatus, refunded: totalRefunded, refundFailed: anyRefundFailed },
  });

  // Cancellation/refund email (fire-and-forget)
  try {
    const { html, text } = renderCancellationEmail({
      firstName: reservation.firstName,
      confirmationId: reservation.confirmationId,
      roomName: reservation.room.name,
      refundAmount: totalRefunded,
      refundFailed: anyRefundFailed,
    });
    sendMail({ to: reservation.email, subject: `Rezervasyon İptali — #${reservation.confirmationId}`, html, text }).catch(console.error);
  } catch (mailError) {
    console.error('Cancellation email failed.', mailError);
  }

  return NextResponse.json({
    ok: true,
    reservation: updated,
    refund: { amount: totalRefunded, failed: anyRefundFailed },
  });
}
