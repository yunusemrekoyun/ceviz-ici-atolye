import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  try {
    const user   = await requireUser();
    const { id } = await ctx.params;
    const member = await prisma.member.findUnique({ where: { userId: user.sub } });
    if (!member) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });

    const booking = await prisma.classBooking.findUnique({
      where: { classId_memberId: { classId: id, memberId: member.id } },
    });
    if (!booking || booking.status === "CANCELLED") {
      return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
    }

    const wasConfirmed = booking.status === "CONFIRMED";

    const updated = await prisma.classBooking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    // Onaylı bir yer boşaldıysa bekleme listesindeki en eski üyeyi terfi ettir
    if (wasConfirmed) {
      const next = await prisma.classBooking.findFirst({
        where: { classId: id, status: "WAITLIST" },
        orderBy: { bookedAt: "asc" },
        include: {
          member: { select: { userId: true } },
          class: { select: { title: true, startAt: true } },
        },
      });
      if (next) {
        await prisma.classBooking.update({ where: { id: next.id }, data: { status: "CONFIRMED" } });
        await prisma.notification.create({
          data: {
            userId: next.member.userId,
            title: "Ders yerin onaylandı",
            body: `"${next.class.title}" dersinde bekleme listesinden yerin açıldı ve kaydın onaylandı.`,
            type: "success",
          },
        });
      }
    }

    return NextResponse.json({ booking: updated });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
