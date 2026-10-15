import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { writeAuditLog } from '@/lib/audit';
import { prisma, type PrismaTransactionClient } from '@/lib/prisma';
import { initializeCheckoutForm, isIyzicoConfigured } from '@/lib/payments/iyzico';
import { validateCoupon, consumeCoupon } from '@/lib/loyalty/coupons';
import { sendReservationConfirmationEmail } from '@/lib/reservations/confirmation';
import {
  findAvailableRoomForRoomType,
  getRoomAvailability,
  nightsBetween,
  parseDateOnly,
} from '@/lib/reservations/availability';

export const runtime = 'nodejs';

const paymentSessionSchema = z.object({
  retryReservationId: z.string().min(1).optional(),
  roomTypeId: z.string().min(1),
  checkInDate: z.string().min(1),
  checkOutDate: z.string().min(1),
  adultsCount: z.coerce.number().int().min(1).max(10),
  childrenCount: z.coerce.number().int().min(0).max(10),
  firstName: z.string().min(1).max(100).transform(v => v.trim()),
  lastName: z.string().min(1).max(100).transform(v => v.trim()),
  email: z.string().email().max(254).transform(v => v.trim().toLowerCase()),
  phone: z.string().min(1).max(30).transform(v => v.trim()),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional().default('TR'),
  tcKimlikNo: z.string().optional(),
  passportNo: z.string().optional(),
  passportExpiry: z.string().optional(),
  companyName: z.string().optional(),
  taxNumber: z.string().optional(),
  taxOffice: z.string().optional(),
  specialRequests: z.string().max(1000).optional(),
  couponCode: z.string().trim().max(40).optional(),
  kvkkAccepted: z.literal(true),
}).superRefine((data, ctx) => {
  if (data.tcKimlikNo) {
    if (!/^\d{11}$/.test(data.tcKimlikNo)) {
      ctx.addIssue({
        code: 'custom',
        path: ['tcKimlikNo'],
        message: 'T.C. kimlik no 11 haneli olmalı.',
      });
    }
    return;
  }

  if (!data.passportNo || data.passportNo.trim().length < 3) {
    ctx.addIssue({
      code: 'custom',
      path: ['passportNo'],
      message: 'T.C. kimlik no veya pasaport no zorunludur.',
    });
  }
});

type PaymentSessionInput = z.infer<typeof paymentSessionSchema>;

function getAppUrl(request: NextRequest) {
  return process.env.APP_URL?.trim()
    || process.env.NEXT_PUBLIC_BASE_URL?.trim()
    || request.nextUrl.origin;
}

function getIyzicoCallbackBaseUrl(request: NextRequest) {
  return process.env.IYZICO_CALLBACK_BASE_URL?.trim()
    || process.env.PAYMENT_CALLBACK_BASE_URL?.trim()
    || getAppUrl(request);
}

function getHoldMinutes() {
  const parsed = Number(process.env.PAYMENT_HOLD_MINUTES ?? 15);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15;
}

function getClientIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1';
}

function iframeUrl(paymentPageUrl?: string | null) {
  if (!paymentPageUrl) return null;
  try {
    const url = new URL(paymentPageUrl);
    url.searchParams.set('iframe', 'true');
    return url.toString();
  } catch {
    return paymentPageUrl.includes('?')
      ? `${paymentPageUrl}&iframe=true`
      : `${paymentPageUrl}?iframe=true`;
  }
}

async function createConfirmationId(tx: PrismaTransactionClient) {
  for (let i = 0; i < 8; i += 1) {
    const confirmationId = Math.floor(10000000 + Math.random() * 90000000).toString();
    const exists = await tx.reservation.findUnique({ where: { confirmationId }, select: { id: true } });
    if (!exists) return confirmationId;
  }

  return `P${Date.now().toString(36).toUpperCase()}`.slice(0, 16);
}

function sameDate(date: Date, key: string) {
  return date.toISOString().split('T')[0] === key;
}

