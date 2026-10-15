import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTrainer } from "@/lib/auth";

const ALLOWED = new Set(["COMPLETED", "NO_SHOW"]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireTrainer();
    const { id } = await params;
    const { status, notes } = await req.json();

    if (!ALLOWED.has(status)) {
      return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 });
    }

    const trainer = await prisma.trainer.findUnique({ where: { userId: user.sub } });
    if (!trainer) return NextResponse.json({ error: "Eğitmen kaydı bulunamadı" }, { status: 404 });

    const appt = await prisma.appointment.findUnique({ where: { id } });
    if (!appt) return NextResponse.json({ error: "Randevu bulunamadı" }, { status: 404 });
    if (appt.trainerId !== trainer.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    if (appt.status !== "SCHEDULED") {
      return NextResponse.json({ error: "Sadece bekleyen randevular işaretlenebilir" }, { status: 400 });
    }
    if (appt.startAt > new Date()) {
      return NextResponse.json({ error: "Henüz gerçekleşmemiş bir randevu işaretlenemez" }, { status: 400 });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status,
        ...(typeof notes === "string" ? { notes: notes.trim() || null } : {}),
      },
    });

    return NextResponse.json({ appointment: updated });
  } catch (e) {
    console.error("[trainer/appointments PATCH]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
