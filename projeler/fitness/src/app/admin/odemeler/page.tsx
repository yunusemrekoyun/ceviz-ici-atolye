import { prisma } from "@/lib/prisma";
import { PaymentsClient } from "@/components/admin/PaymentsClient";
import { PaymentStatus, MemberStatus } from "@prisma/client";

export default async function PaymentsPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [payments, total, monthRevAgg, pending, failed, members] = await Promise.all([
    prisma.payment.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { member: { include: { user: { select: { name: true, email: true } } } } },
    }),
    prisma.payment.count(),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: PaymentStatus.PAID, paidAt: { gte: startOfMonth } } }),
    prisma.payment.count({ where: { status: PaymentStatus.PENDING } }),
    prisma.payment.count({ where: { status: PaymentStatus.FAILED } }),
    prisma.member.findMany({
      where: { status: MemberStatus.ACTIVE },
      select: { id: true, memberNo: true, user: { select: { name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return (
    <PaymentsClient
      initialPayments={JSON.parse(JSON.stringify(payments))}
      initialTotal={total}
      initialStats={{
        monthRevenue: Number(monthRevAgg._sum.amount || 0),
        pending,
        failed,
      }}
      members={members}
    />
  );
}
