import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTrainer } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireTrainer();
    const trainer = await prisma.trainer.findUnique({ where: { userId: user.sub } });
    if (!trainer) return NextResponse.json({ error: "Eğitmen kaydı bulunamadı" }, { status: 404 });

    const appointments = await prisma.appointment.findMany({
      where: { trainerId: trainer.id },
      include: {
        member: {
          select: {
            id: true,
            memberNo: true,
            user: { select: { name: true, email: true, phone: true } },
          },
        },
      },
      orderBy: { startAt: "asc" },
    });

    return NextResponse.json({ appointments });
  } catch (e) {
    console.error("[trainer/appointments GET]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
