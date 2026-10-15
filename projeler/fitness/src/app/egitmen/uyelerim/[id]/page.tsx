import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Calendar, Dumbbell, Plus, Apple } from "lucide-react";
import { TrainerMemberProgress } from "./TrainerMemberProgress";
import { NutritionPlanSection } from "./NutritionPlanSection";

export const metadata = { title: "Üye Detayı" };

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Planlandı", COMPLETED: "Tamamlandı",
  CANCELLED: "İptal", NO_SHOW: "Gelmedi",
};
const STATUS_CLASS: Record<string, string> = {
  SCHEDULED: "badge-info", COMPLETED: "badge-success",
  CANCELLED: "badge-danger", NO_SHOW: "badge-warn",
};

export default async function UyeDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(["TRAINER"]);
  const trainer = await prisma.trainer.findUnique({ where: { userId: user.sub } });
  if (!trainer) return null;

  const member = await prisma.member.findFirst({
    where: { id, trainerId: trainer.id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      memberships: {
        include: { plan: { select: { name: true, interval: true } } },
        orderBy: { createdAt: "desc" },
        take: 3,
      },
      programs: {
        where: { trainerId: trainer.id },
        include: {
          days: {
            include: { exercises: { select: { id: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      appointments: {
        where: { trainerId: trainer.id },
        orderBy: { startAt: "desc" },
        take: 10,
        select: { id: true, startAt: true, status: true, notes: true },
      },
      measurements: { orderBy: { recordedAt: "asc" } },
      progressPhotos: { orderBy: { takenAt: "desc" } },
      workoutSessions: {
        orderBy: { completedAt: "desc" },
        take: 10,
        include: { entries: { select: { done: true } } },
      },
      nutritionPlans: {
        where: { trainerId: trainer.id, isActive: true },
        include: {
          meals: {
            orderBy: { order: "asc" },
            include: { items: { orderBy: { order: "asc" }, include: { food: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!member) notFound();

  const activeMembership = member.memberships.find((ms) => ms.isActive);

  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
  const recentSessionCount = await prisma.workoutSession.count({
    where: { memberId: member.id, completedAt: { gte: fourWeeksAgo } },
  });

  // Beslenme uyumu — son 7 günün günlük toplamları
  const nutritionPlan = member.nutritionPlans[0] ?? null;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setHours(0, 0, 0, 0);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const nutritionDays = await prisma.foodLog.groupBy({
    by: ["date"],
    where: { memberId: member.id, date: { gte: sevenDaysAgo } },
    _sum: { kcal: true, protein: true },
    orderBy: { date: "desc" },
  });
  const nutritionAdherence = nutritionDays.map((d) => ({
    date: d.date.toISOString().slice(0, 10),
    kcal: Math.round(d._sum.kcal ?? 0),
    protein: Math.round(d._sum.protein ?? 0),
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/egitmen/uyelerim" className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary mb-4">
          <ArrowLeft className="w-4 h-4" /> Üyelerime Dön
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon/20 to-accent-cyan/20 grid place-items-center text-neon font-bold text-xl">
            {member.user.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{member.user.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              {activeMembership ? (
                <span className="badge badge-success">{activeMembership.plan.name}</span>
              ) : (
                <span className="badge badge-danger">Aktif üyelik yok</span>
              )}
              {member.user.email && (
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Mail className="w-3 h-3" /> {member.user.email}
                </span>
              )}
              {member.user.phone && (
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Phone className="w-3 h-3" /> {member.user.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Programs */}
        <div className="card-surface p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-neon" /> Antrenman Programları
            </h2>
            <Link href={`/egitmen/programlar?memberId=${member.id}`} className="btn-secondary btn-sm">
              <Plus className="w-3.5 h-3.5" /> Yeni Program
            </Link>
          </div>
          {member.programs.length === 0 ? (
            <div className="text-center py-8 text-muted text-sm">Henüz program oluşturulmamış.</div>
          ) : (
            <div className="space-y-3">
              {member.programs.map((p) => (
                <div key={p.id} className="p-4 rounded-xl bg-subtle border border-subtle">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm">{p.title}</div>
                      <div className="text-xs text-muted mt-0.5">
                        {p.days.length} gün · {p.days.reduce((s, d) => s + d.exercises.length, 0)} egzersiz
                      </div>
                    </div>
                    <span className={`badge ${p.isActive ? "badge-success" : "badge-neutral"}`}>
                      {p.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </div>
                  <div className="text-xs text-faint mt-2">
                    {new Date(p.startDate).toLocaleDateString("tr-TR")}
                    {p.endDate && ` — ${new Date(p.endDate).toLocaleDateString("tr-TR")}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Appointments */}
        <div className="card-surface p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-neon" /> Randevu Geçmişi
          </h2>
          {member.appointments.length === 0 ? (
            <div className="text-center py-8 text-muted text-sm">Randevu bulunamadı.</div>
          ) : (
            <div className="space-y-2">
              {member.appointments.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-subtle">
                  <div className="min-w-0">
                    <div className="text-sm">
                      {new Date(a.startAt).toLocaleString("tr-TR", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                    {a.notes && <div className="text-xs text-faint italic mt-0.5 truncate max-w-xs">{a.notes}</div>}
                  </div>
                  <span className={`badge ${STATUS_CLASS[a.status]} shrink-0`}>{STATUS_LABEL[a.status]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <NutritionPlanSection
        memberId={member.id}
        initialPlan={member.nutritionPlans[0] ? JSON.parse(JSON.stringify(member.nutritionPlans[0])) : null}
      />

      {/* Beslenme uyumu — son 7 gün */}
      <div className="card-surface p-6">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <Apple className="w-4 h-4 text-neon" /> Beslenme Uyumu
          <span className="text-xs text-muted font-normal">son 7 gün</span>
        </h2>
        {nutritionAdherence.length === 0 ? (
          <div className="text-center py-8 text-muted text-sm">Üye henüz beslenme kaydı girmemiş.</div>
        ) : (
          <div className="space-y-2.5">
            {nutritionAdherence.map((d) => {
              const target = nutritionPlan?.calorieTarget ?? null;
              const pct = target ? Math.min(100, (d.kcal / target) * 100) : 0;
              return (
                <div key={d.date} className="flex items-center gap-3">
                  <span className="text-xs text-muted w-20 shrink-0">
                    {new Date(d.date + "T00:00:00Z").toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-subtle overflow-hidden">
                    {target && <div className="h-full bg-neon" style={{ width: `${pct}%` }} />}
                  </div>
                  <span className="text-xs text-dim w-28 text-right shrink-0">
                    {d.kcal}{target ? ` / ${Math.round(target)}` : ""} kcal · P{d.protein}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TrainerMemberProgress
        measurements={member.measurements.map((m) => ({ ...m, recordedAt: m.recordedAt.toISOString() }))}
        photos={member.progressPhotos.map((p) => ({ ...p, takenAt: p.takenAt.toISOString() }))}
      />

      {/* Program uyumu — üyenin kendi kaydettiği antrenmanlar */}
      <div className="card-surface p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-neon" /> Antrenman Kayıtları
          </h2>
          <span className="text-xs text-muted">Son 4 haftada <strong className="text-neon">{recentSessionCount}</strong> antrenman</span>
        </div>
        {member.workoutSessions.length === 0 ? (
          <div className="text-center py-8 text-muted text-sm">
            Üye henüz antrenman kaydetmemiş. Kayıtlar panelindeki &quot;Yaptım&quot; butonuyla oluşur.
          </div>
        ) : (
          <div className="space-y-2">
            {member.workoutSessions.map((s) => {
              const doneCount = s.entries.filter((e) => e.done).length;
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-subtle">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {s.dayLabel || s.programTitle || "Antrenman"}
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      {new Date(s.completedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "short" })}
                      {s.notes && ` — ${s.notes}`}
                    </div>
                  </div>
                  <span className="badge badge-success shrink-0">{doneCount}/{s.entries.length} hareket</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
