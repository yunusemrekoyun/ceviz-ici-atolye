import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { checkPanelAccess } from "@/lib/membership";
import { AppointmentStatus } from "@prisma/client";
import { z } from "zod";

const bookSchema = z.object({
  trainerId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.string().regex(/^\d{2}:\d{2}$/),
  durationMin: z.number().int().min(30).max(180).default(60),
  notes: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const access = await checkPanelAccess(user.sub);
    if (!access.ok) {
      return NextResponse.json({ error: "Randevu almak için aktif üyelik gerekli" }, { status: 403 });
    }

    const member = await prisma.member.findUnique({ where: { userId: user.sub } });
    if (!member) return NextResponse.json({ error: "Üye kaydı bulunamadı" }, { status: 404 });

    const body = await req.json();
    const parsed = bookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { trainerId, date, slot, durationMin, notes } = parsed.data;

    const [h, m] = slot.split(":").map(Number);
    const startAt = new Date(`${date}T${slot}:00`);
    startAt.setHours(h, m, 0, 0);

    if (startAt < new Date()) {
      return NextResponse.json({ error: "Geçmiş bir saat seçilemez" }, { status: 400 });
    }

    const endAt = new Date(startAt.getTime() + durationMin * 60_000);

    const timeOff = await prisma.trainerTimeOff.findFirst({
      where: { trainerId, startDate: { lte: endAt }, endDate: { gte: startAt } },
    });
    if (timeOff) {
      return NextResponse.json({ error: "Antrenör bu tarihte izinli" }, { status: 409 });
    }

    const conflict = await prisma.appointment.findFirst({
      where: {
        trainerId,
        status: AppointmentStatus.SCHEDULED,
        OR: [{ startAt: { lt: endAt }, endAt: { gt: startAt } }],
      },
    });
    if (conflict) {
      return NextResponse.json({ error: "Bu saat dilimi başka randevuyla çakışıyor" }, { status: 409 });
    }

    const appointment = await prisma.appointment.create({
      data: {
        memberId: member.id,
        trainerId,
        startAt,
        endAt,
        notes: notes ?? null,
        status: "SCHEDULED",
      },
      include: { trainer: { include: { user: { select: { name: true } } } } },
    });

    const memberUser = await prisma.user.findUnique({ where: { id: user.sub }, select: { name: true } });
    await prisma.notification.create({
      data: {
        userId: appointment.trainer.userId,
        title: "Yeni randevu",
        body: `${memberUser?.name ?? "Bir üye"} seninle ${startAt.toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} tarihinde randevu aldı.`,
        type: "info",
      },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
