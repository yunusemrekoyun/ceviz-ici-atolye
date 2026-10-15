import { NextRequest, NextResponse, after } from 'next/server';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { dispatchKbsCikis, dispatchKbsGiris } from '@/lib/kbs/notify';
import { sendMail } from '@/lib/mail';
import { renderCheckinEmail, renderReviewRequestEmail } from '@/lib/mail/hotel-templates';
import { awardCheckoutPoints, isLoyaltyEnabled } from '@/lib/loyalty/coupons';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';

const ROOM_SEL = {
  select: {
    id: true, name: true, floor: true, status: true,
    roomType: { select: { name: true } },
  },
} as const;

class RoomStatusConflictError extends Error {
  constructor(readonly status: string | null | undefined) {
    super('ROOM_STATUS_CONFLICT');
  }
}

function getAppUrl(request: NextRequest) {
  return process.env.APP_URL?.trim() || request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const code  = searchParams.get('code')?.trim();
  const today = searchParams.get('today');

  // ── Search by confirmation code ───────────────────────────────────────────
  if (code) {
    const reservation = await prisma.reservation.findUnique({
      where:   { confirmationId: code },
      include: { room: ROOM_SEL },
    }).catch(() => null);

    if (!reservation) {
      return NextResponse.json(
        { ok: false, message: 'Rezervasyon bulunamadı.' },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, reservation });
  }

  // ── Today's arrivals and departures ───────────────────────────────────────
  if (today === 'true') {
    const todayStart = new Date(); todayStart.setHours(0,  0,  0,   0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const [arrivals, departures, upcomingArrivals, upcomingDepartures, inHouse] = await Promise.all([
      prisma.reservation.findMany({
        where: {
          checkInDate: { gte: todayStart, lte: todayEnd },
          status: { in: ['confirmed', 'pending'] },
        },
        include: { room: ROOM_SEL },
        orderBy: { room: { name: 'asc' } },
      }),
      prisma.reservation.findMany({
        where: {
          checkOutDate: { gte: todayStart, lte: todayEnd },
          status: 'checked_in',
        },
        include: { room: ROOM_SEL },
        orderBy: { room: { name: 'asc' } },
      }),
      // Future expected arrivals/departures + guests currently in house.
      prisma.reservation.count({ where: { checkInDate: { gt: todayEnd }, status: { in: ['confirmed', 'pending'] } } }),
      prisma.reservation.count({ where: { checkOutDate: { gt: todayEnd }, status: { in: ['confirmed', 'pending', 'checked_in'] } } }),
      prisma.reservation.count({ where: { status: 'checked_in' } }),
    ]);

    return NextResponse.json({ ok: true, arrivals, departures, upcomingArrivals, upcomingDepartures, inHouse });
  }

  return NextResponse.json(
    { ok: false, message: 'code veya today parametresi gerekli.' },
    { status: 400 },
  );
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth) return NextResponse.json({ ok: false }, { status: 401 });

  if (!['admin', 'personel'].includes(auth.user.roleSlug)) {
    return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const { confirmationId, action, vehiclePlate, checkinNote, sendToCleaning: sendToCleaningRaw, checkoutNote } = body ?? {};
  const sendToCleaning = sendToCleaningRaw !== false; // default true

  if (!confirmationId || !['checkin', 'checkout'].includes(action)) {
    return NextResponse.json({ ok: false, message: 'Geçersiz istek.' }, { status: 400 });
  }

  const reservation = await prisma.reservation.findUnique({
    where: { confirmationId },
  });
  if (!reservation) {
    return NextResponse.json(
      { ok: false, message: 'Rezervasyon bulunamadı.' },
      { status: 404 },
    );
  }

  if (action === 'checkin' && !['pending', 'confirmed'].includes(reservation.status)) {
    return NextResponse.json(
      { ok: false, message: 'Bu rezervasyon için check-in yapılamaz.' },
      { status: 409 },
    );
  }

  if (action === 'checkin') {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const ci = reservation.checkInDate;
    const checkInStr = `${ci.getFullYear()}-${String(ci.getMonth()+1).padStart(2,'0')}-${String(ci.getDate()).padStart(2,'0')}`;
    if (checkInStr > todayStr) {
      return NextResponse.json(
        { ok: false, message: `Giriş tarihi henüz gelmedi. Rezervasyon giriş tarihi: ${ci.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}.` },
        { status: 409 },
      );
    }
  }
  if (action === 'checkout' && reservation.status !== 'checked_in') {
    return NextResponse.json(
      { ok: false, message: 'Check-out için önce check-in yapılmalı.' },
      { status: 409 },
    );
  }

  // Identity-notification gate: every staying guest (beyond the lead) must be
  // recorded before check-in. Adults need an ID, children need a birth date.
  if (action === 'checkin') {
    const requiredAdults = Math.max(reservation.adultsCount - 1, 0);
    const requiredChildren = reservation.childrenCount;
    if (requiredAdults + requiredChildren > 0) {
      const guests = await prisma.reservationGuest.findMany({ where: { reservationId: reservation.id } });
      const adults = guests.filter(g => !g.isChild);
      const children = guests.filter(g => g.isChild);
      const adultsOk = adults.length >= requiredAdults
        && adults.every(g => g.firstName && g.lastName && (g.tcKimlikNo || g.passportNo));
      const childrenOk = children.length >= requiredChildren
        && children.every(g => g.firstName && g.lastName && g.birthDate);
      if (!adultsOk || !childrenOk) {
        return NextResponse.json(
          { ok: false, code: 'GUESTS_INCOMPLETE', message: 'Tüm misafirlerin bilgileri girilmeden check-in yapılamaz.' },
          { status: 409 },
        );
      }
    }
  }

  if (action === 'checkin') {
    try {
      const updated = await prisma.$transaction(async (tx) => {
        const roomUpdate = await tx.room.updateMany({
          where: {
            id: reservation.roomId,
            status: 'available',
          },
          data: {
            status: 'occupied',
          },
        });

        if (roomUpdate.count !== 1) {
          const room = await tx.room.findUnique({
            where: { id: reservation.roomId },
            select: { status: true },
          });
          throw new RoomStatusConflictError(room?.status);
        }

        return tx.reservation.update({
          where: { confirmationId },
          data: {
            status: 'checked_in',
            ...(vehiclePlate       !== undefined ? { vehiclePlate }       : {}),
            ...(checkinNote        !== undefined ? { checkinNote }        : {}),
          },
          include: { room: ROOM_SEL },
        });
      });

      // Send check-in welcome email (fire-and-forget)
      try {
        let sendCheckinEmail = true;
        if (updated.userId) {
          const userPrefs = await prisma.user.findUnique({
            where: { id: updated.userId },
            select: { notifyCheckinEmail: true },
          });
          sendCheckinEmail = userPrefs?.notifyCheckinEmail !== false;
        }

        if (sendCheckinEmail) {
          const coSetting = await prisma.systemSetting.findUnique({ where: { key: 'check_out_time' } });
          const { html, text } = renderCheckinEmail({
            firstName:    updated.firstName,
            roomName:     updated.room.name,
            checkOutDate: updated.checkOutDate.toISOString().split('T')[0],
            checkOutTime: coSetting?.value ?? '12:00',
            confirmationId: updated.confirmationId,
          });
          sendMail({
            to: updated.email,
            subject: `Hoş Geldiniz — ${updated.room.name}`,
            html,
            text,
          }).catch(console.error);
        }
      } catch (mailError) {
        console.error('Check-in email send failed.', mailError);
      }

      await writeAuditLog({
        request,
        auth,
        action: 'reservation.checkin',
        entityType: 'reservation',
        entityId: updated.id,
        summary: `Check-in yapıldı: #${updated.confirmationId}`,
        before: { status: reservation.status, roomId: reservation.roomId },
        after: { status: updated.status, roomId: updated.room.id, roomStatus: updated.room.status },
      });

      // KBS giriş bildirimi — yanıtı bloklamaz, sonuç KbsBildirim'de izlenir.
      after(() =>
        dispatchKbsGiris(updated.id).catch((error) =>
          console.error('KBS giriş bildirimi hatası:', error),
        ),
      );

      return NextResponse.json({ ok: true, reservation: updated });
    } catch (error) {
      if (error instanceof RoomStatusConflictError) {
        return NextResponse.json(
          {
            ok: false,
            message: `Oda şu anda check-in için uygun değil. Mevcut durum: ${error.status ?? 'bilinmiyor'}.`,
          },
          { status: 409 },
        );
      }

      throw error;
    }
  }

  // checkout — atomically update room status and optionally create a cleaning task
  const loyaltyOn = await isLoyaltyEnabled();
  const updated = await prisma.$transaction(async (tx) => {
    // Sent to cleaning → room becomes "dirty" (queued in the shared pool, not yet
    // claimed). Otherwise it goes straight back to available.
    await tx.room.update({
      where: { id: reservation.roomId },
      data: { status: sendToCleaning ? 'dirty' : 'available' },
    });

    if (sendToCleaning) {
      // Idempotent: don't queue a second task if the room already has an active one.
      const existingActive = await tx.cleaningTask.findFirst({
        where: { roomId: reservation.roomId, status: { not: 'done' } },
        select: { id: true },
      });
      if (!existingActive) {
        await tx.cleaningTask.create({
          data: {
            roomId: reservation.roomId,
            reportedById: auth.user.id,
            assignedToId: null,
            status: 'pending',
            priority: 'normal',
            notes: checkoutNote ?? 'Check-out sonrası temizlik (havuza eklendi).',
          },
        });
      }
    }

    const updatedRes = await tx.reservation.update({
      where: { confirmationId },
      data: { status: 'checked_out' },
      include: { room: ROOM_SEL },
    });

    // Loyalty points for the completed stay (only while the program is enabled).
    if (loyaltyOn && reservation.userId) {
      await awardCheckoutPoints(tx, reservation.userId, reservation.id, updatedRes.totalPrice);
    }

    return updatedRes;
  });

  await writeAuditLog({
    request,
    auth,
    action: 'reservation.checkout',
    entityType: 'reservation',
    entityId: updated.id,
    summary: `Check-out yapıldı: #${updated.confirmationId}`,
    before: { status: reservation.status, roomId: reservation.roomId },
    after: {
      status: updated.status,
      roomId: updated.room.id,
      roomStatus: updated.room.status,
      sendToCleaning,
    },
  });

  // Send review request only to registered customer accounts (fire-and-forget).
  try {
    const customer = updated.userId
      ? await prisma.user.findFirst({
          where: { id: updated.userId, isActive: true, role: { slug: 'musteri' } },
          select: { id: true, email: true, firstName: true },
        })
      : await prisma.user.findFirst({
          where: { email: updated.email, isActive: true, role: { slug: 'musteri' } },
          select: { id: true, email: true, firstName: true },
        });

    if (customer) {
      const existingReview = await prisma.hotelReview.findUnique({
        where: { reservationId: updated.id },
        select: { id: true },
      });

      if (!existingReview) {
        const reviewUrl = new URL('/musteri', getAppUrl(request));
        reviewUrl.searchParams.set('tab', 'reviews');
        reviewUrl.searchParams.set('reservation', updated.confirmationId);

        const { html, text } = renderReviewRequestEmail({
          firstName: customer.firstName || updated.firstName,
          roomName: updated.room.name,
          confirmationId: updated.confirmationId,
          reviewUrl: reviewUrl.toString(),
        });

        sendMail({
          to: customer.email,
          subject: 'Konaklamanızı değerlendirin',
          html,
          text,
        }).catch(console.error);
      }
    }
  } catch (mailError) {
    console.error('Review request email send failed.', mailError);
  }

  // KBS çıkış bildirimi — yanıtı bloklamaz, sonuç KbsBildirim'de izlenir.
  after(() =>
    dispatchKbsCikis(updated.id).catch((error) =>
      console.error('KBS çıkış bildirimi hatası:', error),
    ),
  );

  return NextResponse.json({ ok: true, reservation: updated });
}
