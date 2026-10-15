import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Users, Calendar, Dumbbell, CheckCircle2, Clock, Star, AlertTriangle, Phone } from "lucide-react";
import Link from "next/link";
import { NotificationFeed } from "@/components/panel/NotificationFeed";

export const metadata = { title: "Eğitmen Paneli" };

function fmt(d: Date) {
  return d.toLocaleString("tr-TR", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Planlandı", COMPLETED: "Tamamlandı",
  CANCELLED: "İptal", NO_SHOW: "Gelmedi",
};
const STATUS_CLASS: Record<string, string> = {
  SCHEDULED: "badge-info", COMPLETED: "badge-success",
  CANCELLED: "badge-danger", NO_SHOW: "badge-warn",
};

export default async function EgitmenDashboard() {
  const user = await requireRole(["TRAINER"]);
  const trainer = await prisma.trainer.findUnique({ where: { userId: user.sub } });
  if (!trainer) return null;

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  const [memberCount, todayAppts, upcomingAppts, activePrograms, completedCount, rawNotifications, recentReviews, ratedCount, myMembers] = await Promise.all([
    prisma.member.count({ where: { trainerId: trainer.id } }),
    prisma.appointment.findMany({
      where: { trainerId: trainer.id, startAt: { gte: todayStart, lte: todayEnd } },
      include: { member: { include: { user: { select: { name: true } } } } },
      orderBy: { startAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { trainerId: trainer.id, startAt: { gt: now }, status: "SCHEDULED" },
      include: { member: { include: { user: { select: { name: true } } } } },
      orderBy: { startAt: "asc" },
      take: 5,
    }),
    prisma.workoutProgram.count({ where: { trainerId: trainer.id, isActive: true, isTemplate: false } }),
    prisma.appointment.count({ where: { trainerId: trainer.id, status: "COMPLETED" } }),
    prisma.notification.findMany({ where: { userId: user.sub }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.appointment.findMany({
      where: { trainerId: trainer.id, rating: { not: null } },
      orderBy: { ratedAt: "desc" },
      take: 5,
      select: {
        id: true, rating: true, ratingComment: true, ratedAt: true,
        member: { select: { user: { select: { name: true } } } },
      },
    }),
    prisma.appointment.count({ where: { trainerId: trainer.id, rating: { not: null } } }),
    prisma.member.findMany({
      where: { trainerId: trainer.id, status: "ACTIVE" },
      select: {
        id: true,
        user: { select: { name: true, phone: true } },
        attendances: { orderBy: { checkIn: "desc" }, take: 1, select: { checkIn: true } },
        workoutSessions: { orderBy: { completedAt: "desc" }, take: 1, select: { completedAt: true } },
      },
    }),
  ]);

  // 14+ gündür ne salona gelmiş ne antrenman kaydetmiş üyeler.
  const INACTIVE_DAYS = 14;
  const inactiveCutoff = new Date(now.getTime() - INACTIVE_DAYS * 24 * 60 * 60 * 1000);
  const inactiveMembers = myMembers
    .map((m) => {
      const lastCheckIn = m.attendances[0]?.checkIn ?? null;
      const lastWorkout = m.workoutSessions[0]?.completedAt ?? null;
      const lastActivity =
        lastCheckIn && lastWorkout
          ? (lastCheckIn > lastWorkout ? lastCheckIn : lastWorkout)
          : (lastCheckIn ?? lastWorkout);
      return { id: m.id, name: m.user.name, phone: m.user.phone, lastActivity };
    })
    .filter((m) => !m.lastActivity || m.lastActivity < inactiveCutoff)
    .sort((a, b) => (a.lastActivity?.getTime() ?? 0) - (b.lastActivity?.getTime() ?? 0))
    .slice(0, 6);

  const notifications = rawNotifications.map((n) => ({
    ...n,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }));
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const stats = [
    { label: "Toplam Üyem",        value: memberCount,       icon: Users,        color: "text-sky-400",     bg: "bg-sky-400/10" },
    { label: "Bugünkü Randevular", value: todayAppts.length, icon: Calendar,     color: "text-neon",        bg: "bg-neon/10" },
    { label: "Aktif Programlar",   value: activePrograms,    icon: Dumbbell,     color: "text-violet-400",  bg: "bg-violet-400/10" },
    { label: "Tamamlanan",         value: completedCount,    icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Hoş geldin 👋</h1>
        <p className="text-body mt-1">Günlük özetine bir bak.</p>
      </div>

      <NotificationFeed initialNotifications={notifications} initialUnreadCount={unreadCount} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card-surface p-5">
            <div className={`w-10 h-10 rounded-xl ${bg} grid place-items-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-muted mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-surface p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Bugünkü Randevular</h2>
            <Link href="/egitmen/randevular" className="text-xs text-neon hover:underline">Tümünü gör</Link>
          </div>
          {todayAppts.length === 0 ? (
            <div className="text-center py-8 text-muted text-sm">Bugün randevu yok</div>
          ) : (
            <div className="space-y-3">
              {todayAppts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-subtle">
                  <Clock className="w-4 h-4 text-neon shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{a.member.user.name}</div>
                    <div className="text-xs text-muted">{fmt(a.startAt)}</div>
                  </div>
                  <span className={`badge ${STATUS_CLASS[a.status]}`}>{STATUS_LABEL[a.status]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-surface p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Yaklaşan Randevular</h2>
            <Link href="/egitmen/randevular" className="text-xs text-neon hover:underline">Tümünü gör</Link>
          </div>
          {upcomingAppts.length === 0 ? (
            <div className="text-center py-8 text-muted text-sm">Yaklaşan randevu yok</div>
          ) : (
            <div className="space-y-3">
              {upcomingAppts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-subtle">
                  <div className="w-8 h-8 rounded-lg bg-neon/10 grid place-items-center shrink-0">
                    <Calendar className="w-4 h-4 text-neon" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{a.member.user.name}</div>
                    <div className="text-xs text-muted">{fmt(a.startAt)}</div>
                  </div>
                  <span className={`badge ${STATUS_CLASS[a.status]}`}>{STATUS_LABEL[a.status]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Değerlendirmeler */}
        <div className="card-surface p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" /> Değerlendirmelerim
            </h2>
            {ratedCount > 0 && (
              <span className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <strong>{trainer.rating.toFixed(1)}</strong>
                <span className="text-xs text-muted">({ratedCount} puan)</span>
              </span>
            )}
          </div>
          {recentReviews.length === 0 ? (
            <div className="text-center py-8 text-muted text-sm">
              Henüz değerlendirme yok. Üyeler tamamlanan seanslardan sonra puan verebilir.
            </div>
          ) : (
            <div className="space-y-3">
              {recentReviews.map((r) => (
                <div key={r.id} className="p-3 rounded-xl bg-subtle">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium truncate">{r.member.user.name}</div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`w-3.5 h-3.5 ${n <= (r.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-subtle-md"}`}
                        />
                      ))}
                    </div>
                  </div>
                  {r.ratingComment && (
                    <p className="text-xs text-body mt-1.5">&ldquo;{r.ratingComment}&rdquo;</p>
                  )}
                  {r.ratedAt && (
                    <div className="text-[10px] text-faint mt-1">
                      {new Date(r.ratedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* İlgi bekleyenler */}
        <div className="card-surface p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> İlgi Bekleyenler
          </h2>
          {inactiveMembers.length === 0 ? (
            <div className="text-center py-8 text-muted text-sm">
              Harika — tüm üyelerin son {INACTIVE_DAYS} günde aktifti. 💪
            </div>
          ) : (
            <div className="space-y-3">
              {inactiveMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-subtle">
                  <div className="flex-1 min-w-0">
                    <Link href={`/egitmen/uyelerim/${m.id}`} className="text-sm font-medium truncate hover:text-neon transition-colors block">
                      {m.name}
                    </Link>
                    <div className="text-xs text-amber-300/80 mt-0.5">
                      {m.lastActivity
                        ? `${Math.floor((now.getTime() - m.lastActivity.getTime()) / 86_400_000)} gündür aktivite yok`
                        : "Hiç aktivite kaydı yok"}
                    </div>
                  </div>
                  {m.phone && (
                    <a
                      href={`tel:${m.phone}`}
                      className="p-2 rounded-lg text-muted hover:text-neon hover:bg-subtle-md transition-colors shrink-0"
                      title="Ara"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
