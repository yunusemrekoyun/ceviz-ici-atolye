import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { MemberStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

// Üyelik yenileme / yeni üyelik oluştur
export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json();
  const { memberId, planId, startDate, paymentMethod = "CARD", paymentStatus = "PAID", paymentAmount, paymentNotes, createPayment = true } = body;

  if (!memberId || !planId) return NextResponse.json({ error: "memberId ve planId zorunlu" }, { status: 400 });

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return NextResponse.json({ error: "Plan bulunamadı" }, { status: 404 });

  const start = startDate ? new Date(startDate) : new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + plan.durationDays);

  const result = await prisma.$transaction(async (tx) => {
    // Mevcut aktif üyelikleri pasifleştir
    await tx.membership.updateMany({
      where: { memberId, isActive: true },
      data: { isActive: false },
    });

    const ms = await tx.membership.create({
      data: { memberId, planId, startDate: start, endDate: end, isActive: true },
    });

    await tx.member.update({
      where: { id: memberId },
      data: { status: MemberStatus.ACTIVE },
    });

    if (createPayment) {
      const pCount = await tx.payment.count();
      await tx.payment.create({
        data: {
          memberId,
          membershipId: ms.id,
          amount: paymentAmount ? Number(paymentAmount) : Number(plan.price),
          method: paymentMethod as PaymentMethod,
          status: paymentStatus as PaymentStatus,
          paidAt: paymentStatus === "PAID" ? new Date() : null,
          invoiceNo: `INV-${new Date().getFullYear()}-${String(pCount + 1).padStart(4, "0")}`,
          notes: paymentNotes || undefined,
        },
      });
    }

    return ms;
  });

  return NextResponse.json({ membership: result });
}
