import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import { retrieveCheckoutForm } from '@/lib/payments/iyzico';
import { sendReservationConfirmationEmail } from '@/lib/reservations/confirmation';
import { consumeCoupon } from '@/lib/loyalty/coupons';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

async function getPayment(id: string) {
  return prisma.payment.findUnique({
    where: { id },
    include: {
      reservation: {
        select: {
          id: true,
          confirmationId: true,
          status: true,
          paymentStatus: true,
          paymentExpiresAt: true,
          couponCode: true,
          discountAmount: true,
        },
      },
    },
  });
}

type PaymentRecord = NonNullable<Awaited<ReturnType<typeof getPayment>>>;

async function syncPaymentFromIyzico(request: NextRequest, payment: PaymentRecord) {
  if (
    !payment.iyzicoToken
    || payment.status === 'paid'
    || payment.status === 'failed'
    || payment.status === 'cancelled'
    || payment.status === 'expired'
  ) {
    return payment;
  }

  const result = await retrieveCheckoutForm(payment.iyzicoToken, payment.conversationId).catch(() => null);
  if (!result) return payment;

  const paidPrice = Number(result.paidPrice ?? 0);
  const amountMatches = Math.round(paidPrice) === payment.amount;
  const tokenMatches = !result.token || result.token === payment.iyzicoToken;
  const success = result.status === 'success'
    && result.paymentStatus === 'SUCCESS'
    && tokenMatches
    && amountMatches
    && (result.fraudStatus === undefined || result.fraudStatus === 1);

  if (success) {
    const shouldSendEmail = payment.reservation.status !== 'confirmed';

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'paid',
          iyzicoPaymentId: result.paymentId || undefined,
          errorCode: null,
          errorMessage: null,
          paidAt: new Date(),
        },
      });

      await tx.reservation.update({
        where: { id: payment.reservationId },
        data: {
          status: 'confirmed',
          paymentStatus: 'paid',
          paymentExpiresAt: null,
        },
      });

      if (payment.reservation.couponCode && payment.reservation.discountAmount > 0) {
        await consumeCoupon(tx, payment.reservation.couponCode, payment.reservation.discountAmount);
      }
    });

    await writeAuditLog({
      request,
      action: 'payment.paid',
      entityType: 'payment',
      entityId: payment.id,
      summary: `Ödeme polling ile doğrulandı ve rezervasyon onaylandı: #${payment.reservation.confirmationId}`,
      after: {
        confirmationId: payment.reservation.confirmationId,
        amount: payment.amount,
        currency: payment.currency,
        iyzicoPaymentId: result.paymentId,
      },
    });

    if (shouldSendEmail) {
      sendReservationConfirmationEmail(payment.reservationId).catch((error) => {
        console.error('Paid reservation confirmation email failed.', error);
      });
    }

    return (await getPayment(payment.id)) ?? payment;
  }

  const failed = result.status === 'failure'
    || result.paymentStatus === 'FAILURE'
    || result.paymentStatus === 'FAIL';

  if (failed) {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          iyzicoPaymentId: result.paymentId || undefined,
          errorCode: result.errorCode || undefined,
          errorMessage: result.errorMessage || 'Ödeme iyzico tarafından onaylanmadı.',
          failedAt: new Date(),
        },
      });

      await tx.reservation.update({
        where: { id: payment.reservationId },
        data: { paymentStatus: 'failed' },
      });
    });

    await writeAuditLog({
      request,
      action: 'payment.failed',
      entityType: 'payment',
      entityId: payment.id,
      summary: `Ödeme polling ile başarısız doğrulandı: #${payment.reservation.confirmationId}`,
      after: {
        status: result.status,
        paymentStatus: result.paymentStatus,
        errorCode: result.errorCode,
      },
    });

    return (await getPayment(payment.id)) ?? payment;
  }

  return payment;
}

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;

  let payment = await getPayment(id);

  if (!payment) {
    return NextResponse.json({ ok: false, message: 'Ödeme kaydı bulunamadı.' }, { status: 404 });
  }

  payment = await syncPaymentFromIyzico(request, payment);

  const expired = payment.reservation.paymentExpiresAt
    ? payment.reservation.paymentExpiresAt.getTime() <= Date.now()
    : false;

  if (
    expired
    && payment.status !== 'paid'
    && payment.reservation.status === 'payment_pending'
  ) {
    const [updatedPayment, updatedReservation] = await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: payment.status === 'failed' ? 'failed' : 'expired',
          failedAt: payment.failedAt ?? new Date(),
        },
      }),
      prisma.reservation.update({
        where: { id: payment.reservationId },
        data: {
          status: 'cancelled',
          paymentStatus: 'expired',
          paymentExpiresAt: new Date(),
        },
      }),
    ]);

    await writeAuditLog({
      request,
      action: 'payment.expired',
      entityType: 'payment',
      entityId: payment.id,
      summary: `Ödeme süresi doldu: #${payment.reservation.confirmationId}`,
      after: {
        reservationId: updatedReservation.id,
        paymentStatus: updatedReservation.paymentStatus,
      },
    });

    return NextResponse.json({
      ok: true,
      payment: {
        id: updatedPayment.id,
        status: updatedPayment.status,
        amount: updatedPayment.amount,
        currency: updatedPayment.currency,
        errorMessage: updatedPayment.errorMessage,
      },
      reservation: {
        id: updatedReservation.id,
        confirmationId: updatedReservation.confirmationId,
        status: updatedReservation.status,
        paymentStatus: updatedReservation.paymentStatus,
        paymentExpiresAt: updatedReservation.paymentExpiresAt?.toISOString() ?? null,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    payment: {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      errorMessage: payment.errorMessage,
    },
    reservation: {
      id: payment.reservation.id,
      confirmationId: payment.reservation.confirmationId,
      status: payment.reservation.status,
      paymentStatus: payment.reservation.paymentStatus,
      paymentExpiresAt: payment.reservation.paymentExpiresAt?.toISOString() ?? null,
    },
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (body?.action !== 'cancel') {
    return NextResponse.json({ ok: false, message: 'Geçersiz işlem.' }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      reservation: {
        select: {
          id: true,
          confirmationId: true,
          status: true,
          paymentStatus: true,
        },
      },
    },
  });

  if (!payment) {
    return NextResponse.json({ ok: false, message: 'Ödeme kaydı bulunamadı.' }, { status: 404 });
  }

  if (payment.status === 'paid' || payment.reservation.paymentStatus === 'paid') {
    return NextResponse.json({ ok: false, message: 'Ödemesi alınan rezervasyon iptal edilemez.' }, { status: 409 });
  }

  const [updatedPayment, updatedReservation] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'cancelled',
        failedAt: payment.failedAt ?? new Date(),
      },
    }),
    prisma.reservation.update({
      where: { id: payment.reservation.id },
      data: {
        status: 'cancelled',
        paymentStatus: 'cancelled',
        paymentExpiresAt: new Date(),
      },
    }),
  ]);

  await writeAuditLog({
    request,
    action: 'payment.cancelled',
    entityType: 'payment',
    entityId: payment.id,
    summary: `Ödeme oturumu iptal edildi: #${payment.reservation.confirmationId}`,
    after: {
      reservationId: updatedReservation.id,
      paymentStatus: updatedReservation.paymentStatus,
    },
  });

  return NextResponse.json({
    ok: true,
    payment: {
      id: updatedPayment.id,
      status: updatedPayment.status,
    },
    reservation: {
      id: updatedReservation.id,
      confirmationId: updatedReservation.confirmationId,
      status: updatedReservation.status,
      paymentStatus: updatedReservation.paymentStatus,
    },
  });
}
