import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const att = await prisma.attendance.findUnique({ where: { id } });
  if (!att) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });
  if (att.checkOut) return NextResponse.json({ error: "Zaten check-out yapılmış" }, { status: 409 });

  const updated = await prisma.attendance.update({
    where: { id },
    data: { checkOut: new Date() },
    include: { member: { include: { user: { select: { name: true } } } } },
  });

  return NextResponse.json({ attendance: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  await prisma.attendance.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
