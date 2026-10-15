import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/PageHeader";
import { NotificationsClient } from "@/components/admin/NotificationsClient";

export default async function NotificationsPage() {
  await requireAdmin();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [notifications, total, todayCount, unreadCount, plans] = await Promise.all([
    prisma.notification.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count(),
    prisma.notification.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.notification.count({ where: { readAt: null } }),
    prisma.plan.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { order: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Bildirimler"
        subtitle="Üyelere toplu bildirim gönder ve geçmişi takip et"
      />
      <NotificationsClient
        initialNotifications={JSON.parse(JSON.stringify(notifications))}
        initialTotal={total}
        initialTodayCount={todayCount}
        initialUnreadCount={unreadCount}
        plans={plans}
      />
    </div>
  );
}
