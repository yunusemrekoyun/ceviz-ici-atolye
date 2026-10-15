import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

function parseDate(s: unknown): Date {
  if (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + "T00:00:00.000Z");
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

// Günlük su miktarını artırır/azaltır (ml). Toplamı 0'ın altına düşürmez.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const member = await prisma.member.findUnique({ where: { userId: user.sub }, select: { id: true } });
    if (!member) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });

    const body = await req.json();
    const delta = Math.trunc(Number(body.deltaMl));
    if (!Number.isFinite(delta) || delta === 0) return NextResponse.json({ error: "Geçersiz miktar" }, { status: 400 });
    const date = parseDate(body.date);

    const existing = await prisma.waterLog.findUnique({ where: { memberId_date: { memberId: member.id, date } } });
    const next = Math.max(0, Math.min(20000, (existing?.amountMl ?? 0) + delta));

    const row = await prisma.waterLog.upsert({
      where: { memberId_date: { memberId: member.id, date } },
      create: { memberId: member.id, date, amountMl: Math.max(0, Math.min(20000, delta)) },
      update: { amountMl: next },
    });

    return NextResponse.json({ waterMl: row.amountMl });
  } catch (e) {
    console.error("[panel/water POST]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
