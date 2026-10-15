import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import { sendMail } from '@/lib/mail';
import { renderChangeEmail } from '@/lib/mail/hotel-templates';
import { getPaymentTransactionId, refundPayment } from '@/lib/payments/iyzico';
import {
  findAvailableRoomForRoomType,
  getRoomAvailability,
  nightsBetween,
  parseDateOnly,
} from '@/lib/reservations/availability';

export const runtime = 'nodejs';

const CHANGEABLE = ['pending', 'confirmed'];

const schema = z.object({
  roomTypeId: z.string().min(1).optional(),
  checkInDate: z.string().min(1),
  checkOutDate: z.string().min(1),
  settleMethod: z.enum(['cash', 'card', 'transfer']).default('cash'),
});

function getClientIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1';
}

function sameDay(date: Date, key: string) {
  return date.toISOString().split('T')[0] === key;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth || !['admin', 'personel'].includes(auth.user.roleSlug)) {
    return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 403 });
  }

  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Değişiklik bilgileri geçersiz.' }, { status: 400 });
  }
  const data = parsed.data;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { room: { include: { roomType: true } }, payments: true },
  });
  if (!reservation) {
    return NextResponse.json({ ok: false, message: 'Rezervasyon bulunamadı.' }, { status: 404 });
  }
  if (!CHANGEABLE.includes(reservation.status)) {
    return NextResponse.json({ ok: false, message: 'Bu rezervasyon değiştirilemez.' }, { status: 409 });
  }

  const checkIn = parseDateOnly(data.checkInDate);
  const checkOut = parseDateOnly(data.checkOutDate);
  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) || checkOut <= checkIn) {
    return NextResponse.json({ ok: false, message: 'Geçersiz tarih aralığı.' }, { status: 400 });
  }
  const nights = nightsBetween(checkIn, checkOut);

  const wantsRoomTypeChange = data.roomTypeId && data.roomTypeId !== reservation.room.roomTypeId;
  const datesChanged = !sameDay(reservation.checkInDate, data.checkInDate) || !sameDay(reservation.checkOutDate, data.checkOutDate);

  if (!wantsRoomTypeChange && !datesChanged) {
    return NextResponse.json({ ok: false, message: 'Herhangi bir değişiklik yapılmadı.' }, { status: 400 });
  }

  // ── Resolve the target room ───────────────────────────────────────────────
  let targetRoom: { id: string; name: string; basePrice: number } | null = null;

  if (wantsRoomTypeChange) {
    const found = await findAvailableRoomForRoomType(prisma, {
      roomTypeId: data.roomTypeId!,
      checkIn,
      checkOut,
      adultsCount: reservation.adultsCount,
      childrenCount: reservation.childrenCount,
      excludeReservationId: reservation.id,
    });
    if (!found) {
      return NextResponse.json({ ok: false, message: 'Seçilen oda tipi bu tarihler için uygun değil.' }, { status: 409 });
    }
    targetRoom = { id: found.id, name: found.name, basePrice: found.basePrice };
  } else {
    // Keep the same room — make sure it is free for the new dates.
    const avail = await getRoomAvailability(prisma, reservation.roomId, checkIn, checkOut, reservation.id);
    if (!avail.available || !avail.room) {
      return NextResponse.json({ ok: false, message: 'Mevcut oda yeni tarihler için uygun değil.' }, { status: 409 });
    }
    targetRoom = { id: reservation.roomId, name: reservation.room.name, basePrice: avail.room.basePrice };
  }

  const newSubtotal = targetRoom.basePrice * nights;
  const newTotal = newSubtotal;
  const diff = newTotal - reservation.totalPrice;

  const ip = getClientIp(request);
  let refundFailed = false;

  // ── Settle the difference ─────────────────────────────────────────────────
  if (diff < 0) {
    // Refund the overpayment. Prefer the original online payment if present.
    const refundAmount = Math.abs(diff);
    const onlinePaid = reservation.payments.find(p => p.provider === 'iyzico' && p.status === 'paid' && p.iyzicoToken);
    if (onlinePaid?.iyzicoToken) {
      try {
        const ptid = await getPaymentTransactionId(onlinePaid.iyzicoToken, onlinePaid.conversationId);
        if (!ptid) throw new Error('PAYMENT_TRANSACTION_NOT_FOUND');
        const result = await refundPayment({ paymentTransactionId: ptid, price: refundAmount, ip, conversationId: onlinePaid.conversationId });
        if (result.status !== 'success') throw new Error(result.errorMessage || 'IYZICO_REFUND_FAILED');
      } catch {
        refundFailed = true;
      }
    }
    await prisma.payment.create({
      data: {
        reservationId: reservation.id,
        provider: onlinePaid ? 'iyzico' : 'manual',
        method: onlinePaid ? 'online' : data.settleMethod,
        status: refundFailed ? 'refund_failed' : 'refunded',
        amount: refundAmount,
        currency: 'TRY',
        conversationId: `RFD-${reservation.confirmationId}-${Date.now().toString(36)}`,
        refundedAmount: refundFailed ? null : refundAmount,
        refundedAt: refundFailed ? null : new Date(),
      },
    });
  } else if (diff > 0) {
    // Collect the extra at the desk (manual). Online self-service top-up is a
    // separate flow.
    await prisma.payment.create({
      data: {
        reservationId: reservation.id,
        provider: 'manual',
        method: data.settleMethod,
        status: 'paid',
        amount: diff,
        currency: 'TRY',
        conversationId: `CHG-${reservation.confirmationId}-${Date.now().toString(36)}`,
        paidAt: new Date(),
      },
    });
  }

  // ── Apply the change + recompute payment status ───────────────────────────
  const paidAgg = await prisma.payment.aggregate({
    where: { reservationId: reservation.id, status: 'paid' },
    _sum: { amount: true },
  });
  const collected = paidAgg._sum.amount ?? 0;
  const paymentStatus = collected >= newTotal ? 'paid' : collected > 0 ? 'partial' : 'unpaid';

  const updated = await prisma.reservation.update({
    where: { id },
    data: {
      roomId: targetRoom.id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      nights,
      subtotal: newSubtotal,
      totalPrice: newTotal,
      paymentStatus,
    },
    include: { room: { select: { name: true } } },
  });

  await writeAuditLog({
    request,
    auth,
    action: 'reservation.change',
    entityType: 'reservation',
    entityId: updated.id,
    summary: `Rezervasyon değiştirildi: #${updated.confirmationId} (${diff > 0 ? `+₺${diff}` : diff < 0 ? `-₺${Math.abs(diff)}` : 'fark yok'})`,
    before: {
      roomId: reservation.roomId,
      checkInDate: reservation.checkInDate.toISOString(),
      checkOutDate: reservation.checkOutDate.toISOString(),
      totalPrice: reservation.totalPrice,
    },
    after: {
      roomId: updated.roomId,
      checkInDate: updated.checkInDate.toISOString(),
      checkOutDate: updated.checkOutDate.toISOString(),
      totalPrice: updated.totalPrice,
      difference: diff,
      refundFailed,
    },
  });

  // Change confirmation email (fire-and-forget)
  try {
    const { html, text } = renderChangeEmail({
      firstName: updated.firstName,
      confirmationId: updated.confirmationId,
      roomName: updated.room.name,
      checkInDate: updated.checkInDate.toISOString().split('T')[0],
      checkOutDate: updated.checkOutDate.toISOString().split('T')[0],
      nights: updated.nights,
      totalPrice: updated.totalPrice,
      difference: diff,
    });
    sendMail({ to: updated.email, subject: `Rezervasyon Güncellendi — #${updated.confirmationId}`, html, text }).catch(console.error);
  } catch (mailError) {
    console.error('Change email failed.', mailError);
  }

  return NextResponse.json({
    ok: true,
    reservation: {
      id: updated.id,
      confirmationId: updated.confirmationId,
      roomName: updated.room.name,
      checkInDate: updated.checkInDate.toISOString().split('T')[0],
      checkOutDate: updated.checkOutDate.toISOString().split('T')[0],
      nights: updated.nights,
      totalPrice: updated.totalPrice,
      paymentStatus,
    },
    difference: diff,
    refundFailed,
  });
}
