import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CheckoutClient } from "@/components/panel/CheckoutClient";
import { ShoppingCart } from "lucide-react";

export default async function SatinAlPage() {
  const user = await requireUser();

  const [plans, member, contactSettings] = await Promise.all([
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    prisma.member.findUnique({
      where: { userId: user.sub },
      include: {
        memberships: {
          where: { isActive: true, endDate: { gt: new Date() } },
          include: { plan: true },
          orderBy: { endDate: "desc" },
          take: 1,
        },
      },
    }),
    prisma.siteSetting.findMany({
      where: { key: { in: ["contact.phone", "contact.email", "contact.address", "contact.whatsapp", "general.businessName"] } },
    }),
  ]);

  const activeMembership = member?.memberships[0] ?? null;
  const contact = Object.fromEntries(contactSettings.map((s) => [s.key, s.value]));

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-body">Hesabım</div>
        <h1 className="text-2xl font-bold mt-0.5">Üyelik Satın Al</h1>
      </div>

      {activeMembership && (
        <div className="card-surface p-4 border-neon/20 bg-neon/5 flex items-center gap-3 text-sm">
          <ShoppingCart className="w-4 h-4 text-neon shrink-0" />
          <span>
            Aktif üyeliğin:{" "}
            <span className="text-neon font-medium">{activeMembership.plan.name}</span>
            {" — "}
            {new Date(activeMembership.endDate).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })} tarihine kadar geçerli.
            Yeni plan seçersen mevcut üyeliğin üzerine eklenir.
          </span>
        </div>
      )}

      <CheckoutClient
        plans={plans.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description ?? "",
          price: Number(p.price),
          interval: p.interval,
          durationDays: p.durationDays,
          features: p.features,
          isPopular: p.isPopular,
        }))}
        contact={{
          businessName: contact["general.businessName"] || "Spor Merkezi",
          phone:     contact["contact.phone"] || "",
          whatsapp:  contact["contact.whatsapp"] || "",
          email:     contact["contact.email"] || "",
          address:   contact["contact.address"] || "",
        }}
      />
    </div>
  );
}
