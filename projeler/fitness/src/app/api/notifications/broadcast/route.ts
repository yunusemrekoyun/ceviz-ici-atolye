import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { MemberStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  const body = await req.json();
  const { audience, title, body: msgBody, type = "info", planId } = body;

  if (!title?.trim() || !msgBody?.trim() || !audience) {
    return NextResponse.json({ error: "Başlık, mesaj ve hedef kitle zorunlu" }, { status: 400 });
  }

  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 86400_000);
  const sevenDaysLater = new Date(now.getTime() + 7 * 86400_000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000);

  type MemberWithUser = { user: { id: string } };
  let targets: MemberWithUser[] = [];

  const memberSelect = { user: { select: { id: true } } };

  if (audience === "all_active") {
    targets = await prisma.member.findMany({ where: { status: MemberStatus.ACTIVE }, select: memberSelect });
  } else if (audience === "expiring_7") {
    targets = await prisma.member.findMany({
      where: {
        status: MemberStatus.ACTIVE,
        memberships: { some: { isActive: true, endDate: { gte: now, lte: sevenDaysLater } } },
      },
      select: memberSelect,
    });
  } else if (audience === "expiring_30") {
    targets = await prisma.member.findMany({
      where: {
        status: MemberStatus.ACTIVE,
        memberships: { some: { isActive: true, endDate: { gte: now, lte: thirtyDaysLater } } },
      },
      select: memberSelect,
    });
  } else if (audience === "new_30") {
    targets = await prisma.member.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: memberSelect,
    });
  } else if (audience === "by_plan" && planId) {
    targets = await prisma.member.findMany({
      where: {
        status: MemberStatus.ACTIVE,
        memberships: { some: { isActive: true, planId } },
      },
      select: memberSelect,
    });
  } else if (audience === "all_trainers") {
    // Eğitmenler üye değil — aktif eğitmenlerin User kaydı üzerinden hedeflenir
    const trainers = await prisma.trainer.findMany({
      where: { isActive: true },
      select: { user: { select: { id: true } } },
    });
    targets = trainers.map((t) => ({ user: { id: t.user.id } }));
  } else {
    return NextResponse.json({ error: "Geçersiz hedef kitle" }, { status: 400 });
  }

  if (targets.length === 0) {
    return NextResponse.json({ error: "Bu kriterlere uyan üye bulunamadı" }, { status: 404 });
  }

  await prisma.notification.createMany({
    data: targets.map((t) => ({
      userId: t.user.id,
      title: title.trim(),
      body: msgBody.trim(),
      type,
    })),
  });

  await audit({
    userId: admin.sub,
    ip: getClientIp(req),
    action: "notification.broadcast",
    entity: "notification",
    meta: { audience, sent: targets.length, title: title.trim() },
  });

  return NextResponse.json({ sent: targets.length });
}
