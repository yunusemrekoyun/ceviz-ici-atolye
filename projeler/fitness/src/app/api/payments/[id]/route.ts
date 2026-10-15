import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { PaymentStatus } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const { status, refundReason } = await req.json();

  if (!Object.values(PaymentStatus).includes(status)) {
    return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 });
  }

  const isRefund = status === PaymentStatus.REFUNDED;
  if (isRefund && !refundReason?.trim()) {
    return NextResponse.json({ error: "İade için bir neden girilmelidir" }, { status: 400 });
  }

  const exists = await prisma.payment.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Ödeme bulunamadı" }, { status: 404 });

  const payment = await prisma.payment.update({
    where: { id },
    data: {
      status,
      paidAt: status === PaymentStatus.PAID ? new Date() : undefined,
      refundReason: isRefund ? refundReason.trim() : undefined,
      refundedAt: isRefund ? new Date() : undefined,
    },
    include: { member: { include: { user: { select: { name: true, email: true } } } } },
  });

  await audit({
    userId: admin.sub,
    ip: getClientIp(req),
    action: "payment.status",
    entity: "payment",
    entityId: id,
    meta: { status, ...(isRefund ? { refundReason: refundReason.trim() } : {}) },
  });

  return NextResponse.json({ payment });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  await prisma.payment.delete({ where: { id } });

  await audit({
    userId: admin.sub,
    ip: getClientIp(req),
    action: "payment.delete",
    entity: "payment",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
