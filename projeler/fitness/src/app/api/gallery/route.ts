import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();
  const images = await prisma.galleryImage.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] });
  return NextResponse.json({ images });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json();
  const { url, caption, isVisible = true } = body;

  if (!url?.trim()) {
    return NextResponse.json({ error: "Görsel zorunlu" }, { status: 400 });
  }

  const maxOrder = await prisma.galleryImage.aggregate({ _max: { order: true } });
  const order = (maxOrder._max.order ?? 0) + 1;

  const image = await prisma.galleryImage.create({
    data: {
      url: url.trim(),
      caption: caption?.trim() || null,
      isVisible,
      order,
    },
  });

  return NextResponse.json({ image }, { status: 201 });
}