async function createPaymentAttempt({
  request,
  data,
  auth,
}: {
  request: NextRequest;
  data: PaymentSessionInput;
  auth: Awaited<ReturnType<typeof getAuthContextFromRequest>> | null;
}) {
  if (!isIyzicoConfigured()) {
    return {
      error: NextResponse.json({
        ok: false,
        message: 'Online ödeme yapılandırması tamamlanmamış.',
      }, { status: 503 }),
    };
  }

  const callbackBaseUrl = getIyzicoCallbackBaseUrl(request);

  const checkIn = parseDateOnly(data.checkInDate);
  const checkOut = parseDateOnly(data.checkOutDate);

  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) || checkOut <= checkIn) {
    return { error: NextResponse.json({ ok: false, message: 'Geçersiz tarih aralığı.' }, { status: 400 }) };
  }

  const expiresAt = new Date(Date.now() + getHoldMinutes() * 60 * 1000);

  const created = await prisma.$transaction(async (tx) => {
    if (data.retryReservationId) {
      const reservation = await tx.reservation.findUnique({
        where: { id: data.retryReservationId },
        include: {
          room: { include: { roomType: true } },
        },
      });

      if (
        !reservation
        || reservation.status !== 'payment_pending'
        || reservation.paymentStatus === 'paid'
        || !reservation.paymentExpiresAt
        || reservation.paymentExpiresAt.getTime() <= Date.now()
        || reservation.email !== data.email
        || !sameDate(reservation.checkInDate, data.checkInDate)
        || !sameDate(reservation.checkOutDate, data.checkOutDate)
      ) {
        throw new Error('PAYMENT_SESSION_NOT_RETRYABLE');
      }

      const payment = await tx.payment.create({
        data: {
          reservationId: reservation.id,
          amount: reservation.totalPrice,
          conversationId: `${reservation.confirmationId}-${Date.now().toString(36)}`,
        },
      });

      return { reservation, payment, isRetry: true, confirmedNoPayment: false };
    }

    const chosenRoom = await findAvailableRoomForRoomType(tx, {
      roomTypeId: data.roomTypeId,
      checkIn,
      checkOut,
      adultsCount: data.adultsCount,
      childrenCount: data.childrenCount,
    });

    if (!chosenRoom) throw new Error('ROOM_NOT_AVAILABLE');

    const availability = await getRoomAvailability(tx, chosenRoom.id, checkIn, checkOut);
    if (!availability.available) throw new Error('ROOM_NOT_AVAILABLE');

    const room = await tx.room.findUnique({
      where: { id: chosenRoom.id },
      include: { roomType: true },
    });

    if (!room) throw new Error('ROOM_NOT_AVAILABLE');

    const nights = nightsBetween(checkIn, checkOut);
    const subtotal = chosenRoom.basePrice * nights;

    // Apply a coupon (loyalty store or credit) when a logged-in customer supplies one.
    let discountAmount = 0;
    let appliedCouponCode: string | null = null;
    if (data.couponCode && auth?.user.roleSlug === 'musteri') {
      const result = await validateCoupon(auth.user.id, data.couponCode, subtotal);
      if (result.ok) { discountAmount = result.discount; appliedCouponCode = result.code; }
    }
    const totalPrice = Math.max(0, subtotal - discountAmount);
    const confirmationId = await createConfirmationId(tx);

    const reservationData = {
      confirmationId,
      roomId: chosenRoom.id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      nights,
      adultsCount: data.adultsCount,
      childrenCount: data.childrenCount,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      birthDate: data.birthDate ? parseDateOnly(data.birthDate) : undefined,
      gender: data.gender || undefined,
      nationality: data.nationality,
      tcKimlikNo: data.tcKimlikNo || undefined,
      passportNo: data.passportNo || undefined,
      passportExpiry: data.passportExpiry ? parseDateOnly(data.passportExpiry) : undefined,
      companyName: data.companyName || undefined,
      taxNumber: data.taxNumber || undefined,
      taxOffice: data.taxOffice || undefined,
      specialRequests: data.specialRequests || undefined,
      subtotal,
      discountAmount,
      couponCode: appliedCouponCode,
      totalPrice,
      userId: auth?.user.roleSlug === 'musteri' ? auth.user.id : undefined,
    };

    // Fully covered by a coupon → no online payment; confirm immediately.
    if (totalPrice <= 0) {
      const reservation = await tx.reservation.create({
        data: { ...reservationData, status: 'confirmed', paymentStatus: 'paid', paymentExpiresAt: null },
        include: { room: { include: { roomType: true } } },
      });
      if (appliedCouponCode && discountAmount > 0) {
        await consumeCoupon(tx, appliedCouponCode, discountAmount);
      }
      return { reservation, payment: null, isRetry: false, confirmedNoPayment: true };
    }

    const reservation = await tx.reservation.create({
      data: { ...reservationData, status: 'payment_pending', paymentStatus: 'initialized', paymentExpiresAt: expiresAt },
      include: { room: { include: { roomType: true } } },
    });

    const payment = await tx.payment.create({
      data: {
        reservationId: reservation.id,
        amount: totalPrice,
        conversationId: `${confirmationId}-${Date.now().toString(36)}`,
      },
    });

    return { reservation, payment, isRetry: false, confirmedNoPayment: false };
  });

  // Coupon covered the whole amount — the reservation is already confirmed.
  if (created.confirmedNoPayment || !created.payment) {
    sendReservationConfirmationEmail(created.reservation.id).catch((e) => console.error('Free reservation email failed.', e));
    await writeAuditLog({
      request,
      auth,
      action: 'reservation.create',
      entityType: 'reservation',
      entityId: created.reservation.id,
      summary: `Kupon ile ücretsiz onaylandı: #${created.reservation.confirmationId}`,
      after: { confirmationId: created.reservation.confirmationId, totalPrice: 0, couponCode: created.reservation.couponCode },
    });
    return { confirmed: { confirmationId: created.reservation.confirmationId, reservationId: created.reservation.id } };
  }

  const callbackUrl = new URL('/api/payments/iyzico/callback', callbackBaseUrl);
  callbackUrl.searchParams.set('paymentId', created.payment.id);

  try {
    const initialize = await initializeCheckoutForm({
      conversationId: created.payment.conversationId,
      callbackUrl: callbackUrl.toString(),
      price: created.payment.amount,
      paidPrice: created.payment.amount,
      reservationCode: created.reservation.confirmationId,
      roomName: created.reservation.room.name,
      roomTypeName: created.reservation.room.roomType.name,
      buyer: {
        id: created.reservation.id,
        name: created.reservation.firstName,
        surname: created.reservation.lastName,
        email: created.reservation.email,
        phone: created.reservation.phone,
        identityNumber: created.reservation.tcKimlikNo || created.reservation.passportNo || '11111111111',
        ip: getClientIp(request),
      },
    });

    if (initialize.status !== 'success' || !initialize.token) {
      throw new Error(initialize.errorMessage || 'IYZICO_INITIALIZE_FAILED');
    }

    const payment = await prisma.payment.update({
      where: { id: created.payment.id },
      data: {
        status: 'initialized',
        iyzicoToken: initialize.token,
        paymentPageUrl: initialize.paymentPageUrl || null,
        checkoutFormHtml: initialize.checkoutFormContent || null,
      },
    });

    await writeAuditLog({
      request,
      auth,
      action: created.isRetry ? 'payment.retry' : 'payment.initialize',
      entityType: 'payment',
      entityId: payment.id,
      summary: created.isRetry
        ? `Ödeme yeniden başlatıldı: #${created.reservation.confirmationId}`
        : `Ödeme oturumu başlatıldı: #${created.reservation.confirmationId}`,
      after: {
        reservationId: created.reservation.id,
        confirmationId: created.reservation.confirmationId,
        amount: payment.amount,
        currency: payment.currency,
        expiresAt: created.reservation.paymentExpiresAt?.toISOString(),
      },
    });

    return {
      session: {
        id: payment.id,
        reservationId: created.reservation.id,
        confirmationId: created.reservation.confirmationId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        expiresAt: created.reservation.paymentExpiresAt?.toISOString(),
        paymentPageUrl: iframeUrl(payment.paymentPageUrl),
        checkoutFormContent: payment.checkoutFormHtml,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'IYZICO_INITIALIZE_FAILED';

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: created.payment.id },
        data: {
          status: 'failed',
          errorMessage: message,
          failedAt: new Date(),
        },
      });

      if (!created.isRetry) {
        await tx.reservation.update({
          where: { id: created.reservation.id },
          data: {
            status: 'cancelled',
            paymentStatus: 'failed',
            paymentExpiresAt: new Date(),
          },
        });
      }
    });

    await writeAuditLog({
      request,
      auth,
      action: 'payment.initialize_failed',
      entityType: 'payment',
      entityId: created.payment.id,
      summary: `Ödeme oturumu başlatılamadı: #${created.reservation.confirmationId}`,
      after: { errorMessage: message },
    });

    return {
      error: NextResponse.json({
        ok: false,
        message: message === 'IYZICO_CONFIG_MISSING' || message === 'IYZICO_DISABLED'
          ? 'Online ödeme yapılandırması tamamlanmamış.'
          : 'Ödeme oturumu şu anda başlatılamadı.',
      }, { status: 503 }),
    };
  }
}

export async function POST(request: NextRequest) {
  const parsed = paymentSessionSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: 'Rezervasyon ve ödeme bilgileri geçersiz.', errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const auth = await getAuthContextFromRequest(request).catch(() => null);

  try {
    const result = await createPaymentAttempt({ request, data: parsed.data, auth });

    if ('error' in result && result.error) return result.error;
    if ('confirmed' in result && result.confirmed) {
      return NextResponse.json({ ok: true, confirmed: result.confirmed }, { status: 201 });
    }

    return NextResponse.json({ ok: true, payment: result.session }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'ROOM_NOT_AVAILABLE') {
      return NextResponse.json(
        { ok: false, message: 'Seçilen tarihler için uygun oda bulunamadı.' },
        { status: 409 },
      );
    }

    if (error instanceof Error && error.message === 'PAYMENT_SESSION_NOT_RETRYABLE') {
      return NextResponse.json(
        { ok: false, message: 'Ödeme oturumu artık geçerli değil. Lütfen rezervasyonu yeniden başlatın.' },
        { status: 409 },
      );
    }

    console.error('Payment session creation failed.', error);
    return NextResponse.json(
      { ok: false, message: 'Ödeme oturumu oluşturulamadı.' },
      { status: 503 },
    );
  }
}
