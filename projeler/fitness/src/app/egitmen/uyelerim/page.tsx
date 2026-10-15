import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Users, Dumbbell, ChevronRight } from "lucide-react";

export const metadata = { title: "Üyelerim" };

export default async function UyelerimPage() {
  const user = await requireRole(["TRAINER"]);
  const trainer = await prisma.trainer.findUnique({ where: { userId: user.sub } });
  if (!trainer) return null;

  const members = await prisma.member.findMany({
    where: { trainerId: trainer.id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      memberships: {
        where: { isActive: true },
        take: 1,
        include: { plan: { select: { name: true } } },
      },
      programs: {
        where: { trainerId: trainer.id, isActive: true },
        select: { id: true, title: true },
        take: 1,
      },
      appointments: {
        where: { trainerId: trainer.id },
        orderBy: { startAt: "desc" },
        take: 1,
        select: { startAt: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Üyelerim</h1>
        <p className="text-body text-sm mt-0.5">{members.length} üye atanmış</p>
      </div>

      {members.length === 0 ? (
        <div className="card-surface p-16 text-center">
          <Users className="w-12 h-12 text-muted mx-auto mb-3" />
          <div className="font-medium">Henüz üye atanmamış</div>
          <div className="text-sm text-muted mt-1">Admin seni üyelere atadığında burada görünür.</div>
        </div>
      ) : (
        <div className="card-surface divide-y divide-subtle">
          {members.map((m) => {
            const activeMembership = m.memberships[0];
            const activeProgram    = m.programs[0];
            const lastAppt         = m.appointments[0];
            return (
              <Link
                key={m.id}
                href={`/egitmen/uyelerim/${m.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-subtle transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon/20 to-accent-cyan/20 grid place-items-center text-neon font-bold text-sm shrink-0">
                  {m.user.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{m.user.name}</div>
                  <div className="text-xs text-muted truncate">{m.user.email}</div>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                  {activeMembership ? (
                    <span className="badge badge-success">{activeMembership.plan.name}</span>
                  ) : (
                    <span className="badge badge-neutral">Üyelik yok</span>
                  )}
                  {activeProgram ? (
                    <span className="flex items-center gap-1 text-xs text-neon">
                      <Dumbbell className="w-3 h-3" /> {activeProgram.title}
                    </span>
                  ) : (
                    <span className="text-xs text-muted">Program yok</span>
                  )}
                </div>
                {lastAppt && (
                  <div className="hidden md:block text-right text-xs text-muted shrink-0 w-28">
                    <div>Son randevu</div>
                    <div>{new Date(lastAppt.startAt).toLocaleDateString("tr-TR")}</div>
                  </div>
                )}
                <ChevronRight className="w-4 h-4 text-faint shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
