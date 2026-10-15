import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await requireAdmin();

  const memberId = req.nextUrl.searchParams.get("memberId");
  if (!memberId) return NextResponse.json({ error: "memberId zorunlu" }, { status: 400 });

  const measurements = await prisma.measurement.findMany({
    where: { memberId },
    orderBy: { recordedAt: "asc" },
  });

  return NextResponse.json(measurements);
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const b = await req.json();
  if (!b.memberId) return NextResponse.json({ error: "memberId zorunlu" }, { status: 400 });

  const m = await prisma.measurement.create({
    data: {
      memberId: b.memberId,
      weightKg:   b.weightKg   ? Number(b.weightKg)   : null,
      bodyFatPct: b.bodyFatPct ? Number(b.bodyFatPct) : null,
      musclePct:  b.musclePct  ? Number(b.musclePct)  : null,
      waistCm:    b.waistCm    ? Number(b.waistCm)    : null,
      chestCm:    b.chestCm    ? Number(b.chestCm)    : null,
      hipCm:      b.hipCm      ? Number(b.hipCm)      : null,
      armCm:      b.armCm      ? Number(b.armCm)      : null,
      legCm:      b.legCm      ? Number(b.legCm)      : null,
      notes:      b.notes || null,
      recordedAt: b.recordedAt ? new Date(b.recordedAt) : undefined,
    },
  });
  return NextResponse.json({ measurement: m }, { status: 201 });
}
