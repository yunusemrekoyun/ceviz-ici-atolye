import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: "Mevcut şifre ve en az 6 karakterli yeni şifre gerekli" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.sub } });
  if (!dbUser) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

  const match = await verifyPassword(currentPassword, dbUser.passwordHash);
  if (!match) return NextResponse.json({ error: "Mevcut şifre hatalı" }, { status: 400 });

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.sub }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
