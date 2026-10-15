import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { MemberStatus } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const body = await req.json();
  const { action, extendDays } = body;

  const ms = await prisma.membership.findUnique({
    where: { id },
    include: { member: true },
  });
  if (!ms) return NextResponse.json({ error: "Üyelik bulunamadı" }, { status: 404 });

  if (action === "freeze") {
    await prisma.$transaction([
      prisma.membership.update({ where: { id }, data: { isActive: false } }),
      prisma.member.update({ where: { id: ms.memberId }, data: { status: MemberStatus.FROZEN } }),
    ]);
  } else if (action === "unfreeze") {
    await prisma.$transaction([
      prisma.membership.update({ where: { id }, data: { isActive: true } }),
      prisma.member.update({ where: { id: ms.memberId }, data: { status: MemberStatus.ACTIVE } }),
    ]);
  } else if (action === "extend" && extendDays > 0) {
    const newEnd = new Date(ms.endDate);
    newEnd.setDate(newEnd.getDate() + extendDays);
    await prisma.membership.update({ where: { id }, data: { endDate: newEnd, isActive: true } });
  } else {
    return NextResponse.json({ error: "Geçersiz action" }, { status: 400 });
  }

  const updated = await prisma.membership.findUnique({
    where: { id },
    include: { plan: { select: { name: true } }, member: { select: { status: true } } },
  });
  return NextResponse.json({ membership: updated });
}
