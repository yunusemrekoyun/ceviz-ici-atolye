import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTrainer } from "@/lib/auth";
import { availabilitySchema } from "@/lib/validators";

export async function GET() {
  try {
    const user = await requireTrainer();
    const trainer = await prisma.trainer.findUnique({ where: { userId: user.sub } });
    if (!trainer) return NextResponse.json({ error: "Eğitmen kaydı bulunamadı" }, { status: 404 });

    const slots = await prisma.trainerAvailability.findMany({
      where: { trainerId: trainer.id },
      orderBy: { dayOfWeek: "asc" },
    });
    return NextResponse.json({ slots });
  } catch (e) {
    console.error("[trainer/availability GET]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireTrainer();
    const trainer = await prisma.trainer.findUnique({ where: { userId: user.sub } });
    if (!trainer) return NextResponse.json({ error: "Eğitmen kaydı bulunamadı" }, { status: 404 });

    const body = await req.json();
    const parsed = availabilitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz veri" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.trainerAvailability.deleteMany({ where: { trainerId: trainer.id } }),
      prisma.trainerAvailability.createMany({
        data: parsed.data.map((s) => ({ ...s, trainerId: trainer.id })),
      }),
    ]);

    const slots = await prisma.trainerAvailability.findMany({
      where: { trainerId: trainer.id },
      orderBy: { dayOfWeek: "asc" },
    });
    return NextResponse.json({ slots });
  } catch (e) {
    console.error("[trainer/availability POST]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
