import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { MemberStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  await requireAdmin();

  const sp = req.nextUrl.searchParams;
  const branchId = sp.get("branchId") || undefined;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const branchFilter = branchId ? { branchId } : {};

  const [total, active, expired, frozen, newThisMonth, newLastMonth, branches] = await Promise.all([
    prisma.member.count({ where: branchFilter }),
    prisma.member.count({ where: { status: MemberStatus.ACTIVE, ...branchFilter } }),
    prisma.member.count({ where: { status: MemberStatus.EXPIRED, ...branchFilter } }),
    prisma.member.count({ where: { status: MemberStatus.FROZEN, ...branchFilter } }),
    prisma.member.count({ where: { createdAt: { gte: startOfMonth }, ...branchFilter } }),
    prisma.member.count({ where: { createdAt: { gte: startOfPrevMonth, lt: startOfMonth }, ...branchFilter } }),
    prisma.branch.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        _count: { select: { members: { where: { status: MemberStatus.ACTIVE } } } },
      },
    }),
  ]);

  const newDelta = newLastMonth > 0 ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100) : 0;

  // Monthly new members trend (last 6 months)
  const monthly: { month: string; new: number; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const [newCount, totalCount] = await Promise.all([
      prisma.member.count({ where: { createdAt: { gte: mStart, lt: mEnd }, ...branchFilter } }),
      prisma.member.count({ where: { createdAt: { lt: mEnd }, ...branchFilter } }),
    ]);
    monthly.push({
      month: mStart.toLocaleDateString("tr-TR", { month: "short" }),
      new: newCount,
      total: totalCount,
    });
  }

  return NextResponse.json({
    total,
    active,
    expired,
    frozen,
    newThisMonth,
    newDelta,
    byBranch: branches.map((b) => ({
      id: b.id,
      name: b.name,
      activeCount: b._count.members,
    })),
    monthly,
  });
}
