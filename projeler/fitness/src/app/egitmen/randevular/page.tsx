import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UpcomingList } from "./UpcomingList";
import { PastList } from "./PastList";

export const metadata = { title: "Randevularım" };

const AGENDA_DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function timeFmt(d: Date) {
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export default async function RandevularPage() {
  const user = await requireRole(["TRAINER"]);
  const trainer = await prisma.trainer.findUnique({ where: { userId: user.sub } });
  if (!trainer) return null;

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [upcoming, past, weekAppts, weekClasses] = await Promise.all([
    prisma.appointment.findMany({
      where: { trainerId: trainer.id, startAt: { gte: now }, status: "SCHEDULED" },
      include: { member: { include: { user: { select: { name: true, phone: true } } } } },
      orderBy: { startAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { trainerId: trainer.id, startAt: { lt: now } },
      include: { member: { include: { user: { select: { name: true } } } } },
      orderBy: { startAt: "desc" },
      take: 30,
    }),
    prisma.appointment.findMany({
      where: { trainerId: trainer.id, status: "SCHEDULED", startAt: { gte: weekStart, lt: weekEnd } },
      include: { member: { include: { user: { select: { name: true } } } } },
      orderBy: { startAt: "asc" },
    }),
    prisma.groupClass.findMany({
      where: { trainerId: trainer.id, status: "SCHEDULED", startAt: { gte: weekStart, lt: weekEnd } },
      select: { id: true, title: true, startAt: true },
      orderBy: { startAt: "asc" },
    }),
  ]);

  // Randevu + dersleri gün bazında birleştir (Pazartesi=0).
  const agenda: { time: Date; label: string; kind: "randevu" | "ders" }[][] =
    Array.from({ length: 7 }, () => []);
  for (const a of weekAppts) {
    agenda[(a.startAt.getDay() + 6) % 7].push({ time: a.startAt, label: a.member.user.name, kind: "randevu" });
  }
  for (const c of weekClasses) {
    agenda[(c.startAt.getDay() + 6) % 7].push({ time: c.startAt, label: c.title, kind: "ders" });
  }
  for (const day of agenda) day.sort((a, b) => a.time.getTime() - b.time.getTime());
  const todayIdx = (now.getDay() + 6) % 7;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Randevularım</h1>
        <p className="text-body text-sm mt-0.5">{upcoming.length} yaklaşan · {past.length} geçmiş</p>
      </div>

      {/* Bu hafta — randevular ve dersler tek bakışta */}
      <div className="card-surface p-5 overflow-x-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">Bu Hafta</h2>
          <div className="flex items-center gap-3 text-[10px] text-muted">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neon" /> Randevu</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400" /> Ders</span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 min-w-[640px]">
          {AGENDA_DAYS.map((label, i) => {
            const dayDate = new Date(weekStart);
            dayDate.setDate(dayDate.getDate() + i);
            return (
              <div key={label} className={`rounded-xl p-2 ${i === todayIdx ? "bg-neon/5 border border-neon/20" : "bg-subtle"}`}>
                <div className={`text-[10px] font-semibold mb-1.5 ${i === todayIdx ? "text-neon" : "text-muted"}`}>
                  {label} {dayDate.getDate()}
                </div>
                {agenda[i].length === 0 ? (
                  <div className="text-[10px] text-faint py-2 text-center">—</div>
                ) : (
                  <div className="space-y-1">
                    {agenda[i].map((item, j) => (
                      <div
                        key={j}
                        className={`rounded-lg px-1.5 py-1 text-[10px] leading-tight border-l-2 ${
                          item.kind === "randevu"
                            ? "bg-neon/10 border-neon"
                            : "bg-sky-400/10 border-sky-400"
                        }`}
                      >
                        <div className="font-mono">{timeFmt(item.time)}</div>
                        <div className="truncate font-medium">{item.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming — client component (handles cancel) */}
      <UpcomingList
        appointments={upcoming.map((a) => ({
          id: a.id,
          startAt: a.startAt.toISOString(),
          endAt: a.endAt.toISOString(),
          notes: a.notes,
          memberName: a.member.user.name,
          memberPhone: a.member.user.phone ?? null,
        }))}
      />

      {/* Past — client component (handles marking completed/no-show) */}
      <PastList
        appointments={past.map((a) => ({
          id: a.id,
          startAt: a.startAt.toISOString(),
          status: a.status,
          memberName: a.member.user.name,
          notes: a.notes,
        }))}
      />
    </div>
  );
}
