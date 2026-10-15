import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();

  const member = await prisma.member.findUnique({ where: { userId: user.sub } });
  if (!member) return NextResponse.json({ measurements: [] });

  const measurements = await prisma.measurement.findMany({
    where: { memberId: member.id },
    orderBy: { recordedAt: "asc" },
  });

  return NextResponse.json({ measurements });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();

  const member = await prisma.member.findUnique({ where: { userId: user.sub } });
  if (!member) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });

  const b = await req.json();

  const m = await prisma.measurement.create({
    data: {
      memberId:   member.id,
      weightKg:   b.weightKg   != null ? Number(b.weightKg)   : null,
      bodyFatPct: b.bodyFatPct != null ? Number(b.bodyFatPct) : null,
      musclePct:  b.musclePct  != null ? Number(b.musclePct)  : null,
      waistCm:    b.waistCm    != null ? Number(b.waistCm)    : null,
      chestCm:    b.chestCm    != null ? Number(b.chestCm)    : null,
      hipCm:      b.hipCm      != null ? Number(b.hipCm)      : null,
      armCm:      b.armCm      != null ? Number(b.armCm)      : null,
      legCm:      b.legCm      != null ? Number(b.legCm)      : null,
      notes:      b.notes      || null,
      recordedAt: b.recordedAt ? new Date(b.recordedAt) : undefined,
    },
  });

  return NextResponse.json({ measurement: m }, { status: 201 });
}
