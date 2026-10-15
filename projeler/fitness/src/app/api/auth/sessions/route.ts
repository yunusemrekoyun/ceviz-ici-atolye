import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();

  const sessions = await prisma.session.findMany({
    where: { userId: user.sub, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, userAgent: true, ip: true, createdAt: true, expiresAt: true },
  });

  return NextResponse.json({ sessions });
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser();
  const { sessionId } = await req.json();

  if (!sessionId) return NextResponse.json({ error: "sessionId gerekli" }, { status: 400 });

  await prisma.session.deleteMany({ where: { id: sessionId, userId: user.sub } });
  return NextResponse.json({ ok: true });
}
