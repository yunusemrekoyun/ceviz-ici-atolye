import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const { heightCm, startWeightKg, targetWeightKg, birthDate, gender, goal, healthNotes } = body;

    const member = await prisma.member.findUnique({ where: { userId: user.sub } });
    if (!member) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });

    await prisma.member.update({
      where: { id: member.id },
      data: {
        heightCm:       heightCm       ? Number(heightCm)       : null,
        startWeightKg:  startWeightKg  ? Number(startWeightKg)  : null,
        targetWeightKg: targetWeightKg ? Number(targetWeightKg) : null,
        birthDate:      birthDate      ? new Date(birthDate)    : null,
        gender:         gender         || null,
        goal:           goal           || null,
        healthNotes:    healthNotes    || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[panel/profile PATCH]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
