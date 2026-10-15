import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTrainer } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireTrainer();
    const { id } = await params;

    const trainer = await prisma.trainer.findUnique({ where: { userId: user.sub } });
    if (!trainer) return NextResponse.json({ error: "Eğitmen kaydı bulunamadı" }, { status: 404 });

    const item = await prisma.trainerTimeOff.findUnique({ where: { id } });
    if (!item || item.trainerId !== trainer.id) {
      return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
    }

    await prisma.trainerTimeOff.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[trainer/timeoff DELETE]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
