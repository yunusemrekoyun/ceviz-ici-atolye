import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;

    const member = await prisma.member.findUnique({ where: { userId: user.sub } });
    if (!member) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { trainer: { select: { userId: true } } },
    });
    if (!appointment) return NextResponse.json({ error: "Randevu bulunamadı" }, { status: 404 });
    if (appointment.memberId !== member.id) {
      return NextResponse.json({ error: "Bu randevu size ait değil" }, { status: 403 });
    }
    if (appointment.status !== "SCHEDULED") {
      return NextResponse.json({ error: "Sadece planlanmış randevular iptal edilebilir" }, { status: 400 });
    }
    if (appointment.startAt < new Date()) {
      return NextResponse.json({ error: "Geçmiş randevular iptal edilemez" }, { status: 400 });
    }

    await prisma.appointment.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    const memberUser = await prisma.user.findUnique({ where: { id: user.sub }, select: { name: true } });
    await prisma.notification.create({
      data: {
        userId: appointment.trainer.userId,
        title: "Randevu iptal edildi",
        body: `${memberUser?.name ?? "Bir üye"}, ${appointment.startAt.toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} tarihli randevusunu iptal etti.`,
        type: "warn",
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
