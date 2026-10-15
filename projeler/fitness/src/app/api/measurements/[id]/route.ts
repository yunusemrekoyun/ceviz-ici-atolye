import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const b = await req.json();

  const exists = await prisma.measurement.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Ölçüm bulunamadı" }, { status: 404 });

  const m = await prisma.measurement.update({
    where: { id },
    data: {
      weightKg:   b.weightKg   !== undefined ? (b.weightKg   ? Number(b.weightKg)   : null) : undefined,
      bodyFatPct: b.bodyFatPct !== undefined ? (b.bodyFatPct ? Number(b.bodyFatPct) : null) : undefined,
      musclePct:  b.musclePct  !== undefined ? (b.musclePct  ? Number(b.musclePct)  : null) : undefined,
      waistCm:    b.waistCm    !== undefined ? (b.waistCm    ? Number(b.waistCm)    : null) : undefined,
      notes:      b.notes !== undefined ? (b.notes || null) : undefined,
    },
  });
  return NextResponse.json({ measurement: m });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  await prisma.measurement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
