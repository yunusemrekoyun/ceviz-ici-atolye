import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();
  const member = await prisma.member.findUnique({ where: { userId: user.sub } });
  if (!member) return NextResponse.json({ photos: [] });

  const photos = await prisma.progressPhoto.findMany({
    where: { memberId: member.id },
    orderBy: { takenAt: "desc" },
  });

  return NextResponse.json({ photos });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const member = await prisma.member.findUnique({ where: { userId: user.sub } });
  if (!member) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });

  const { imageUrl, label, takenAt } = await req.json();
  if (!imageUrl) return NextResponse.json({ error: "imageUrl gerekli" }, { status: 400 });

  const photo = await prisma.progressPhoto.create({
    data: {
      memberId: member.id,
      imageUrl,
      label: label || null,
      takenAt: takenAt ? new Date(takenAt) : undefined,
    },
  });

  return NextResponse.json({ photo }, { status: 201 });
}
