"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus, Sparkles, Check, X, Archive, User, ChevronDown, ArchiveRestore } from "lucide-react";
import { PlanDialog } from "./PlanDialog";
import { formatTRY } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";

export function PlansList({ plans: initialPlans }: { plans: any[] }) {
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>(initialPlans);
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);

  const handleRestore = async (p: any) => {
    try {
      const res = await fetch(`/api/plans/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (!res.ok) throw new Error("Yayına alınamadı");
      setPlans((prev) => prev.map((x) => x.id === p.id ? { ...x, isActive: true } : x));
      toast({ type: "success", message: `"${p.name}" yeniden yayına alındı.` });
    } catch (err: any) {
      toast({ type: "error", message: err.message });
    }
  };

  const activePlans = plans.filter((p) => p.isActive);
  const archivedPlans = plans.filter((p) => !p.isActive);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/plans/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "İşlem başarısız");

      if (data.soft) {
        setPlans((prev) =>
          prev.map((p) => p.id === deleteTarget.id ? { ...p, isActive: false } : p)
        );
        toast({ type: "success", message: `"${deleteTarget.name}" arşive alındı.` });
      } else {
        setPlans((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        toast({ type: "success", message: `"${deleteTarget.name}" silindi.` });
      }
      setDeleteTarget(null);
    } catch (err: any) {
      toast({ type: "error", message: err.message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={() => setCreating(true)} className="btn-primary btn-md">
          <Plus className="w-4 h-4" /> Yeni Plan
        </button>
      </div>

      {/* Aktif planlar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activePlans.length === 0 && (
          <div className="card-surface p-12 text-center text-muted col-span-full">
            Aktif plan yok.{" "}
            <button onClick={() => setCreating(true)} className="text-neon hover:underline">
              İlk planı oluştur
            </button>
          </div>
        )}
        {activePlans.map((p) => (
          <PlanCard
            key={p.id}
            plan={p}
            onEdit={() => setEditing(p)}
            onDelete={() => setDeleteTarget(p)}
          />
        ))}
      </div>

      {/* Arşivlenmiş planlar */}
      {archivedPlans.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setArchivedOpen((v) => !v)}
            className="flex items-center gap-2 text-sm text-muted hover:text-dim transition-colors mb-3"
          >
            <Archive className="w-4 h-4" />
            <span>Arşivlenmiş Paketler ({archivedPlans.length})</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${archivedOpen ? "rotate-180" : ""}`} />
          </button>

          {archivedOpen && (
            <div className="card-surface overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-subtle">
                  <tr className="text-xs uppercase text-muted">
                    <th className="text-left px-5 py-3">Plan Adı</th>
                    <th className="text-left px-5 py-3 hidden sm:table-cell">Süre</th>
                    <th className="text-left px-5 py-3 hidden md:table-cell">Ücret</th>
                    <th className="text-right px-5 py-3">Üyelik</th>
                    <th className="text-right px-5 py-3">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {archivedPlans.map((p) => (
                    <tr key={p.id} className="opacity-60 hover:opacity-80 transition-opacity">
                      <td className="px-5 py-3 font-medium">{p.name}</td>
                      <td className="px-5 py-3 text-body hidden sm:table-cell">{p.durationDays} gün</td>
                      <td className="px-5 py-3 text-body hidden md:table-cell">{formatTRY(Number(p.price))}</td>
                      <td className="px-5 py-3 text-right text-muted">{p._count.memberships} üye</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleRestore(p)}
                            title="Yeniden yayına al"
                            className="p-1.5 rounded-lg hover:bg-neon/10 text-label hover:text-neon transition-colors"
                          >
                            <ArchiveRestore className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(p)}
                            title="Sil"
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-label hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <PlanDialog open={creating} onClose={() => setCreating(false)} />
      <PlanDialog open={!!editing} onClose={() => setEditing(null)} initial={editing || undefined} />

      {/* Silme / Arşivleme modalı */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-md card-surface rounded-2xl p-6 shadow-2xl">
            {/* Başlık */}
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${deleteTarget._count.memberships > 0 ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400"}`}>
                {deleteTarget._count.memberships > 0 ? <Archive className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="font-semibold">
                  {deleteTarget._count.memberships > 0 ? "Planı Arşive Al" : "Planı Sil"}
                </div>
                <div className="text-xs text-label">
                  {deleteTarget._count.memberships > 0
                    ? "Bu plan bir veya daha fazla kullanıcıya tanımlı"
                    : "Bu işlem geri alınamaz"}
                </div>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="p-1 rounded-lg hover:bg-subtle text-label">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Üye listesi (üyelik varsa) */}
            {deleteTarget._count.memberships > 0 ? (
              <>
                <div className="mb-4 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {deleteTarget.memberships.map((ms: any) => (
                    <div key={ms.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-subtle">
                      <div className="w-7 h-7 rounded-full bg-neon/10 grid place-items-center shrink-0">
                        <User className="w-3.5 h-3.5 text-neon" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{ms.member.user.name}</div>
                        <div className="text-xs text-muted">#{ms.member.memberNo}</div>
                      </div>
                      <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${ms.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-subtle text-muted"}`}>
                        {ms.isActive ? "Aktif" : "Geçmiş"}
                      </span>
                    </div>
                  ))}
                  {deleteTarget._count.memberships > 10 && (
                    <div className="text-xs text-muted text-center py-1">
                      +{deleteTarget._count.memberships - 10} üye daha
                    </div>
                  )}
                </div>
                <p className="text-xs text-dim mb-5">
                  Silmek yerine planı <strong className="text-amber-300">arşive alabilirsiniz</strong> — mevcut üyelikler etkilenmez, yalnızca yeni satışa kapatılır.
                </p>
              </>
            ) : (
              <p className="text-sm text-dim mb-5">
                <span className="font-medium text-primary">"{deleteTarget.name}"</span> planı kalıcı olarak silinecek.
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary btn-md flex-1">
                İptal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`flex-1 px-4 py-2 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 text-white ${
                  deleteTarget._count.memberships > 0
                    ? "bg-amber-500 hover:bg-amber-400"
                    : "bg-rose-500 hover:bg-rose-400"
                }`}
              >
                {deleting
                  ? "İşleniyor…"
                  : deleteTarget._count.memberships > 0
                  ? "Arşive Al"
                  : "Sil"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PlanCard({ plan: p, onEdit, onDelete }: { plan: any; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className={`card-surface p-6 relative ${p.isPopular ? "border-neon/40" : ""}`}>
      {p.isPopular && (
        <div className="absolute -top-2 right-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neon text-ink-950 text-[10px] font-bold">
          <Sparkles className="w-3 h-3" /> POPÜLER
        </div>
      )}
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">{p.name}</div>
          <div className="text-xs text-body mt-0.5">{p.durationDays} gün · {p.interval}</div>
        </div>
        <span className="badge-success">Aktif</span>
      </div>
      <div className="mt-4 text-3xl font-bold text-gradient-neon">{formatTRY(Number(p.price))}</div>
      {p.description && <p className="mt-2 text-sm text-body">{p.description}</p>}
      <ul className="mt-4 space-y-1.5">
        {p.features.slice(0, 4).map((f: string, i: number) => (
          <li key={i} className="text-xs text-dim flex items-start gap-1.5">
            <Check className="w-3 h-3 text-neon mt-0.5 shrink-0" />{f}
          </li>
        ))}
        {p.features.length > 4 && <li className="text-xs text-muted">+{p.features.length - 4} özellik daha</li>}
      </ul>
      <div className="mt-5 pt-4 border-t border-subtle flex gap-2">
        <button onClick={onEdit} className="flex-1 btn-secondary btn-sm">
          <Pencil className="w-3.5 h-3.5" /> Düzenle
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-label hover:text-rose-400 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
