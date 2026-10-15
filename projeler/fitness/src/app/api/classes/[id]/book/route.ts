import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { checkPanelAccess } from "@/lib/membership";

type Ctx = { params: Promise<{ id: string }> };

// POST — üye derse kayıt ol
export async function POST(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id: classId } = await ctx.params;

    const access = await checkPanelAccess(user.sub);
    if (!access.ok) {
      return NextResponse.json({ error: "Derse kayıt olmak için aktif üyelik gerekli" }, { status: 403 });
    }

    const member = await prisma.member.findUnique({ where: { userId: user.sub } });
    if (!member) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });

    const groupClass = await prisma.groupClass.findUnique({
      where: { id: classId },
      include: { _count: { select: { bookings: { where: { status: "CONFIRMED" } } } } },
    });

    if (!groupClass) return NextResponse.json({ error: "Ders bulunamadı" }, { status: 404 });
    if (groupClass.status === "CANCELLED") {
      return NextResponse.json({ error: "Bu ders iptal edildi" }, { status: 400 });
    }
    if (groupClass.startAt < new Date()) {
      return NextResponse.json({ error: "Ders başlamış veya geçmiş" }, { status: 400 });
    }

    const existing = await prisma.classBooking.findUnique({
      where: { classId_memberId: { classId, memberId: member.id } },
    });

    if (existing) {
      if (existing.status === "CANCELLED") {
        // Yeniden aktive et
        const confirmedCount = groupClass._count.bookings;
        const status = confirmedCount < groupClass.capacity ? "CONFIRMED" : "WAITLIST";
        const updated = await prisma.classBooking.update({
          where: { id: existing.id },
          data: { status, cancelledAt: null },
        });
        return NextResponse.json(updated);
      }
      return NextResponse.json({ error: "Bu derse zaten kayıtlısın" }, { status: 409 });
    }

    const confirmedCount = groupClass._count.bookings;
    const status = confirmedCount < groupClass.capacity ? "CONFIRMED" : "WAITLIST";

    const booking = await prisma.classBooking.create({
      data: { classId, memberId: member.id, status },
    });

    return NextResponse.json({ ...booking, waitlist: status === "WAITLIST" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// DELETE — üye ders rezervasyonunu iptal et
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id: classId } = await ctx.params;

    const member = await prisma.member.findUnique({ where: { userId: user.sub } });
    if (!member) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });

    const booking = await prisma.classBooking.findUnique({
      where: { classId_memberId: { classId, memberId: member.id } },
    });

    if (!booking || booking.status === "CANCELLED") {
      return NextResponse.json({ error: "Aktif rezervasyon bulunamadı" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.classBooking.update({
        where: { id: booking.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });

      // Bekleme listesindeki ilk kişiyi onayla
      if (booking.status === "CONFIRMED") {
        const firstWaiting = await tx.classBooking.findFirst({
          where: { classId, status: "WAITLIST" },
          orderBy: { bookedAt: "asc" },
        });
        if (firstWaiting) {
          await tx.classBooking.update({
            where: { id: firstWaiting.id },
            data: { status: "CONFIRMED" },
          });
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
