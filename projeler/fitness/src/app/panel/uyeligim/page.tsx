import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatDate, formatTRY } from "@/lib/utils";
import {
  AlertCircle,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Hourglass,
  RotateCw,
  ShoppingCart,
  Snowflake,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { PageTabs } from "@/components/ui/PageTabs";
import { FreezeRequestBtn } from "@/components/panel/FreezeRequestBtn";

const TRIAL_DAYS = 7;
const MAX_FREEZE_DAYS = 30;
const TABS = [
  { key: "uyelik",   label: "Üyeliğim" },
  { key: "odemeler", label: "Ödemelerim" },
];

export const metadata = { title: "Üyeliğim" };

export default async function UyeligimPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "uyelik";

  const user = await requireUser();

  const member = await prisma.member.findUnique({
    where: { userId: user.sub },
    include: {
      memberships: {
        orderBy: { endDate: "desc" },
        take: 10,
        include: {
          plan: true,
          payments: { orderBy: { createdAt: "desc" } },
          freezeRequests: { orderBy: { requestedAt: "desc" } },
        },
      },
    },
  });

  if (!member) {
    return (
      <div className="card-surface p-12 text-center max-w-lg mx-auto">
        <Hourglass className="w-8 h-8 mx-auto text-neon" />
        <div className="mt-4 text-xl font-bold">Hesabın hazırlanıyor</div>
        <p className="mt-2 text-body text-sm">Bir plan seçerek üyeliğini başlat.</p>
        <Link href="/panel/satin-al" className="mt-6 btn-primary btn-md inline-flex">
          <ShoppingCart className="w-4 h-4" /> Üyelik Al
        </Link>
      </div>
    );
  }

  const now = new Date();
  const active = member.memberships.find((m) => m.isActive && new Date(m.endDate) > now) ?? null;

  const trialEnd = new Date(member.createdAt);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
  const isOnTrial = !active && now < trialEnd;
  const trialDaysLeft = isOnTrial
    ? Math.max(1, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  let daysRemaining = 0;
  let totalDays = 0;
  let progressPct = 0;
  let daysElapsed = 0;

  if (active) {
    const start = new Date(active.startDate);
    const end = new Date(active.endDate);
    totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    daysElapsed = totalDays - daysRemaining;
    progressPct = totalDays > 0 ? Math.min(100, Math.round((daysElapsed / totalDays) * 100)) : 0;
  }

  const allPayments = member.memberships
    .flatMap((m) => m.payments.map((p) => ({ ...p, planName: m.plan.name })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalPaid = allPayments
    .filter((p) => p.status === "PAID")
    .reduce((s, p) => s + Number(p.amount), 0);

  const pastMemberships = member.memberships.filter((m) => m.id !== active?.id);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <div className="text-sm text-body">Hesabım</div>
        <h1 className="text-2xl font-bold mt-0.5">Üyeliğim</h1>
      </div>

      <PageTabs tabs={TABS} active={tab} baseHref="/panel/uyeligim" />

      {/* ── Üyeliğim Sekmesi ── */}
      {tab === "uyelik" && (
        <>
          {/* Hero Kart */}
          <div className="cta-card relative overflow-hidden rounded-3xl p-6 md:p-8">
            <div className="cta-blob absolute -top-24 -right-24 w-72 h-72 rounded-full bg-neon/20 blur-[90px]" />
            <div className="cta-blob absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-accent-cyan/10 blur-[70px]" />
            <div className="relative space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-neon font-semibold tracking-widest uppercase">Üyelik Kartı</span>
                <StatusBadge active={active} isOnTrial={isOnTrial} />
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold leading-tight">
                  {active?.plan.name ?? (isOnTrial ? "Deneme Süresi" : "Plan Yok")}
                </div>
                {active?.plan.description && (
                  <p className="mt-1 text-sm text-body">{active.plan.description}</p>
                )}
                <div className="mt-2 text-xs text-muted font-mono">Üye No: {member.memberNo}</div>
              </div>
              {active && (
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-body">
                    <Calendar className="w-4 h-4 text-neon" />
                    <span>Başlangıç: <strong className="text-primary">{formatDate(active.startDate)}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-body">
                    <Calendar className="w-4 h-4 text-neon" />
                    <span>Bitiş: <strong className="text-primary">{formatDate(active.endDate)}</strong></span>
                  </div>
                </div>
              )}
              {isOnTrial && (
                <div className="flex items-center gap-1.5 text-body text-sm">
                  <Clock className="w-4 h-4 text-neon" />
                  <span>Deneme bitiyor: <strong className="text-primary">{formatDate(trialEnd)}</strong></span>
                </div>
              )}
              {active && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted">
                    <span>{daysElapsed} gün kullanıldı</span>
                    <span>{daysRemaining} gün kaldı</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-neon to-accent-cyan"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted text-right">{progressPct}% tamamlandı</div>
                </div>
              )}
              {isOnTrial && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted">
                    <span>{TRIAL_DAYS - trialDaysLeft} gün kullanıldı</span>
                    <span>{trialDaysLeft} gün kaldı</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-neon to-accent-cyan"
                      style={{ width: `${Math.round(((TRIAL_DAYS - trialDaysLeft) / TRIAL_DAYS) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-3 pt-1">
                {active ? (
                  <>
                    <Link href="/panel/satin-al" className="btn-secondary btn-md">
                      <RotateCw className="w-4 h-4" /> Yenile
                    </Link>
                    <FreezeRequestBtn
                      remainingFreezeDays={Math.max(0, MAX_FREEZE_DAYS - active.frozenDays)}
                      hasPending={active.freezeRequests.some((f) => f.status === "PENDING")}
                    />
                  </>
                ) : (
                  <Link href="/panel/satin-al" className="btn-primary btn-md">
                    <ShoppingCart className="w-4 h-4" /> Üyelik Satın Al
                  </Link>
                )}
              </div>
              {active && active.frozenDays > 0 && (
                <div className="text-xs text-sky-300/80 flex items-center gap-1.5">
                  <Snowflake className="w-3.5 h-3.5" />
                  Bu üyelikte toplam {active.frozenDays} gün dondurma kullanıldı.
                </div>
              )}
            </div>
          </div>

          {/* İstatistikler */}
          {active && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Kalan Gün"   value={String(daysRemaining)}             icon={<Clock className="w-4 h-4 text-neon" />} />
              <StatCard label="Toplam Süre" value={`${totalDays} gün`}               icon={<Calendar className="w-4 h-4 text-neon" />} />
              <StatCard label="Plan Ücreti" value={formatTRY(Number(active.plan.price))} icon={<CreditCard className="w-4 h-4 text-neon" />} />
              <StatCard label="Başlangıç"   value={formatDate(active.startDate)}     icon={<Zap className="w-4 h-4 text-neon" />} small />
            </div>
          )}
          {isOnTrial && (
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Kalan Deneme" value={`${trialDaysLeft} gün`} icon={<Clock className="w-4 h-4 text-neon" />} />
              <StatCard label="Deneme Bitiş" value={formatDate(trialEnd)}   icon={<Calendar className="w-4 h-4 text-neon" />} small />
            </div>
          )}

          {/* Plan Özellikleri */}
          {active && active.plan.features.length > 0 && (
            <div className="card-surface p-6">
              <div className="flex items-center gap-2 mb-4">
                <BadgeCheck className="w-5 h-5 text-neon" />
                <h2 className="font-semibold">Plan İçeriği</h2>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {active.plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-body">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Geçmiş Üyelikler */}
          {pastMemberships.length > 0 && (
            <div className="card-surface p-6">
              <h2 className="font-semibold mb-4 text-sm text-muted uppercase tracking-widest">Geçmiş Üyelikler</h2>
              <div className="space-y-0">
                {pastMemberships.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm py-2.5 border-b border-subtle last:border-0">
                    <div>
                      <div className="font-medium text-body">{m.plan.name}</div>
                      <div className="text-xs text-muted">{formatDate(m.startDate)} — {formatDate(m.endDate)}</div>
                    </div>
                    <span className="text-xs text-muted px-2 py-0.5 rounded-md bg-subtle">Sona Erdi</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!active && !isOnTrial && (
            <div className="card-surface p-10 text-center">
              <AlertCircle className="w-10 h-10 mx-auto text-amber-400 mb-4" />
              <div className="font-semibold text-lg mb-1">Aktif üyeliğin yok</div>
              <p className="text-sm text-body mb-6">Bir plan satın alarak tüm özelliklere erişebilirsin.</p>
              <Link href="/panel/satin-al" className="btn-primary btn-md">
                <ShoppingCart className="w-4 h-4" /> Plan Seç
              </Link>
            </div>
          )}
        </>
      )}

      {/* ── Ödemelerim Sekmesi ── */}
      {tab === "odemeler" && (
        <>
          <div className="card-surface p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-neon/10 grid place-items-center">
              <CreditCard className="w-5 h-5 text-neon" />
            </div>
            <div>
              <div className="text-xs text-label">Toplam Ödenen</div>
              <div className="text-2xl font-bold text-neon">{formatTRY(totalPaid)}</div>
            </div>
          </div>

          <div className="card-surface overflow-hidden">
            {allPayments.length === 0 ? (
              <div className="p-12 text-center text-faint">Henüz ödeme kaydı yok.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-subtle">
                  <tr className="text-xs uppercase text-muted">
                    <th className="text-left px-5 py-3">Fatura</th>
                    <th className="text-left px-5 py-3 hidden sm:table-cell">Tarih</th>
                    <th className="text-left px-5 py-3 hidden sm:table-cell">Yöntem</th>
                    <th className="text-right px-5 py-3">Tutar</th>
                    <th className="text-right px-5 py-3">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {allPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-subtle">
                      <td className="px-5 py-3 font-mono text-xs">{p.invoiceNo || p.planName}</td>
                      <td className="px-5 py-3 text-body hidden sm:table-cell">{formatDate(p.createdAt)}</td>
                      <td className="px-5 py-3 text-body hidden sm:table-cell">{methodLabel(p.method)}</td>
                      <td className="px-5 py-3 text-right font-semibold">{formatTRY(Number(p.amount))}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`badge ${
                          p.status === "PAID" ? "badge-success" :
                          p.status === "FAILED" ? "badge-danger" : "badge-warn"
                        }`}>
                          {p.status === "PAID" ? "Ödendi" : p.status === "FAILED" ? "Başarısız" : "Bekliyor"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ active, isOnTrial }: { active: any; isOnTrial: boolean }) {
  if (active) return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      Aktif
    </span>
  );
  if (isOnTrial) return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neon/10 text-neon border border-neon/20">
      <Clock className="w-3 h-3" />
      Deneme
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
      <AlertCircle className="w-3 h-3" />
      Sona Erdi
    </span>
  );
}

function StatCard({ label, value, icon, small = false }: { label: string; value: string; icon: React.ReactNode; small?: boolean }) {
  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-muted">{label}</span></div>
      <div className={`font-bold ${small ? "text-base" : "text-2xl"}`}>{value}</div>
    </div>
  );
}

function methodLabel(method: string) {
  const map: Record<string, string> = { CARD: "Kart", CASH: "Nakit", TRANSFER: "Havale", IYZICO: "iyzico", PAYTR: "PayTR" };
  return map[method] ?? method;
}

function statusLabel(status: string) {
  const map: Record<string, string> = { PAID: "Ödendi", PENDING: "Beklemede", REFUNDED: "İade", FAILED: "Başarısız" };
  return map[status] ?? status;
}
