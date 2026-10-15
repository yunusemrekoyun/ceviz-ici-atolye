import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const body = await req.json();
  const { name, role, avatarUrl, content, rating, isVisible, order } = body;

  const exists = await prisma.testimonial.findUnique({ where: { id } });
  if (!exists) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const updated = await prisma.testimonial.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(role !== undefined ? { role: role?.trim() || null } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl?.trim() || null } : {}),
      ...(content !== undefined ? { content: content.trim() } : {}),
      ...(rating !== undefined ? { rating: Math.min(5, Math.max(1, Number(rating))) } : {}),
      ...(isVisible !== undefined ? { isVisible } : {}),
      ...(order !== undefined ? { order: Number(order) } : {}),
    },
  });

  return NextResponse.json({ testimonial: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  await prisma.testimonial.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
