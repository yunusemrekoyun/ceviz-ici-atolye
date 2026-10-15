import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatDate, formatTRY, daysBetween, initials } from "@/lib/utils";
import { Activity, Calendar, Clock, CreditCard, Sparkles, UserRound } from "lucide-react";
import { NotificationFeed } from "@/components/panel/NotificationFeed";
import { ProgressChartLazy as ProgressChart } from "@/components/panel/ProgressChartLazy";
import { AchievementsCard } from "@/components/panel/AchievementsCard";
import { NutritionTodayCard } from "@/components/panel/NutritionTodayCard";
import { computeAchievements } from "@/lib/achievements";
import { getCurrentOccupancy } from "@/lib/occupancy";
import Link from "next/link";

export default async function MemberPanel() {
  const user = await requireUser();

  const [member, rawNotifications] = await Promise.all([
    prisma.member.findUnique({
      where: { userId: user.sub },
      include: {
        memberships: { where: { isActive: true }, include: { plan: true }, take: 1, orderBy: { endDate: "desc" } },
        payments: { where: { status: "PAID" }, take: 5, orderBy: { paidAt: "desc" } },
        attendances: { take: 5, orderBy: { checkIn: "desc" } },
        measurements: { orderBy: { recordedAt: "asc" } },
      },
    }),
    prisma.notification.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, title: true, body: true, type: true, readAt: true, createdAt: true },
    }),
  ]);

  const [allCheckIns, occupancy] = await Promise.all([
    member
      ? prisma.attendance.findMany({
          where: { memberId: member.id },
          select: { checkIn: true },
        })
      : Promise.resolve([]),
    getCurrentOccupancy(),
  ]);
  const achievements = computeAchievements(allCheckIns.map((a) => a.checkIn));

  if (!member) {
    return (
      <div className="card-surface p-12 text-center">
        <Sparkles className="w-8 h-8 mx-auto text-neon" />
        <div className="mt-4 text-xl font-bold">Hesabın hazır</div>
        <p className="mt-2 text-body">Bir plan seçerek üyeliğini aktive et.</p>
        <Link href="/panel/satin-al" className="mt-6 btn-primary btn-md inline-flex">Üyelik Al</Link>
      </div>
    );
  }

  const active = member.memberships[0];
  const remaining = active ? daysBetween(new Date(), active.endDate) : 0;

  const nutritionPlan = await prisma.nutritionPlan.findFirst({
    where: { memberId: member.id, isActive: true },
    select: { calorieTarget: true },
  });

  const TRIAL_DAYS = 7;
  const trialEnd = new Date(member.createdAt);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
  const now = new Date();
  const isOnTrial = !active && now < trialEnd;
  const trialDaysLeft = isOnTrial
    ? Math.max(1, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const lastMeasurement = member.measurements.at(-1);

  const profileIncomplete = !member.heightCm || !member.startWeightKg || !member.birthDate || !member.gender;

  const notifications = rawNotifications.map((n) => ({
    ...n,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }));
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-body">Hoş geldin,</div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon to-accent-cyan grid place-items-center text-ink-950 font-bold">
          {initials(user.name)}
        </div>
      </div>

      {!active && isOnTrial && (
        <div className="card-surface p-5 border-neon/20 bg-neon/5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neon/10 grid place-items-center shrink-0">
              <Clock className="w-4 h-4 text-neon" />
            </div>
            <div>
              <div className="text-sm font-medium">
                <span className="text-neon font-bold">{trialDaysLeft} gün</span> deneme hakkın kaldı
              </div>
              <div className="text-xs text-muted">
                Deneme süresi {formatDate(trialEnd)} tarihinde sona eriyor. Kesintisiz erişim için üyelik al.
              </div>
            </div>
          </div>
          <Link href="/panel/satin-al" className="btn-primary btn-sm shrink-0">Üyelik Al</Link>
        </div>
      )}

      {!active && !isOnTrial && (
        <div className="card-surface p-5 border-amber-500/20 bg-amber-500/5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-sm font-medium">Deneme süren sona erdi</div>
              <div className="text-xs text-muted">Bir plan satın alarak tüm özelliklere yeniden erişebilirsin.</div>
            </div>
          </div>
          <Link href="/panel/satin-al" className="btn-primary btn-sm shrink-0">Üyelik Al</Link>
        </div>
      )}

      {profileIncomplete && (
        <Link
          href="/panel/profil"
          className="card-surface p-4 border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 flex items-center justify-between gap-4 flex-wrap transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 grid place-items-center shrink-0">
              <UserRound className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <div className="text-sm font-medium">Profilini tamamla</div>
              <div className="text-xs text-muted">Boy, kilo ve kişisel bilgilerini girerek ilerleme takibini etkinleştir.</div>
            </div>
          </div>
          <span className="text-xs font-semibold text-violet-400 group-hover:translate-x-0.5 transition-transform shrink-0">
            Bilgileri Gir →
          </span>
        </Link>
      )}

      <div className="cta-card relative overflow-hidden rounded-3xl p-6 md:p-8">
        <div className="cta-blob absolute -top-20 -right-20 w-64 h-64 rounded-full bg-neon/20 blur-[80px]" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs text-neon font-semibold tracking-wider uppercase">Üyelik Kartı</div>
            <div className="mt-2 text-3xl font-bold">
              {active?.plan.name ?? (isOnTrial ? "Deneme Süresi" : "Plan Seçilmedi")}
            </div>
            <div className="mt-1 text-sm text-body">Üye No: <span className="font-mono text-primary">{member.memberNo}</span></div>
            {active && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-subtle">
                <Calendar className="w-4 h-4 text-neon" />
                <span className="text-sm">Bitiş: <strong>{formatDate(active.endDate)}</strong></span>
                <span className="text-xs text-body">({remaining} gün)</span>
              </div>
            )}
            {!active && isOnTrial && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neon/10">
                <Clock className="w-4 h-4 text-neon" />
                <span className="text-sm">Bitiş: <strong>{formatDate(trialEnd)}</strong></span>
                <span className="text-xs text-body">({trialDaysLeft} gün kaldı)</span>
              </div>
            )}
          </div>
          <div className="text-center">
            <div className="w-32 h-32 rounded-2xl bg-white overflow-hidden p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/qr/${encodeURIComponent(member.qrCode)}`} alt="QR Kod" className="w-full h-full" />
            </div>
            <div className="text-xs text-body mt-2">Girişte göster</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-surface p-5">
          <div className="flex items-center gap-3"><Activity className="w-4 h-4 text-neon" /><div className="text-sm text-body">Bu hafta</div></div>
          <div className="mt-2 text-3xl font-bold">{member.attendances.filter((a) => daysBetween(a.checkIn, new Date()) <= 7).length}</div>
          <div className="text-xs text-muted">check-in</div>
        </div>
        <div className="card-surface p-5">
          <div className="flex items-center gap-3"><CreditCard className="w-4 h-4 text-neon" /><div className="text-sm text-body">Toplam ödeme</div></div>
          <div className="mt-2 text-3xl font-bold text-neon">{formatTRY(member.payments.reduce((s, p) => s + Number(p.amount), 0))}</div>
        </div>
        <div className="card-surface p-5">
          <div className="flex items-center gap-3"><Sparkles className="w-4 h-4 text-neon" /><div className="text-sm text-body">Son kilo</div></div>
          <div className="mt-2 text-3xl font-bold">{lastMeasurement?.weightKg ? `${lastMeasurement.weightKg} kg` : "—"}</div>
        </div>
        <div className="card-surface p-5">
          <div className="flex items-center gap-3"><UserRound className="w-4 h-4 text-neon" /><div className="text-sm text-body">Salon şu an</div></div>
          <div className="mt-2 flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              occupancy.level === "sakin" ? "bg-emerald-400" : occupancy.level === "orta" ? "bg-amber-400" : "bg-rose-400"
            }`} />
            <span className="text-xl font-bold">{occupancy.label}</span>
          </div>
          <div className="text-xs text-muted mt-1">~{occupancy.count} kişi içeride</div>
        </div>
      </div>

      <AchievementsCard achievements={achievements} />

      <NutritionTodayCard calorieTarget={nutritionPlan?.calorieTarget ?? null} />

      <NotificationFeed initialNotifications={notifications} initialUnreadCount={unreadCount} />

      <ProgressChart
        initialMeasurements={member.measurements.map((m) => ({
          ...m,
          recordedAt: m.recordedAt.toISOString(),
        }))}
        targetWeightKg={member.targetWeightKg}
        startWeightKg={member.startWeightKg}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-surface p-6">
          <div className="font-semibold mb-3">Son Ödemeler</div>
          {member.payments.length === 0 && <div className="text-muted text-sm py-4">Henüz ödeme yok</div>}
          {member.payments.map((p) => (
            <div key={p.id} className="flex justify-between py-2 border-b border-subtle last:border-0">
              <div>
                <div className="text-sm">{p.invoiceNo || "Ödeme"}</div>
                <div className="text-xs text-muted">{formatDate(p.createdAt)}</div>
              </div>
              <div className="font-semibold text-neon">{formatTRY(Number(p.amount))}</div>
            </div>
          ))}
        </div>
        <div className="card-surface p-6">
          <div className="font-semibold mb-3">Son Check-in&#39;ler</div>
          {member.attendances.length === 0 && <div className="text-muted text-sm py-4">Henüz check-in yok</div>}
          {member.attendances.map((a) => (
            <div key={a.id} className="flex justify-between py-2 border-b border-subtle last:border-0 text-sm">
              <span>{formatDate(a.checkIn)}</span>
              <span className="text-xs text-muted">{a.source}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
