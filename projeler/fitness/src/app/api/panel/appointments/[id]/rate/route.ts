import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { rating, comment } = await req.json();

    const score = Number(rating);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return NextResponse.json({ error: "Puan 1 ile 5 arasında olmalı" }, { status: 400 });
    }

    const member = await prisma.member.findUnique({ where: { userId: user.sub } });
    if (!member) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });

    const appt = await prisma.appointment.findUnique({ where: { id } });
    if (!appt || appt.memberId !== member.id) {
      return NextResponse.json({ error: "Randevu bulunamadı" }, { status: 404 });
    }
    if (appt.status !== "COMPLETED") {
      return NextResponse.json({ error: "Sadece tamamlanmış seanslar puanlanabilir" }, { status: 400 });
    }
    if (appt.rating != null) {
      return NextResponse.json({ error: "Bu seansı zaten puanladın" }, { status: 400 });
    }

    await prisma.appointment.update({
      where: { id },
      data: {
        rating: score,
        ratingComment: typeof comment === "string" && comment.trim() ? comment.trim().slice(0, 500) : null,
        ratedAt: new Date(),
      },
    });

    // Eğitmenin görünen puanı gerçek seans puanlarının ortalamasından beslenir.
    const agg = await prisma.appointment.aggregate({
      where: { trainerId: appt.trainerId, rating: { not: null } },
      _avg: { rating: true },
    });
    if (agg._avg.rating != null) {
      await prisma.trainer.update({
        where: { id: appt.trainerId },
        data: { rating: Math.round(agg._avg.rating * 10) / 10 },
      });
    }

    return NextResponse.json({ ok: true, rating: score });
  } catch (e) {
    console.error("[panel/appointments/rate]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
