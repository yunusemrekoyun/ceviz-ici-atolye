import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Role } from "@prisma/client";
import { EkipClient } from "@/components/admin/EkipClient";

export const metadata = { title: "Ekip" };

export default async function EkipPage() {
  const admin = await requireAdmin();

  const staff = await prisma.user.findMany({
    where: { role: { in: [Role.ADMIN, Role.STAFF] } },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return <EkipClient initialStaff={JSON.parse(JSON.stringify(staff))} currentUserId={admin.sub} />;
}
