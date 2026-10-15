import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();

  const notifications = await prisma.notification.findMany({
    where: { userId: user.sub },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return NextResponse.json({ notifications, unreadCount });
}
