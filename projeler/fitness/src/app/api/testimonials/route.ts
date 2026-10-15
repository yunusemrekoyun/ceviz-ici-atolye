import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();
  const testimonials = await prisma.testimonial.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] });
  return NextResponse.json({ testimonials });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json();
  const { name, role, avatarUrl, content, rating = 5, isVisible = true } = body;

  if (!name?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "Ad ve içerik zorunlu" }, { status: 400 });
  }

  const maxOrder = await prisma.testimonial.aggregate({ _max: { order: true } });
  const order = (maxOrder._max.order ?? 0) + 1;

  const testimonial = await prisma.testimonial.create({
    data: {
      name: name.trim(),
      role: role?.trim() || null,
      avatarUrl: avatarUrl?.trim() || null,
      content: content.trim(),
      rating: Math.min(5, Math.max(1, Number(rating))),
      isVisible,
      order,
    },
  });

  return NextResponse.json({ testimonial }, { status: 201 });
}
