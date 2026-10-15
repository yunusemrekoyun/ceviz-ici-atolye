import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { action } = await req.json();

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
  }

  const request = await prisma.freezeRequest.findUnique({
    where: { id },
    include: { membership: { include: { member: { select: { userId: true } }, plan: { select: { name: true } } } } },
  });
  if (!request) return NextResponse.json({ error: "Talep bulunamadı" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Bu talep zaten sonuçlandı" }, { status: 400 });
  }

  if (action === "approve") {
    const newEndDate = new Date(request.membership.endDate.getTime() + request.days * 24 * 60 * 60 * 1000);
    await prisma.$transaction([
      prisma.freezeRequest.update({
        where: { id },
        data: { status: "APPROVED", decidedAt: new Date() },
      }),
      prisma.membership.update({
        where: { id: request.membershipId },
        data: { endDate: newEndDate, frozenDays: { increment: request.days } },
      }),
      prisma.notification.create({
        data: {
          userId: request.membership.member.userId,
          title: "Dondurma talebin onaylandı",
          body: `${request.membership.plan.name} üyeliğin ${request.days} gün donduruldu. Yeni bitiş: ${newEndDate.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}.`,
          type: "success",
        },
      }),
    ]);
    await audit({ action: "freeze.approve", entity: "membership", entityId: request.membershipId, meta: { days: request.days } });
  } else {
    await prisma.$transaction([
      prisma.freezeRequest.update({
        where: { id },
        data: { status: "REJECTED", decidedAt: new Date() },
      }),
      prisma.notification.create({
        data: {
          userId: request.membership.member.userId,
          title: "Dondurma talebin reddedildi",
          body: "Üyelik dondurma talebin uygun görülmedi. Detay için resepsiyonla iletişime geçebilirsin.",
          type: "warn",
        },
      }),
    ]);
    await audit({ action: "freeze.reject", entity: "membership", entityId: request.membershipId });
  }

  return NextResponse.json({ ok: true });
}
