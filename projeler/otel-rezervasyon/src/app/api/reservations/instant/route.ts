import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/mail';
import { renderCheckinEmail, renderReservationEmail } from '@/lib/mail/hotel-templates';
import { writeAuditLog } from '@/lib/audit';
import { getRoomAvailability } from '@/lib/reservations/availability';

export const runtime = 'nodejs';

const instantReservationSchema = z.object({
  roomId: z.string().min(1),
  checkInDate: z.string().min(1),
  checkOutDate: z.string().min(1),
  adultsCount: z.coerce.number().int().min(1).max(10),
  childrenCount: z.coerce.number().int().min(0).max(10),
  firstName: z.string().min(1).max(100).transform(v => v.trim()),
  lastName: z.string().min(1).max(100).transform(v => v.trim()),
  email: z.string().email().max(254).transform(v => v.trim().toLowerCase()),
  phone: z.string().min(1).max(30).transform(v => v.trim()),
  nationality: z.string().optional().default('TR'),
  tcKimlikNo: z.string().optional(),
  specialRequests: z.string().max(1000).optional(),
  checkInNow: z.boolean().optional().default(true),
});

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function toDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

async function createConfirmationId() {
  for (let i = 0; i < 8; i += 1) {
    const confirmationId = Math.floor(10000000 + Math.random() * 90000000).toString();
    const exists = await prisma.reservation.findUnique({
      where: { confirmationId },
      select: { id: true },
    });

    if (!exists) return confirmationId;
  }

  return `W${Date.now().toString(36).toUpperCase()}`.slice(0, 16);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth || !['admin', 'personel'].includes(auth.user.roleSlug)) {
    return NextResponse.json({ ok: false, message: 'Yetkisiz erişim.' }, { status: 403 });
  }

  const parsed = instantReservationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: 'Rezervasyon bilgileri geçersiz.', errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const checkIn = parseDateOnly(data.checkInDate);
  const checkOut = parseDateOnly(data.checkOutDate);

  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) || checkOut <= checkIn) {
    return NextResponse.json({ ok: false, message: 'Geçersiz tarih aralığı.' }, { status: 400 });
  }

  const today = new Date();
  const todayKey = toDateKey(today);
  const checkInKey = toDateKey(checkIn);
  const checkOutKey = toDateKey(checkOut);

  if (data.checkInNow && checkInKey !== todayKey) {
    return NextResponse.json(
      { ok: false, message: 'Hemen giriş için giriş tarihi bugün olmalı.' },
      { status: 400 },
    );
  }

  if (data.checkInNow && checkOutKey <= todayKey) {
    return NextResponse.json(
      { ok: false, message: 'Çıkış tarihi bugünden sonra olmalı.' },
      { status: 400 },
    );
  }

  const room = await prisma.room.findUnique({
    where: { id: data.roomId },
    include: { roomType: { select: { name: true } } },
  });

  if (!room || !room.isActive) {
    return NextResponse.json({ ok: false, message: 'Seçilen oda bulunamadı.' }, { status: 404 });
  }

  if (data.checkInNow && room.status !== 'available') {
    return NextResponse.json(
      { ok: false, message: 'Bu oda şu anda hızlı giriş için müsait değil.' },
      { status: 409 },
    );
  }

  const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  const subtotal = room.basePrice * nights;
  const totalPrice = subtotal;
  const confirmationId = await createConfirmationId();

  const linkedUser = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true, role: { select: { slug: true } } },
  });
  const linkedUserId = linkedUser?.role.slug === 'musteri' ? linkedUser.id : undefined;

  try {
    const reservation = await prisma.$transaction(async (tx) => {
      const availability = await getRoomAvailability(tx, room.id, checkIn, checkOut);
      if (!availability.available) {
        throw new Error('ROOM_NOT_AVAILABLE');
      }

      if (data.checkInNow) {
        const update = await tx.room.updateMany({
          where: { id: room.id, status: 'available' },
          data: { status: 'occupied' },
        });

        if (update.count !== 1) {
          throw new Error('ROOM_NOT_AVAILABLE');
        }
      }

      return tx.reservation.create({
        data: {
          confirmationId,
          roomId: room.id,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          nights,
          adultsCount: data.adultsCount,
          childrenCount: data.childrenCount,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          nationality: data.nationality,
          tcKimlikNo: data.tcKimlikNo || undefined,
          specialRequests: data.specialRequests || undefined,
          subtotal,
          totalPrice,
          status: data.checkInNow ? 'checked_in' : 'confirmed',
          checkinNote: data.checkInNow
            ? `Hızlı rezervasyon ile giriş alındı. İşlemi yapan: ${auth.user.email}`
            : undefined,
          userId: linkedUserId,
        },
        include: {
          room: { select: { id: true, name: true, basePrice: true } },
        },
      });
    });

    await writeAuditLog({
      request,
      auth,
      action: data.checkInNow ? 'reservation.instant_checkin' : 'reservation.instant_create',
      entityType: 'reservation',
      entityId: reservation.id,
      summary: data.checkInNow
        ? `Hızlı rezervasyon ve check-in oluşturuldu: #${reservation.confirmationId}`
        : `Hızlı rezervasyon oluşturuldu: #${reservation.confirmationId}`,
      after: {
        confirmationId: reservation.confirmationId,
        roomId: reservation.room.id,
        status: reservation.status,
        checkInDate: reservation.checkInDate.toISOString(),
        checkOutDate: reservation.checkOutDate.toISOString(),
      },
    });

    try {
      const [ciSetting, coSetting] = await Promise.all([
        prisma.systemSetting.findUnique({ where: { key: 'check_in_time' } }),
        prisma.systemSetting.findUnique({ where: { key: 'check_out_time' } }),
      ]);
      const { html, text, attachments } = await renderReservationEmail({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        confirmationId,
        roomName: reservation.room.name,
        checkInDate: reservation.checkInDate.toISOString().split('T')[0],
        checkOutDate: reservation.checkOutDate.toISOString().split('T')[0],
        nights: reservation.nights,
        adultsCount: reservation.adultsCount,
        childrenCount: reservation.childrenCount,
        checkInTime: ciSetting?.value ?? '14:00',
        checkOutTime: coSetting?.value ?? '12:00',
        subtotal: reservation.subtotal,
        totalPrice: reservation.totalPrice,
        specialRequests: data.specialRequests,
      });

      sendMail({
        to: data.email,
        subject: `Rezervasyon Onayı #${confirmationId}`,
        html,
        text,
        attachments,
      }).catch(console.error);

      if (data.checkInNow) {
        const welcome = renderCheckinEmail({
          firstName: data.firstName,
          roomName: reservation.room.name,
          checkOutDate: reservation.checkOutDate.toISOString().split('T')[0],
          checkOutTime: coSetting?.value ?? '12:00',
          confirmationId,
        });
        sendMail({
          to: data.email,
          subject: `Hoş Geldiniz — ${reservation.room.name}`,
          html: welcome.html,
          text: welcome.text,
        }).catch(console.error);
      }
    } catch (mailError) {
      console.error('Instant reservation mail send failed.', mailError);
    }

    return NextResponse.json({
      ok: true,
      confirmationId,
      roomStatus: data.checkInNow ? 'occupied' : room.status,
      reservation: {
        id: reservation.id,
        confirmationId: reservation.confirmationId,
        roomName: reservation.room.name,
        status: reservation.status,
        checkInDate: reservation.checkInDate.toISOString().split('T')[0],
        checkOutDate: reservation.checkOutDate.toISOString().split('T')[0],
        nights: reservation.nights,
        totalPrice: reservation.totalPrice,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'ROOM_NOT_AVAILABLE') {
      return NextResponse.json(
        { ok: false, message: 'Seçilen tarihler için bu oda müsait değil.' },
        { status: 409 },
      );
    }

    console.error('Instant reservation failed.', error);
    return NextResponse.json(
      { ok: false, message: 'Hızlı rezervasyon oluşturulamadı.' },
      { status: 503 },
    );
  }
}
