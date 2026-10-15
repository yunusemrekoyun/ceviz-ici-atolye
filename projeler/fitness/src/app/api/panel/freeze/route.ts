import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// Bir üyelik boyunca toplam dondurulabilecek gün sınırı.
const MAX_FREEZE_DAYS = 30;
const ALLOWED_DAYS = [7, 14, 30];

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { days, reason } = await req.json();

    const d = Number(days);
    if (!ALLOWED_DAYS.includes(d)) {
      return NextResponse.json({ error: "Geçersiz gün sayısı" }, { status: 400 });
    }

    const member = await prisma.member.findUnique({ where: { userId: user.sub } });
    if (!member) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });

    const membership = await prisma.membership.findFirst({
      where: { memberId: member.id, isActive: true, endDate: { gt: new Date() } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Dondurulabilecek aktif bir üyeliğin yok" }, { status: 400 });
    }

    if (membership.frozenDays + d > MAX_FREEZE_DAYS) {
      const left = Math.max(0, MAX_FREEZE_DAYS - membership.frozenDays);
      return NextResponse.json(
        { error: left > 0 ? `Bu üyelikte en fazla ${left} gün daha dondurabilirsin` : "Bu üyelik için dondurma hakkın doldu" },
        { status: 400 }
      );
    }

    const pending = await prisma.freezeRequest.findFirst({
      where: { membershipId: membership.id, status: "PENDING" },
    });
    if (pending) {
      return NextResponse.json({ error: "Zaten bekleyen bir dondurma talebin var" }, { status: 400 });
    }

    const request = await prisma.freezeRequest.create({
      data: {
        membershipId: membership.id,
        days: d,
        reason: typeof reason === "string" && reason.trim() ? reason.trim().slice(0, 300) : null,
      },
    });

    return NextResponse.json({ request }, { status: 201 });
  } catch (e) {
    console.error("[panel/freeze POST]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
