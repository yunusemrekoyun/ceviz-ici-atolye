import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// Üye — yayınlanmış gelecek dersleri listele (kendi kayıt durumu dahil)
export async function GET() {
  try {
    const user   = await requireUser();
    const member = await prisma.member.findUnique({ where: { userId: user.sub } });
    if (!member) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });

    const now = new Date();
    const classes = await prisma.groupClass.findMany({
      where: { isPublished: true, status: "SCHEDULED", startAt: { gte: now } },
      include: {
        trainer: { include: { user: { select: { name: true } } } },
        _count:  { select: { bookings: { where: { status: "CONFIRMED" } } } },
        bookings: { where: { memberId: member.id }, take: 1 },
      },
      orderBy: { startAt: "asc" },
    });

    return NextResponse.json(
      classes.map((c) => ({
        id:           c.id,
        title:        c.title,
        description:  c.description,
        location:     c.location,
        capacity:     c.capacity,
        durationMin:  c.durationMin,
        color:        c.color,
        startAt:      c.startAt.toISOString(),
        trainerName:  c.trainer?.user.name ?? null,
        confirmedCount: c._count.bookings,
        myBooking: c.bookings[0]
          ? { id: c.bookings[0].id, status: c.bookings[0].status, ticketCode: c.bookings[0].ticketCode }
          : null,
      }))
    );
  } catch {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
}
