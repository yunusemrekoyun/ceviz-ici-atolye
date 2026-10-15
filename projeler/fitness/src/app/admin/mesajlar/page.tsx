import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { MessagesClient } from "@/components/admin/MessagesClient";

export default async function MessagesPage() {
  await requireAdmin();

  const [messages, plans, trainers, branches, staff] = await Promise.all([
    prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    prisma.trainer.findMany({ where: { isActive: true }, select: { id: true, user: { select: { name: true } } } }),
    prisma.branch.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { role: { in: [Role.ADMIN, Role.STAFF] }, isActive: true }, select: { id: true, name: true } }),
  ]);

  const plainPlans = plans.map((p) => ({ ...p, price: Number(p.price) }));

  return (
    <div>
      <PageHeader
        title="İletişim & Adaylar"
        subtitle="İletişim formundan gelen mesajlar ve aday takip hattı"
      />
      <MessagesClient
        initialMessages={JSON.parse(JSON.stringify(messages))}
        options={{ plans: plainPlans, trainers, branches, staff }}
      />
    </div>
  );
}
