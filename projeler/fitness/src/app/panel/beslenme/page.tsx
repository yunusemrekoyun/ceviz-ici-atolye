import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BeslenmeClient } from "@/components/panel/BeslenmeClient";

export const metadata = { title: "Beslenme" };

export default async function BeslenmePage() {
  const user = await requireUser();
  const member = await prisma.member.findUnique({ where: { userId: user.sub }, select: { id: true } });

  const plan = member
    ? await prisma.nutritionPlan.findFirst({
        where: { memberId: member.id, isActive: true },
        include: { meals: { orderBy: { order: "asc" }, include: { items: { orderBy: { order: "asc" }, include: { food: true } } } } },
        orderBy: { createdAt: "desc" },
      })
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Beslenme</h1>
        <p className="text-body text-sm mt-0.5">Öğünlerini kaydet, hedeflerini takip et.</p>
      </div>
      <BeslenmeClient plan={plan ? JSON.parse(JSON.stringify(plan)) : null} />
    </div>
  );
}
