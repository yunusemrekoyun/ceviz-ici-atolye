import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/mail';
import { renderReservationEmail } from '@/lib/mail/hotel-templates';

export async function sendReservationConfirmationEmail(reservationId: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      room: { select: { name: true } },
      user: { select: { notifyReservationEmail: true } },
    },
  });

  if (!reservation) return;

  if (reservation.user?.notifyReservationEmail === false) return;

  const [ciSetting, coSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: 'check_in_time' } }),
    prisma.systemSetting.findUnique({ where: { key: 'check_out_time' } }),
  ]);

  const { html, text, attachments } = await renderReservationEmail({
    firstName: reservation.firstName,
    lastName: reservation.lastName,
    email: reservation.email,
    confirmationId: reservation.confirmationId,
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
    specialRequests: reservation.specialRequests,
  });

  await sendMail({
    to: reservation.email,
    subject: `Rezervasyon Onayı #${reservation.confirmationId}`,
    html,
    text,
    attachments,
  });
}
