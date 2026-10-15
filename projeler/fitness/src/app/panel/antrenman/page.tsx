import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Calendar, CalendarPlus, ChevronRight, Clock, Dumbbell, Plus } from "lucide-react";
import Link from "next/link";
import { CancelAppointmentBtn } from "@/components/panel/CancelAppointmentBtn";
import { RateAppointmentBtn } from "@/components/panel/RateAppointmentBtn";
import { LogWorkoutBtn } from "@/components/panel/LogWorkoutBtn";
import { Star } from "lucide-react";
import { BookAppointmentClient } from "@/components/panel/BookAppointmentClient";
import { PageTabs } from "@/components/ui/PageTabs";

const DAY_NAMES = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

const TABS = [
  { key: "randevularim", label: "Randevularım" },
  { key: "programim",    label: "Programım" },
  { key: "randevu-al",   label: "Randevu Al" },
];

export default async function AntrenmanPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; booked?: string }>;
}) {
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "randevularim";

  const user = await requireUser();
  const member = await prisma.member.findUnique({ where: { userId: user.sub } });

  const appointments =
    tab === "randevularim" && member
      ? await prisma.appointment.findMany({
          where: { memberId: member.id },
          include: { trainer: { include: { user: { select: { name: true } } } } },
          orderBy: { startAt: "desc" },
          take: 20,
        })
      : [];

  // Haftalık antrenman özeti + bugün kaydedilen günler (Pazartesi başlangıçlı hafta).
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const weekSessions =
    tab === "programim" && member
      ? await prisma.workoutSession.findMany({
          where: { memberId: member.id, completedAt: { gte: weekStart } },
          select: { dayId: true, completedAt: true },
        })
      : [];
  const loggedTodayDayIds = new Set(
    weekSessions.filter((s) => s.completedAt >= todayStart && s.dayId).map((s) => s.dayId as string)
  );

  const programs =
    tab === "programim" && member
      ? await prisma.workoutProgram.findMany({
          where: { memberId: member.id, isActive: true, isTemplate: false },
          include: {
            trainer: { include: { user: { select: { name: true } } } },
            days: {
              include: { exercises: { orderBy: { order: "asc" } } },
              orderBy: { dayNumber: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

  const trainers =
    tab === "randevu-al"
      ? await prisma.trainer.findMany({
          where: { isActive: true },
          include: {
            user: { select: { name: true, avatarUrl: true } },
            availabilities: { orderBy: { dayOfWeek: "asc" } },
          },
          orderBy: { rating: "desc" },
        })
      : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-body">Panel</div>
          <h1 className="text-2xl font-bold mt-0.5">Antrenman</h1>
        </div>
        {tab === "randevularim" && (
          <Link href="/panel/antrenman?tab=randevu-al" className="btn-primary btn-sm">
            <Plus className="w-4 h-4" /> Randevu Al
          </Link>
        )}
      </div>

      <PageTabs tabs={TABS} active={tab} baseHref="/panel/antrenman" />

      {/* ── Randevularım ── */}
      {tab === "randevularim" && (
        <>
          {sp.booked === "1" && (
            <div className="card-surface p-4 border-emerald-500/20 bg-emerald-500/5 text-sm text-emerald-300 flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0" />
              Randevun başarıyla oluşturuldu!
            </div>
          )}
          {appointments.length === 0 ? (
            <div className="card-surface p-12 text-center">
              <Calendar className="w-10 h-10 text-neon/40 mx-auto" />
              <div className="mt-4 text-muted">Henüz randevun yok.</div>
              <Link href="/panel/antrenman?tab=randevu-al" className="mt-4 btn-primary btn-sm inline-flex">
                <Plus className="w-4 h-4" /> İlk Randevunu Al
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((a) => (
                <div key={a.id} className="card-surface p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-neon/10 grid place-items-center shrink-0">
                      <Calendar className="w-5 h-5 text-neon" />
                    </div>
                    <div>
                      <div className="font-medium">{a.trainer.user.name}</div>
                      <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(a.startAt)}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{Math.round((new Date(a.endAt).getTime() - new Date(a.startAt).getTime()) / 60000)} dk</span>
                      </div>
                      {a.notes && <div className="text-xs text-faint mt-1 truncate max-w-[240px]">{a.notes}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`badge ${
                      a.status === "SCHEDULED" ? "badge-warn" :
                      a.status === "COMPLETED" ? "badge-success" : "badge-neutral"
                    }`}>
                      {a.status === "SCHEDULED" ? "Planlandı" : a.status === "COMPLETED" ? "Tamamlandı" : a.status === "CANCELLED" ? "İptal" : "Gelmedi"}
                    </span>
                    {a.status === "SCHEDULED" && new Date(a.startAt) > new Date() && (
                      <>
                        <a
                          href={`/api/panel/ics?appointment=${a.id}`}
                          title="Takvime Ekle"
                          className="p-2 rounded-lg text-muted hover:text-neon hover:bg-subtle transition-colors"
                        >
                          <CalendarPlus className="w-4 h-4" />
                        </a>
                        <CancelAppointmentBtn appointmentId={a.id} />
                      </>
                    )}
                    {a.status === "COMPLETED" && a.rating == null && (
                      <RateAppointmentBtn appointmentId={a.id} trainerName={a.trainer.user.name} />
                    )}
                    {a.rating != null && (
                      <span className="flex items-center gap-1 text-xs text-amber-300" title="Verdiğin puan">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {a.rating}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Programım ── */}
      {tab === "programim" && (
        <>
          {programs.length === 0 ? (
            <div className="card-surface p-12 text-center">
              <Dumbbell className="w-10 h-10 text-neon/30 mx-auto" />
              <div className="mt-4 text-label">Henüz bir program atanmadı.</div>
              <p className="mt-2 text-sm text-faint">Antrenörün sana özel program oluşturduğunda burada görünecek.</p>
            </div>
          ) : (
            <>
              <div className="cta-card relative overflow-hidden rounded-2xl p-6">
                <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-neon/15 blur-[60px]" />
                <div className="relative">
                  <div className="text-xs text-neon font-semibold uppercase tracking-wider mb-1">Aktif Program</div>
                  <h2 className="text-xl font-bold">{programs[0].title}</h2>
                  {programs[0].description && <p className="mt-1 text-sm text-body">{programs[0].description}</p>}
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(programs[0].startDate).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
                      {programs[0].endDate && ` — ${new Date(programs[0].endDate).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}`}
                    </span>
                    <span>Antrenör: <span className="text-dim">{programs[0].trainer.user.name}</span></span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 text-xs">
                    <Dumbbell className="w-3.5 h-3.5 text-neon" />
                    Bu hafta <strong className="text-neon">{weekSessions.length}</strong> antrenman kaydettin
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {programs[0].days.map((day) => (
                  <details key={day.id} className="card-surface group">
                    <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-subtle list-none">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-neon/10 grid place-items-center text-sm font-bold text-neon">
                          {day.dayNumber}
                        </div>
                        <div>
                          <div className="font-medium">{DAY_NAMES[day.dayNumber - 1]}</div>
                          {day.label && <div className="text-xs text-neon/70">{day.label}</div>}
                        </div>
                        <span className="badge badge-neutral text-xs ml-2">{day.exercises.length} egzersiz</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <LogWorkoutBtn
                          dayId={day.id}
                          dayName={DAY_NAMES[day.dayNumber - 1]}
                          dayLabel={day.label}
                          exercises={day.exercises.map((ex) => ({ name: ex.name, sets: ex.sets, reps: ex.reps }))}
                          loggedToday={loggedTodayDayIds.has(day.id)}
                        />
                        <ChevronRight className="w-4 h-4 text-faint group-open:rotate-90 transition-transform" />
                      </div>
                    </summary>
                    <div className="px-5 pb-5 border-t border-subtle pt-4 space-y-2">
                      {day.exercises.map((ex, idx) => (
                        <div key={ex.id} className="flex items-start gap-3 py-3 border-b border-subtle last:border-0">
                          <span className="text-xs text-faint font-mono w-5 mt-1">{idx + 1}</span>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{ex.name}</div>
                            <div className="flex flex-wrap gap-3 mt-1.5">
                              {ex.sets && <span className="text-xs text-muted"><span className="text-neon font-semibold">{ex.sets}</span> set</span>}
                              {ex.reps && <span className="text-xs text-muted"><span className="text-neon font-semibold">{ex.reps}</span> tekrar</span>}
                              {ex.durationSec && <span className="text-xs text-muted"><span className="text-neon font-semibold">{ex.durationSec}</span> sn</span>}
                              {ex.restSec && <span className="text-xs text-muted">{ex.restSec} sn dinlenme</span>}
                            </div>
                            {ex.notes && <div className="text-xs text-faint mt-1 italic">{ex.notes}</div>}
                            {ex.videoUrl && (
                              <a href={ex.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-neon hover:underline mt-1 inline-block">
                                Video göster →
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
              {programs.length > 1 && (
                <div className="text-xs text-faint text-center">{programs.length - 1} eski program arşivlendi.</div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Randevu Al ── */}
      {tab === "randevu-al" && (
        <>
          {!member ? (
            <div className="card-surface p-12 text-center text-muted">Üye kaydınız bulunamadı.</div>
          ) : (
            <BookAppointmentClient
              trainers={trainers.map((t) => ({
                id: t.id,
                name: t.user.name ?? "—",
                avatarUrl: t.user.avatarUrl ?? null,
                specialty: t.specialty ?? null,
                experience: t.experience,
                rating: t.rating,
                availableDays: t.availabilities.map((a) => a.dayOfWeek),
              }))}
            />
          )}
        </>
      )}
    </div>
  );
}
