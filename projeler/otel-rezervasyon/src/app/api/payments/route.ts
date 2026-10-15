import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';

const RES_SELECT = {
  select: {
    id: true,
    confirmationId: true,
    firstName: true,
    lastName: true,
    status: true,
    totalPrice: true,
  },
} as const;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function GET(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth || !['admin', 'personel', 'muhasebe'].includes(auth.user.roleSlug)) {
    return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status')?.trim() || undefined;
  const provider = searchParams.get('provider')?.trim() || undefined;
  const q = searchParams.get('q')?.trim();

  const where: Prisma.PaymentWhereInput = {};
  if (status && status !== 'all') where.status = status;
  if (provider && provider !== 'all') where.provider = provider;
  if (q) {
    where.reservation = {
      OR: [
        { confirmationId: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
      ],
    };
  }

  try {
    const [payments, paidAgg, todayAgg, monthAgg, refundAgg, byStatus] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 300,
        include: { reservation: RES_SELECT },
      }),
      prisma.payment.aggregate({ where: { status: 'paid' }, _sum: { amount: true }, _count: true }),
      prisma.payment.aggregate({ where: { status: 'paid', paidAt: { gte: startOfToday() } }, _sum: { amount: true }, _count: true }),
      prisma.payment.aggregate({ where: { status: 'paid', paidAt: { gte: startOfMonth() } }, _sum: { amount: true }, _count: true }),
      prisma.payment.aggregate({ where: { status: 'refunded' }, _sum: { amount: true }, _count: true }),
      prisma.payment.groupBy({ by: ['status'], _count: { _all: true }, _sum: { amount: true } }),
    ]);

    return NextResponse.json({
      ok: true,
      payments,
      summary: {
        totalPaid: paidAgg._sum.amount ?? 0,
        totalPaidCount: paidAgg._count,
        todayPaid: todayAgg._sum.amount ?? 0,
        todayCount: todayAgg._count,
        monthPaid: monthAgg._sum.amount ?? 0,
        monthCount: monthAgg._count,
        refundedTotal: refundAgg._sum.amount ?? 0,
        refundedCount: refundAgg._count,
        byStatus: byStatus.map(s => ({ status: s.status, count: s._count._all, amount: s._sum.amount ?? 0 })),
      },
    });
  } catch (error) {
    console.error('Payments fetch failed.', error);
    return NextResponse.json({ ok: false, message: 'Ödemeler alınamadı.' }, { status: 503 });
  }
}

const manualSchema = z.object({
  reservationId: z.string().min(1),
  amount: z.coerce.number().int().positive().max(100_000_000),
  method: z.enum(['cash', 'card', 'transfer']),
});

export async function POST(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth || !['admin', 'personel'].includes(auth.user.roleSlug)) {
    return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 403 });
  }

  const parsed = manualSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Ödeme bilgileri geçersiz.' }, { status: 400 });
  }
  const { reservationId, amount, method } = parsed.data;

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: { id: true, confirmationId: true, totalPrice: true, paymentStatus: true },
  });
  if (!reservation) {
    return NextResponse.json({ ok: false, message: 'Rezervasyon bulunamadı.' }, { status: 404 });
  }

  const { payment, paymentStatus } = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        reservationId,
        provider: 'manual',
        method,
        status: 'paid',
        amount,
        currency: 'TRY',
        conversationId: `MAN-${reservation.confirmationId}-${Date.now().toString(36)}`,
        paidAt: new Date(),
      },
      include: { reservation: RES_SELECT },
    });

    // Recompute total collected and reflect it on the reservation.
    const agg = await tx.payment.aggregate({
      where: { reservationId, status: 'paid' },
      _sum: { amount: true },
    });
    const collected = agg._sum.amount ?? 0;
    const newStatus = collected >= reservation.totalPrice ? 'paid' : 'partial';
    await tx.reservation.update({ where: { id: reservationId }, data: { paymentStatus: newStatus } });

    return { payment: p, paymentStatus: newStatus };
  });

  await writeAuditLog({
    request,
    auth,
    action: 'payment.manual',
    entityType: 'payment',
    entityId: payment.id,
    summary: `Manuel ödeme alındı (${method}): #${reservation.confirmationId} · ₺${amount.toLocaleString('tr-TR')}`,
    after: { amount, method, reservationPaymentStatus: paymentStatus },
  });

  return NextResponse.json({ ok: true, payment, reservationPaymentStatus: paymentStatus }, { status: 201 });
}
