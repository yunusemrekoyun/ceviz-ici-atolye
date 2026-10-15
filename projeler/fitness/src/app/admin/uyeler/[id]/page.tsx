import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";
import { MemberActions } from "@/components/admin/MemberActions";
import { formatDate, formatTRY, initials } from "@/lib/utils";
import { ArrowLeft, Mail, Phone, Activity, CreditCard } from "lucide-react";
import { MembershipActions } from "@/components/admin/MembershipActions";
import { FreezeRequestActions } from "@/components/admin/FreezeRequestActions";
import { MemberProgress } from "@/components/admin/MemberProgress";

export default async function MemberDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [m, plans, trainers, branches] = await Promise.all([
    prisma.member.findUnique({
      where: { id },
      include: {
        user: true,
        memberships: {
          include: {
            plan: true,
            freezeRequests: { where: { status: "PENDING" }, orderBy: { requestedAt: "asc" } },
          },
          orderBy: { endDate: "desc" },
        },
        payments: { orderBy: { createdAt: "desc" }, take: 10 },
        attendances: { orderBy: { checkIn: "desc" }, take: 10 },
        measurements: { orderBy: { recordedAt: "asc" } },
        trainer: { include: { user: { select: { name: true } } } },
        referredBy: { include: { user: { select: { name: true } } } },
        referrals: { select: { id: true, referralRewarded: true } },
      },
    }),
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    prisma.trainer.findMany({ where: { isActive: true }, select: { id: true, user: { select: { name: true } } } }),
    prisma.branch.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
  ]);
  if (!m) notFound();

  const plainPlans = plans.map((p) => ({ ...p, price: Number(p.price) }));
  const active = m.memberships.find((x) => x.isActive);
  const totalPaid = m.payments.filter((p) => p.status === "PAID").reduce((s, p) => s + Number(p.amount), 0);

  const memberData = {
    name: m.user.name,
    email: m.user.email,
    phone: m.user.phone,
    status: m.status,
    gender: m.gender,
    birthDate: m.birthDate,
    heightCm: m.heightCm,
    startWeightKg: m.startWeightKg,
    goal: m.goal,
    healthNotes: m.healthNotes,
    trainerId: m.trainerId,
    branchId: m.branchId,
  };

  return (
    <div>
      <Link href="/admin/uyeler" className="inline-flex items-center gap-2 text-sm text-body hover:text-white mb-4">
        <ArrowLeft className="w-4 h-4" /> Üyelere geri dön
      </Link>

      <PageHeader
        title={m.user.name}
        subtitle={`Üye No: ${m.memberNo} · Kayıt: ${formatDate(m.createdAt)}`}
        actions={<MemberActions memberId={m.id} member={memberData} plans={plainPlans} trainers={trainers} branches={branches} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-surface p-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon to-accent-cyan grid place-items-center text-ink-950 text-xl font-bold">
              {initials(m.user.name)}
            </div>
            <div>
              <div className="font-semibold">{m.user.name}</div>
              <span className={`badge ${m.status === "ACTIVE" ? "badge-success" : "badge-neutral"} mt-1`}>
                {m.status}
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm">
            <div className="flex items-center gap-2 text-dim"><Mail className="w-4 h-4" />{m.user.email}</div>
            {m.user.phone && <div className="flex items-center gap-2 text-dim"><Phone className="w-4 h-4" />{m.user.phone}</div>}
            <div className="h-px bg-subtle my-2" />
            <div className="flex justify-between"><span className="text-label">Cinsiyet</span><span>{m.gender || "—"}</span></div>
            <div className="flex justify-between"><span className="text-label">Doğum</span><span>{m.birthDate ? formatDate(m.birthDate) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-label">Boy</span><span>{m.heightCm ? `${m.heightCm} cm` : "—"}</span></div>
            <div className="flex justify-between"><span className="text-label">Başlangıç Kilo</span><span>{m.startWeightKg ? `${m.startWeightKg} kg` : "—"}</span></div>
            <div className="flex justify-between"><span className="text-label">Antrenör</span><span>{m.trainer?.user.name || "—"}</span></div>
            <div className="flex justify-between"><span className="text-label">Hedef</span><span className="text-right max-w-[60%]">{m.goal || "—"}</span></div>
            <div className="h-px bg-subtle my-2" />
            <div className="flex justify-between"><span className="text-label">Davet Kodu</span><span className="font-mono text-xs">{m.referralCode || "—"}</span></div>
            <div className="flex justify-between"><span className="text-label">Davet Eden</span><span>{m.referredBy?.user.name || "—"}</span></div>
            <div className="flex justify-between"><span className="text-label">Davet Ettikleri</span><span>{m.referrals.length} kişi ({m.referrals.filter((r) => r.referralRewarded).length} ödüllü)</span></div>
            <div className="h-px bg-subtle my-2" />
            <div className="flex justify-between"><span className="text-label">Son Giriş</span><span>{m.user.lastLoginAt ? formatDate(m.user.lastLoginAt) : "Hiç"}</span></div>
          </div>

          {m.healthNotes && (
            <div className="mt-5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
              <div className="font-semibold mb-1">Sağlık Notları</div>
              {m.healthNotes}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="card-surface p-5">
              <div className="text-xs text-body">Aktif Plan</div>
              <div className="mt-2 text-lg font-bold">{active?.plan.name || "—"}</div>
              <div className="text-xs text-muted mt-1">
                {active ? `Bitiş: ${formatDate(active.endDate)}` : "Plan yok"}
              </div>
            </div>
            <div className="card-surface p-5">
              <div className="text-xs text-body">Toplam Ödeme</div>
              <div className="mt-2 text-lg font-bold text-neon">{formatTRY(totalPaid)}</div>
              <div className="text-xs text-muted mt-1">{m.payments.length} işlem</div>
            </div>
            <div className="card-surface p-5">
              <div className="text-xs text-body">Check-in</div>
              <div className="mt-2 text-lg font-bold">{m.attendances.length}</div>
              <div className="text-xs text-muted mt-1">son kayıtlar</div>
            </div>
          </div>

          <div className="card-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold flex items-center gap-2"><CreditCard className="w-4 h-4 text-neon" />Ödemeler</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-label">
                  <tr><th className="text-left py-2">Fatura</th><th className="text-left py-2">Yöntem</th><th className="text-left py-2">Tarih</th><th className="text-right py-2">Tutar</th><th className="text-right py-2">Durum</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {m.payments.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted">Henüz ödeme yok</td></tr>}
                  {m.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 font-mono text-xs">{p.invoiceNo || "—"}</td>
                      <td className="py-3 text-dim">{p.method}</td>
                      <td className="py-3 text-dim">{formatDate(p.createdAt)}</td>
                      <td className="py-3 text-right font-semibold">{formatTRY(Number(p.amount))}</td>
                      <td className="py-3 text-right">
                        <span className={`badge ${p.status === "PAID" ? "badge-success" : p.status === "FAILED" ? "badge-danger" : "badge-warn"}`}>{p.status}</span>
                        {p.status === "REFUNDED" && p.refundReason && (
                          <div className="text-[10px] text-sky-300/80 mt-1">{p.refundReason}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card-surface p-6">
            <div className="font-semibold flex items-center gap-2 mb-3"><Activity className="w-4 h-4 text-neon" />Son Check-in'ler</div>
            <div className="space-y-2 text-sm">
              {m.attendances.length === 0 && <div className="text-muted py-4">Kayıt yok</div>}
              {m.attendances.map((a) => (
                <div key={a.id} className="flex justify-between text-dim">
                  <span>{formatDate(a.checkIn)}</span>
                  <span className="text-xs text-muted">{a.source}</span>
                </div>
              ))}
            </div>
          </div>

          <MemberProgress
            memberId={m.id}
            initialMeasurements={JSON.parse(JSON.stringify(m.measurements))}
          />

          <FreezeRequestActions
            requests={m.memberships.flatMap((ms) =>
              ms.freezeRequests.map((f) => ({
                id: f.id,
                days: f.days,
                reason: f.reason,
                requestedAt: f.requestedAt.toISOString(),
                planName: ms.plan.name,
              }))
            )}
          />

          {m.memberships.length > 0 && (
            <div className="card-surface p-6">
              <div className="font-semibold mb-3">Üyelik Geçmişi</div>
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-label">
                  <tr>
                    <th className="text-left py-2">Plan</th>
                    <th className="text-left py-2">Başlangıç</th>
                    <th className="text-left py-2">Bitiş</th>
                    <th className="text-right py-2">Durum</th>
                    <th className="text-right py-2">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {m.memberships.map((ms) => (
                    <tr key={ms.id}>
                      <td className="py-3">{ms.plan.name}</td>
                      <td className="py-3 text-dim">{formatDate(ms.startDate)}</td>
                      <td className="py-3 text-dim">{formatDate(ms.endDate)}</td>
                      <td className="py-3 text-right">
                        <span className={ms.isActive ? "badge-success" : "badge-neutral"}>{ms.isActive ? "Aktif" : "Pasif"}</span>
                      </td>
                      <td className="py-3 text-right">
                        <MembershipActions
                          membershipId={ms.id}
                          isActive={ms.isActive}
                          isFrozen={m.status === "FROZEN"}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
