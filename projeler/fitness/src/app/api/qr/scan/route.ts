import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const bookingInclude = {
  member: {
    include: {
      user: { select: { name: true, email: true, avatarUrl: true, phone: true } },
      memberships: { where: { isActive: true }, include: { plan: true }, take: 1 },
    },
  },
  class: {
    include: { trainer: { include: { user: { select: { name: true } } } } },
  },
} as const;

type BookingWithIncludes = Awaited<ReturnType<typeof fetchBooking>>;

async function fetchBooking(code: string) {
  return prisma.classBooking.findUnique({ where: { ticketCode: code }, include: bookingInclude });
}

function serializeBooking(b: NonNullable<BookingWithIncludes>) {
  return {
    id: b.id,
    ticketCode: b.ticketCode,
    usedAt: b.usedAt?.toISOString() ?? null,
    bookedAt: b.bookedAt.toISOString(),
    status: b.status,
    member: {
      id: b.member.id,
      memberNo: b.member.memberNo,
      name: b.member.user.name,
      email: b.member.user.email,
      phone: b.member.user.phone ?? null,
      avatarUrl: b.member.user.avatarUrl ?? null,
      hasActiveMembership: b.member.memberships.length > 0,
    },
    lesson: {
      id: b.class.id,
      title: b.class.title,
      startAt: b.class.startAt.toISOString(),
      durationMin: b.class.durationMin,
      location: b.class.location ?? null,
      trainerName: b.class.trainer?.user.name ?? null,
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["ADMIN", "STAFF", "TRAINER"]);
    const { code, confirm } = await req.json() as { code: string; confirm?: boolean };
    if (!code) return NextResponse.json({ error: "Kod gerekli" }, { status: 400 });

    // --- Ders bileti QR'ı mı? ---
    const booking = await fetchBooking(code);

    if (booking) {
      if (booking.status === "CANCELLED" || booking.class.status === "CANCELLED") {
        return NextResponse.json({ type: "lesson", status: "cancelled", booking: serializeBooking(booking) });
      }

      // Zaman kontrolü: dersten 1 saat öncesine kadar kabul etme
      const lessonStart  = new Date(booking.class.startAt);
      const opensAt      = new Date(lessonStart.getTime() - 60 * 60 * 1000);
      if (new Date() < opensAt) {
        return NextResponse.json({
          type: "lesson",
          status: "too_early",
          booking: serializeBooking(booking),
          opensAt: opensAt.toISOString(),
        });
      }

      // Daha önce kullanıldıysa uyarı göster — confirm=true ile override edilebilir
      if (booking.usedAt && !confirm) {
        return NextResponse.json({
          type: "lesson",
          status: "already_used",
          booking: serializeBooking(booking),
          usedAt: booking.usedAt.toISOString(),
        });
      }

      // İlk giriş veya onaylı tekrar giriş
      await prisma.classBooking.update({ where: { id: booking.id }, data: { usedAt: new Date() } });
      return NextResponse.json({ type: "lesson", status: "ok", booking: serializeBooking(booking) });
    }

    // --- Üyelik QR'ı mı? ---
    const member = await prisma.member.findUnique({
      where: { qrCode: code },
      include: {
        user: { select: { name: true, email: true, avatarUrl: true, phone: true } },
        memberships: {
          where: { isActive: true },
          include: { plan: true },
          take: 1,
          orderBy: { endDate: "desc" },
        },
      },
    });

    if (!member) return NextResponse.json({ type: "not_found" });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    const todayAttendance = await prisma.attendance.findFirst({
      where: { memberId: member.id, checkIn: { gte: todayStart, lte: todayEnd } },
      orderBy: { checkIn: "desc" },
    });

    const activeMembership = member.memberships[0] ?? null;
    const hasActive = !!activeMembership && activeMembership.endDate > new Date();

    // İlk kez bugün giriyorsa veya confirm ile tekrar giriş → kayıt
    if (confirm || (!todayAttendance && hasActive)) {
      await prisma.attendance.create({ data: { memberId: member.id, source: "QR" } });
    }

    return NextResponse.json({
      type: "membership",
      status: hasActive ? "active" : "expired",
      todayAlreadyCheckedIn: !!todayAttendance,
      member: {
        id: member.id,
        memberNo: member.memberNo,
        name: member.user.name,
        email: member.user.email,
        phone: member.user.phone ?? null,
        avatarUrl: member.user.avatarUrl ?? null,
        activePlan: activeMembership
          ? { name: activeMembership.plan.name, endDate: activeMembership.endDate.toISOString() }
          : null,
      },
    });
  } catch (e) {
    console.error("[qr/scan]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
