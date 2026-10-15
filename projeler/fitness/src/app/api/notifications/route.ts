import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await requireAdmin();
  const { searchParams } = req.nextUrl;
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);
  const page = Math.max(Number(searchParams.get("page") ?? "1"), 1);
  const userId = searchParams.get("userId");
  const type = searchParams.get("type");

  const where = {
    ...(userId ? { userId } : {}),
    ...(type ? { type } : {}),
  };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [todayCount, unreadCount] = await Promise.all([
    prisma.notification.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.notification.count({ where: { readAt: null } }),
  ]);

  return NextResponse.json({ notifications, total, todayCount, unreadCount, page, limit });
}
