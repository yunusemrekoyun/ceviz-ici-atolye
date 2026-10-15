import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { KuponlarClient } from "@/components/admin/KuponlarClient";

export const metadata = { title: "Kuponlar" };

export default async function KuponlarPage() {
  await requireAdmin();

  const [coupons, plans] = await Promise.all([
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.plan.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { order: "asc" } }),
  ]);

  return <KuponlarClient initialCoupons={JSON.parse(JSON.stringify(coupons))} plans={plans} />;
}
