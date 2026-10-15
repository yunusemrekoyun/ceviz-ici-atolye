import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const body = await req.json();
  const { url, caption, isVisible, order } = body;

  const exists = await prisma.galleryImage.findUnique({ where: { id } });
  if (!exists) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const updated = await prisma.galleryImage.update({
    where: { id },
    data: {
      ...(url !== undefined ? { url: url.trim() } : {}),
      ...(caption !== undefined ? { caption: caption?.trim() || null } : {}),
      ...(isVisible !== undefined ? { isVisible } : {}),
      ...(order !== undefined ? { order: Number(order) } : {}),
    },
  });

  return NextResponse.json({ image: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  await prisma.galleryImage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
