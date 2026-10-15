import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { prisma, type PrismaTransactionClient } from '@/lib/prisma';
import { maskPassport, maskTcKimlik } from '@/lib/pii';
import { sendMail } from '@/lib/mail';
import { renderReservationEmail } from '@/lib/mail/hotel-templates';
import { writeAuditLog } from '@/lib/audit';
import {
  findAvailableRoomForRoomType,
  getRoomAvailability,
  nightsBetween,
  parseDateOnly,
} from '@/lib/reservations/availability';

export const runtime = 'nodejs';

const reservationSchema = z.object({
  roomId: z.string().min(1).optional(),
  roomTypeId: z.string().min(1).optional(),
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
});

export async function POST(request: NextRequest) {
  const parsed = reservationSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: 'Rezervasyon bilgileri geçersiz.', errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  const isStaff = auth?.user.roleSlug === 'admin' || auth?.user.roleSlug === 'personel';

  if (!isStaff) {
    return NextResponse.json(
      { ok: false, message: 'Public rezervasyonlar güvenli ödeme akışı üzerinden tamamlanmalıdır.' },
      { status: 403 },
    );
  }

  if (data.roomId && !isStaff) {
    return NextResponse.json(
      { ok: false, message: 'Public rezervasyon için oda tipi seçimi gereklidir.' },
      { status: 400 },
    );
  }

  if (!data.roomId && !data.roomTypeId) {
    return NextResponse.json(
      { ok: false, message: 'Oda tipi seçimi zorunludur.' },
      { status: 400 },
    );
  }

  const checkIn = parseDateOnly(data.checkInDate);
  const checkOut = parseDateOnly(data.checkOutDate);

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || checkOut <= checkIn) {
    return NextResponse.json(
      { ok: false, message: 'Geçersiz tarih aralığı.' },
      { status: 400 },
    );
  }

  const nights = nightsBetween(checkIn, checkOut);

  async function createConfirmationId(tx: PrismaTransactionClient) {
    for (let i = 0; i < 8; i += 1) {
      const confirmationId = Math.floor(10000000 + Math.random() * 90000000).toString();
      const exists = await tx.reservation.findUnique({ where: { confirmationId }, select: { id: true } });
      if (!exists) return confirmationId;
    }
    return `R${Date.now().toString(36).toUpperCase()}`.slice(0, 16);
  }

  try {
    const reservation = await prisma.$transaction(async (tx) => {
      const chosenRoom = data.roomId
        ? (await getRoomAvailability(tx, data.roomId, checkIn, checkOut)).available
          ? await tx.room.findUnique({
              where: { id: data.roomId },
              select: { id: true, name: true, basePrice: true },
            })
          : null
        : await findAvailableRoomForRoomType(tx, {
            roomTypeId: data.roomTypeId!,
            checkIn,
            checkOut,
            adultsCount: data.adultsCount,
            childrenCount: data.childrenCount,
          });

      if (!chosenRoom) throw new Error('ROOM_NOT_AVAILABLE');

      const subtotal = chosenRoom.basePrice * nights;
      const confirmationId = await createConfirmationId(tx);

      return tx.reservation.create({
        data: {
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
          totalPrice: subtotal,
          userId: auth?.user.roleSlug === 'musteri' ? auth.user.id : undefined,
        },
        include: {
          room: { select: { id: true, name: true, basePrice: true } },
        },
      });
    });

    // Send reservation confirmation email (fire-and-forget)
    try {
      let sendReservationEmail = true;
      if (auth?.user.id) {
        const userPrefs = await prisma.user.findUnique({
          where: { id: auth.user.id },
          select: { notifyReservationEmail: true },
        });
        sendReservationEmail = userPrefs?.notifyReservationEmail !== false;
      }

      if (sendReservationEmail) {
      const [ciSetting, coSetting] = await Promise.all([
        prisma.systemSetting.findUnique({ where: { key: 'check_in_time' } }),
        prisma.systemSetting.findUnique({ where: { key: 'check_out_time' } }),
      ]);
      const { html, text, attachments } = await renderReservationEmail({
        firstName:      data.firstName,
        lastName:       data.lastName,
        email:          data.email,
        confirmationId: reservation.confirmationId,
        roomName:       reservation.room.name,
        checkInDate:    reservation.checkInDate.toISOString().split('T')[0],
        checkOutDate:   reservation.checkOutDate.toISOString().split('T')[0],
        nights:         reservation.nights,
        adultsCount:    reservation.adultsCount,
        childrenCount:  reservation.childrenCount,
        checkInTime:    ciSetting?.value ?? '14:00',
        checkOutTime:   coSetting?.value ?? '12:00',
        subtotal:       reservation.subtotal,
        totalPrice:     reservation.totalPrice,
        specialRequests: data.specialRequests,
      });
      sendMail({
        to: data.email,
        subject: `Rezervasyon Onayı #${reservation.confirmationId}`,
        html,
        text,
        attachments,
      }).catch(console.error);
      } // end sendReservationEmail
    } catch (mailError) {
      console.error('Reservation email send failed.', mailError);
    }

    await writeAuditLog({
      request,
      auth,
      action: 'reservation.create',
      entityType: 'reservation',
      entityId: reservation.id,
      summary: `Rezervasyon oluşturuldu: #${reservation.confirmationId}`,
      after: {
        confirmationId: reservation.confirmationId,
        roomId: reservation.room.id,
        status: reservation.status,
        checkInDate: reservation.checkInDate.toISOString(),
        checkOutDate: reservation.checkOutDate.toISOString(),
        totalPrice: reservation.totalPrice,
      },
    });

    return NextResponse.json({
      ok: true,
      confirmationId: reservation.confirmationId,
      reservation: {
        id: reservation.id,
        confirmationId: reservation.confirmationId,
        roomName: reservation.room.name,
        checkInDate: reservation.checkInDate.toISOString().split('T')[0],
        checkOutDate: reservation.checkOutDate.toISOString().split('T')[0],
        nights: reservation.nights,
        adultsCount: reservation.adultsCount,
        childrenCount: reservation.childrenCount,
        subtotal: reservation.subtotal,
        totalPrice: reservation.totalPrice,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'ROOM_NOT_AVAILABLE') {
      return NextResponse.json(
        { ok: false, message: 'Seçilen tarihler için uygun oda bulunamadı.' },
        { status: 409 },
      );
    }

    console.error('Reservation creation failed.', error);
    return NextResponse.json(
      { ok: false, message: 'Rezervasyon kaydedilemedi.' },
      { status: 503 },
    );
  }
}

export async function GET(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth) {
    return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 401 });
  }

  try {
    const where = auth.user.roleSlug === 'admin' || auth.user.roleSlug === 'personel'
      ? {}
      : { OR: [{ userId: auth.user.id }, { email: auth.user.email }] };

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        room: { select: { id: true, name: true, roomType: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Data minimization: staff view this list in bulk and the UI does not render
    // identity numbers, so mask them in the payload. Customers viewing their own
    // reservations still receive the full value (own data).
    const isStaffViewer = auth.user.roleSlug === 'admin' || auth.user.roleSlug === 'personel';
    const payload = isStaffViewer
      ? reservations.map((r) => ({
          ...r,
          tcKimlikNo: maskTcKimlik(r.tcKimlikNo),
          passportNo: maskPassport(r.passportNo),
        }))
      : reservations;

    return NextResponse.json({ ok: true, reservations: payload });
  } catch (error) {
    console.error('Reservations fetch failed.', error);
    return NextResponse.json({ ok: false, message: 'Rezervasyonlar alınamadı.' }, { status: 503 });
  }
}
