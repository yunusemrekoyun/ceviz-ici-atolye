import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  try {
    const user     = await requireUser();
    const { id }   = await ctx.params;
    const member   = await prisma.member.findUnique({ where: { userId: user.sub } });
    if (!member) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });

    const cls = await prisma.groupClass.findUnique({
      where: { id },
      include: { _count: { select: { bookings: { where: { status: "CONFIRMED" } } } } },
    });
    if (!cls || !cls.isPublished || cls.status !== "SCHEDULED") {
      return NextResponse.json({ error: "Ders bulunamadı veya kayıt kapalı" }, { status: 404 });
    }

    // Aktif üyelik kontrolü
    const activeMembership = await prisma.membership.findFirst({
      where: { memberId: member.id, isActive: true, endDate: { gt: new Date() } },
    });
    if (!activeMembership) {
      return NextResponse.json({ error: "Aktif üyeliğin bulunmuyor" }, { status: 403 });
    }

    // Kontenjan doluysa bekleme listesine al, değilse onayla
    const target = cls._count.bookings >= cls.capacity ? "WAITLIST" : "CONFIRMED";

    // Mevcut kayıt var mı?
    const existing = await prisma.classBooking.findUnique({
      where: { classId_memberId: { classId: id, memberId: member.id } },
    });

    if (existing) {
      if (existing.status === "CANCELLED") {
        // İptal edilmişse mevcut duruma göre yeniden aktifleştir
        const updated = await prisma.classBooking.update({
          where: { id: existing.id },
          data: { status: target, cancelledAt: null },
        });
        return NextResponse.json({ booking: updated, waitlisted: target === "WAITLIST" });
      }
      return NextResponse.json({ error: "Bu derse zaten kayıtlısın" }, { status: 409 });
    }

    const booking = await prisma.classBooking.create({
      data: { classId: id, memberId: member.id, status: target },
    });

    return NextResponse.json({ booking, waitlisted: target === "WAITLIST" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
