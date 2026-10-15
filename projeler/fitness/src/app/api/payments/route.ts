import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { evaluateCoupon } from "@/lib/coupon";
import { PaymentMethod, PaymentStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  await requireAdmin();

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") as PaymentStatus | null;
  const method = sp.get("method") as PaymentMethod | null;
  const q = sp.get("q") || undefined;
  const from = sp.get("from") ? new Date(sp.get("from")!) : undefined;
  const to = sp.get("to") ? new Date(sp.get("to")!) : undefined;
  const skip = Math.max(0, parseInt(sp.get("skip") ?? "0", 10));
  const take = Math.min(100, Math.max(1, parseInt(sp.get("take") ?? "20", 10)));

  const where: any = {
    ...(status ? { status } : {}),
    ...(method ? { method } : {}),
    ...(from || to ? { paidAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(q ? {
      OR: [
        { invoiceNo: { contains: q, mode: "insensitive" } },
        { member: { user: { name: { contains: q, mode: "insensitive" } } } },
      ],
    } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { member: { include: { user: { select: { name: true, email: true } } } } },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.payment.count({ where }),
  ]);

  return NextResponse.json({ items, total });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();

  const body = await req.json();
  const { memberId, amount, method = PaymentMethod.CARD, status = PaymentStatus.PAID, membershipId, notes, couponCode } = body;
  if (!memberId || !amount) {
    return NextResponse.json({ error: "memberId ve amount zorunlu" }, { status: 400 });
  }

  // Opsiyonel kupon → girilen tutara indirim uygula
  let finalAmount = Number(amount);
  let discountAmount: number | null = null;
  let appliedCoupon: string | null = null;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: String(couponCode).trim().toUpperCase() } });
    if (!coupon) return NextResponse.json({ error: "Kupon bulunamadı" }, { status: 404 });
    const r = evaluateCoupon(coupon, Number(amount));
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    finalAmount = r.finalAmount;
    discountAmount = r.discount;
    appliedCoupon = r.couponCode;
  }

  const year = new Date().getFullYear();
  const count = await prisma.payment.count({ where: { invoiceNo: { startsWith: `INV-${year}-` } } });
  const invoiceNo = `INV-${year}-${String(count + 1).padStart(4, "0")}`;

  const payment = await prisma.payment.create({
    data: {
      memberId,
      membershipId: membershipId || null,
      amount: finalAmount,
      method,
      status,
      paidAt: status === PaymentStatus.PAID ? new Date() : null,
      invoiceNo,
      notes: notes || null,
      couponCode: appliedCoupon,
      discountAmount: discountAmount,
    },
    include: { member: { include: { user: { select: { name: true, email: true } } } } },
  });

  // Manuel ödeme doğrudan PAID ise kupon kullanımını hemen say
  if (appliedCoupon && status === PaymentStatus.PAID) {
    await prisma.coupon.updateMany({ where: { code: appliedCoupon }, data: { usedCount: { increment: 1 } } });
  }

  await audit({
    userId: admin.sub,
    ip: getClientIp(req),
    action: "payment.create",
    entity: "payment",
    entityId: payment.id,
    meta: { memberId, amount: Number(amount), method, status, invoiceNo },
  });

  return NextResponse.json({ payment });
}
