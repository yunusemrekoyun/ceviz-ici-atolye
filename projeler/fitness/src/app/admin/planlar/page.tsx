import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";
import { PlansList } from "@/components/admin/PlansList";

export default async function PlansPage() {
  const plans = await prisma.plan.findMany({
    orderBy: [{ isActive: "desc" }, { order: "asc" }],
    include: {
      _count: { select: { memberships: true } },
      memberships: {
        include: {
          member: { select: { memberNo: true, user: { select: { name: true } } } },
        },
        orderBy: [{ isActive: "desc" }, { endDate: "desc" }],
        take: 10,
      },
    },
  });
  const plain = plans.map((p) => ({ ...p, price: Number(p.price) }));

  return (
    <div>
      <PageHeader
        title="Üyelik Planları"
        subtitle={`${plans.length} plan tanımlı · sitede aktif olanlar görünür`}
      />
      <PlansList plans={plain} />
    </div>
  );
}
