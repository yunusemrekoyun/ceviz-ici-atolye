import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';

export const runtime = 'nodejs';

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth || !['admin', 'muhasebe'].includes(auth.user.roleSlug)) {
    return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 403 });
  }

  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - 11, 1); // start of 12 months ago

  const [paid, refunded] = await Promise.all([
    prisma.payment.findMany({
      where: { status: 'paid', paidAt: { gte: since } },
      select: { paidAt: true, amount: true },
    }),
    prisma.payment.findMany({
      where: { status: 'refunded', refundedAt: { gte: since } },
      select: { refundedAt: true, refundedAmount: true, amount: true },
    }),
  ]);

  // ── Daily (last 30 days) ──────────────────────────────────────────────────
  const dailyMap = new Map<string, { collected: number; refunded: number }>();
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    dailyMap.set(dayKey(d), { collected: 0, refunded: 0 });
  }
  for (const p of paid) {
    if (!p.paidAt) continue;
    const k = dayKey(p.paidAt);
    const row = dailyMap.get(k);
    if (row) row.collected += p.amount;
  }
  for (const r of refunded) {
    if (!r.refundedAt) continue;
    const k = dayKey(r.refundedAt);
    const row = dailyMap.get(k);
    if (row) row.refunded += r.refundedAmount ?? r.amount;
  }

  // ── Monthly (last 12 months) ──────────────────────────────────────────────
  const monthlyMap = new Map<string, { collected: number; refunded: number }>();
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyMap.set(monthKey(d), { collected: 0, refunded: 0 });
  }
  for (const p of paid) {
    if (!p.paidAt) continue;
    const row = monthlyMap.get(monthKey(p.paidAt));
    if (row) row.collected += p.amount;
  }
  for (const r of refunded) {
    if (!r.refundedAt) continue;
    const row = monthlyMap.get(monthKey(r.refundedAt));
    if (row) row.refunded += r.refundedAmount ?? r.amount;
  }

  const collectedTotal = paid.reduce((s, p) => s + p.amount, 0);
  const refundedTotal = refunded.reduce((s, r) => s + (r.refundedAmount ?? r.amount), 0);

  return NextResponse.json({
    ok: true,
    totals: { collected: collectedTotal, refunded: refundedTotal, net: collectedTotal - refundedTotal },
    daily: Array.from(dailyMap, ([date, v]) => ({ date, ...v })),
    monthly: Array.from(monthlyMap, ([month, v]) => ({ month, ...v })),
  });
}
