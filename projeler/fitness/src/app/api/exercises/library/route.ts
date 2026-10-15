import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

// Program yazarken otomatik tamamlama: daha önce kullanılan egzersizler.
// Eğitmen kendi programlarındakini, admin hepsini görür.
export async function GET() {
  try {
    const user = await requireRole(["ADMIN", "STAFF", "TRAINER"]);

    let trainerFilter = {};
    if (user.role === "TRAINER") {
      const trainer = await prisma.trainer.findUnique({ where: { userId: user.sub } });
      if (!trainer) return NextResponse.json({ exercises: [] });
      trainerFilter = { day: { program: { trainerId: trainer.id } } };
    }

    const rows = await prisma.workoutExercise.findMany({
      where: trainerFilter,
      orderBy: { id: "desc" },
      take: 500,
      select: { name: true, sets: true, reps: true, durationSec: true, restSec: true, videoUrl: true },
    });

    // En son kullanılan kazanır — isim bazında (büyük/küçük harf duyarsız) teke indir.
    const seen = new Map<string, (typeof rows)[number]>();
    for (const r of rows) {
      const key = r.name.trim().toLowerCase();
      if (key && !seen.has(key)) seen.set(key, { ...r, name: r.name.trim() });
    }

    const exercises = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, "tr"));
    return NextResponse.json({ exercises });
  } catch (e) {
    console.error("[exercises/library]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
