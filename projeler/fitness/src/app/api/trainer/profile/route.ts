import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTrainer } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireTrainer();
    const trainer = await prisma.trainer.findUnique({ where: { userId: user.sub } });
    if (!trainer) return NextResponse.json({ error: "Eğitmen kaydı bulunamadı" }, { status: 404 });

    const { bio, specialty, experience, avatarUrl, phone } = await req.json();

    const exp = experience != null && experience !== "" ? Number(experience) : null;
    if (exp != null && (!Number.isInteger(exp) || exp < 0 || exp > 60)) {
      return NextResponse.json({ error: "Deneyim 0-60 yıl arasında olmalı" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.trainer.update({
        where: { id: trainer.id },
        data: {
          bio: typeof bio === "string" ? (bio.trim().slice(0, 2000) || null) : undefined,
          specialty: typeof specialty === "string" ? (specialty.trim().slice(0, 100) || null) : undefined,
          ...(exp != null ? { experience: exp } : {}),
        },
      }),
      prisma.user.update({
        where: { id: user.sub },
        data: {
          ...(typeof avatarUrl === "string" ? { avatarUrl: avatarUrl || null } : {}),
          ...(typeof phone === "string" ? { phone: phone.trim().slice(0, 30) || null } : {}),
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[trainer/profile PATCH]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
