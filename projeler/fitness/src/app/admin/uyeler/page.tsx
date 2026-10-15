import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MemberStatus } from "@prisma/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { MembersTable } from "@/components/admin/MembersTable";
import { NewMemberButton } from "@/components/admin/NewMemberButton";
import { Filter, Download, Search } from "lucide-react";

const statusLabel: Record<MemberStatus, string> = {
  ACTIVE: "Aktif", EXPIRED: "Süresi Dolmuş", FROZEN: "Donduruldu", SUSPENDED: "Askıda", PENDING: "Beklemede",
};

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const sp = await searchParams;
  const where: any = {};
  if (sp.status && sp.status in MemberStatus) where.status = sp.status;
  if (sp.q) {
    where.OR = [
      { memberNo: { contains: sp.q, mode: "insensitive" } },
      { user: { name: { contains: sp.q, mode: "insensitive" } } },
      { user: { email: { contains: sp.q, mode: "insensitive" } } },
    ];
  }

  const [members, counts, plans, trainers, branches] = await Promise.all([
    prisma.member.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, phone: true } },
        memberships: {
          where: { isActive: true },
          take: 1,
          orderBy: { endDate: "desc" },
          include: { plan: { select: { name: true } } },
        },
        trainer: { select: { id: true, user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.member.groupBy({ by: ["status"], _count: true }),
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    prisma.trainer.findMany({ where: { isActive: true }, select: { id: true, user: { select: { name: true } } } }),
    prisma.branch.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
  ]);

  const total = counts.reduce((s, c) => s + c._count, 0);
  const plainPlans = plans.map((p) => ({ ...p, price: Number(p.price) }));

  return (
    <div>
      <PageHeader
        title="Üyeler"
        subtitle={`${total} üye sistemde kayıtlı`}
        actions={
          <>
            <a
              href={`/api/export/members${sp.status && sp.status in MemberStatus ? `?status=${sp.status}` : ""}`}
              className="btn-secondary btn-md"
            >
              <Download className="w-4 h-4" />Dışa Aktar
            </a>
            <NewMemberButton plans={plainPlans} trainers={trainers} branches={branches} />
          </>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <Link href="/admin/uyeler" className={`badge ${!sp.status ? "badge-neon" : "badge-neutral"} hover:bg-subtle-md`}>Tümü · {total}</Link>
        {(["ACTIVE", "EXPIRED", "FROZEN", "SUSPENDED"] as MemberStatus[]).map((s) => {
          const c = counts.find((x) => x.status === s)?._count || 0;
          const active = sp.status === s;
          return (
            <Link key={s} href={`/admin/uyeler?status=${s}`} className={`badge ${active ? "badge-neon" : "badge-neutral"} hover:bg-subtle-md`}>
              {statusLabel[s]} · {c}
            </Link>
          );
        })}
      </div>

      <div className="card-surface overflow-hidden">
        <form className="p-4 border-b border-subtle flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
            <input
              name="q"
              defaultValue={sp.q}
              placeholder="İsim, e-posta veya üye no ile ara..."
              className="input-base pl-10"
            />
          </div>
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <button className="btn-secondary btn-md"><Filter className="w-4 h-4" />Filtrele</button>
        </form>

        <MembersTable
          members={members as any}
          plans={plainPlans}
          trainers={trainers}
          branches={branches}
        />
      </div>
    </div>
  );
}
