import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function DELETE(_req: NextRequest, ctx: any) {
  const user = await requireUser();
  const { id } = await ctx.params;

  const member = await prisma.member.findUnique({ where: { userId: user.sub } });
  if (!member) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });

  const photo = await prisma.progressPhoto.findFirst({ where: { id, memberId: member.id } });
  if (!photo) return NextResponse.json({ error: "Fotoğraf bulunamadı" }, { status: 404 });

  await prisma.progressPhoto.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
