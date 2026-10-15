import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await requireAdmin();

  const memberId = req.nextUrl.searchParams.get("memberId");
  if (!memberId) return NextResponse.json({ error: "memberId zorunlu" }, { status: 400 });

  const photos = await prisma.progressPhoto.findMany({
    where: { memberId },
    orderBy: { takenAt: "desc" },
  });

  return NextResponse.json({ photos });
}

export async function POST(req: NextRequest) {
  await requireAdmin();

  const { memberId, imageUrl, label, takenAt } = await req.json();
  if (!memberId || !imageUrl) {
    return NextResponse.json({ error: "memberId ve imageUrl gerekli" }, { status: 400 });
  }

  const photo = await prisma.progressPhoto.create({
    data: {
      memberId,
      imageUrl,
      label: label || null,
      takenAt: takenAt ? new Date(takenAt) : undefined,
    },
  });

  return NextResponse.json({ photo }, { status: 201 });
}
