import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token gerekli" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { verificationToken: token } });

  if (!user) return NextResponse.json({ error: "Geçersiz token" }, { status: 400 });

  if (user.verificationExpiry && user.verificationExpiry < new Date()) {
    return NextResponse.json({ error: "Token süresi dolmuş" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      verificationToken: null,
      verificationExpiry: null,
    },
  });

  return NextResponse.json({ ok: true });
}
