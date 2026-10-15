"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, Trash2, UserCheck, UserX, Loader2, Bell, X } from "lucide-react";
import { MemberDialog, type MemberInitial } from "./MemberDialog";
import { Modal } from "@/components/ui/Modal";
import { formatDate, initials } from "@/lib/utils";
import { useMemberActions } from "@/hooks/useMemberActions";
import { useToast } from "@/contexts/ToastContext";
import { api } from "@/lib/api";

type PlanOption    = { id: string; name: string; price: number; durationDays: number };
type TrainerOption = { id: string; user: { name: string } };
type BranchOption  = { id: string; name: string };

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:    "badge-success",
  EXPIRED:   "badge-danger",
  FROZEN:    "badge-info",
  SUSPENDED: "badge-warn",
  PENDING:   "badge-neutral",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE:    "Aktif",
  EXPIRED:   "Pasif",
  FROZEN:    "Donduruldu",
  SUSPENDED: "Askıda",
  PENDING:   "Beklemede",
};

type MemberRow = {
  id: string;
  memberNo: string;
  status: string;
  trainerId: string | null;
  createdAt: string | Date;
  user: { name: string; email: string; phone: string | null };
  memberships: { plan: { name: string }; endDate: string | Date }[];
  trainer: { id: string; user: { name: string } } | null;
};

interface Props {
  members: MemberRow[];
  plans: PlanOption[];
  trainers: TrainerOption[];
  branches: BranchOption[];
}

const BULK_STATUS: { value: string; label: string }[] = [
  { value: "ACTIVE", label: "Aktif" },
  { value: "SUSPENDED", label: "Askıya al" },
  { value: "FROZEN", label: "Dondur" },
  { value: "EXPIRED", label: "Pasif" },
];

export function MembersTable({ members, plans, trainers, branches }: Props) {
  const { remove, getForEdit } = useMemberActions();
  const { toast } = useToast();
  const [editing, setEditing] = useState<MemberInitial | null>(null);
  const [assigning, setAssigning] = useState<MemberRow | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [applying, setApplying] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);

  const allSelected = members.length > 0 && members.every((m) => selected.has(m.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(members.map((m) => m.id)));
  const clearSelection = () => setSelected(new Set());

  const applyStatus = async () => {
    if (!bulkStatus || selected.size === 0) return;
    setApplying(true);
    try {
      const res = await api.post<{ count: number }>("/api/members/bulk", {
        action: "status",
        ids: [...selected],
        status: bulkStatus,
      });
      toast({ type: "success", message: `${res.count} üyenin durumu güncellendi.` });
      window.location.reload();
    } catch (e: any) {
      toast({ type: "error", message: e.message || "İşlem başarısız." });
      setApplying(false);
    }
  };

  const onEdit = async (id: string) => {
    const data = await getForEdit(id);
    if (data) setEditing(data);
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-subtle text-xs uppercase tracking-wider text-label">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="accent-neon w-4 h-4 align-middle"
                  aria-label="Tümünü seç"
                />
              </th>
              <th className="text-left px-5 py-3 font-medium">Üye</th>
              <th className="text-left px-5 py-3 font-medium">Üye No</th>
              <th className="text-left px-5 py-3 font-medium">Plan</th>
              <th className="text-left px-5 py-3 font-medium">Antrenör</th>
              <th className="text-left px-5 py-3 font-medium">Durum</th>
              <th className="text-right px-5 py-3 font-medium">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {members.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-muted">
                  Kayıt bulunamadı
                </td>
              </tr>
            )}
            {members.map((m) => {
              const ms = m.memberships[0];
              return (
                <tr key={m.id} className={`table-row-hover ${selected.has(m.id) ? "bg-neon/5" : ""}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(m.id)}
                      onChange={() => toggle(m.id)}
                      className="accent-neon w-4 h-4 align-middle"
                      aria-label={`${m.user.name} seç`}
                    />
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/admin/uyeler/${m.id}`} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-neon to-accent-cyan grid place-items-center text-ink-950 text-xs font-bold shrink-0">
                        {initials(m.user.name)}
                      </div>
                      <div>
                        <div className="font-medium">{m.user.name}</div>
                        <div className="text-xs text-label">{m.user.email}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-dim">{m.memberNo}</td>
                  <td className="px-5 py-3 text-dim">
                    {ms
                      ? <><div className="font-medium">{ms.plan.name}</div><div className="text-xs text-faint">{formatDate(ms.endDate as string)}</div></>
                      : <span className="text-faint">—</span>}
                  </td>

                  {/* Antrenör kolonu */}
                  <td className="px-5 py-3">
                    {m.trainer ? (
                      <button
                        onClick={() => setAssigning(m)}
                        className="flex items-center gap-2 group"
                        title="Antrenörü değiştir"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-neon shrink-0" />
                        <span className="text-sm text-dim group-hover:text-white transition-colors">{m.trainer.user.name}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setAssigning(m)}
                        className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors"
                        title="Antrenör ata"
                      >
                        <UserX className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs font-medium">Atanmamış</span>
                      </button>
                    )}
                  </td>

                  <td className="px-5 py-3">
                    <span className={STATUS_BADGE[m.status]}>{STATUS_LABEL[m.status] ?? m.status}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => onEdit(m.id)}
                        className="w-8 h-8 grid place-items-center rounded-lg text-body hover:text-white hover:bg-subtle"
                        aria-label="Düzenle"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <Link href={`/admin/uyeler/${m.id}`} className="text-xs text-neon hover:underline px-2">
                        Detay
                      </Link>
                      <button
                        onClick={() => remove(m.id, m.user.name)}
                        className="w-8 h-8 grid place-items-center rounded-lg text-rose-300/70 hover:text-rose-300 hover:bg-rose-500/10"
                        aria-label="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl">
          <div className="card-surface shadow-2xl border border-neon/30 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium whitespace-nowrap">{selected.size} seçili</span>
            <div className="h-5 w-px bg-subtle" />
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="input flex-1">
                <option value="">Durum değiştir…</option>
                {BULK_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button onClick={applyStatus} disabled={!bulkStatus || applying} className="btn-primary btn-sm whitespace-nowrap">
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Uygula"}
              </button>
            </div>
            <button onClick={() => setNotifyOpen(true)} className="btn-secondary btn-sm whitespace-nowrap">
              <Bell className="w-3.5 h-3.5" /> Bildirim
            </button>
            <button onClick={clearSelection} className="p-1.5 rounded-lg hover:bg-subtle text-muted" aria-label="Seçimi temizle">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {notifyOpen && (
        <BulkNotifyModal
          count={selected.size}
          ids={[...selected]}
          onClose={() => setNotifyOpen(false)}
          onSent={(n) => {
            toast({ type: "success", message: `${n} üyeye bildirim gönderildi.` });
            setNotifyOpen(false);
            clearSelection();
          }}
        />
      )}

      <MemberDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        initial={editing ?? undefined}
        plans={plans}
        trainers={trainers}
        branches={branches}
      />

      {assigning && (
        <AssignTrainerModal
          member={assigning}
          trainers={trainers}
          onClose={() => setAssigning(null)}
        />
      )}
    </>
  );
}

// --- Antrenör Atama Modalı ---
function AssignTrainerModal({
  member,
  trainers,
  onClose,
}: {
  member: MemberRow;
  trainers: TrainerOption[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(member.trainerId ?? "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setLoading(true);
    setErr(null);
    const res = await fetch(`/api/members/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trainerId: selected || null }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setErr(data.error || "Hata");
    // sayfayı yenile
    window.location.reload();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Antrenör Ata"
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost btn-md">Vazgeç</button>
          <button onClick={save} disabled={loading} className="btn-primary btn-md">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kaydet"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-subtle">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-neon to-accent-cyan grid place-items-center text-ink-950 text-xs font-bold shrink-0">
            {initials(member.user.name)}
          </div>
          <div>
            <div className="font-medium text-sm">{member.user.name}</div>
            <div className="text-xs text-muted">{member.memberNo}</div>
          </div>
        </div>

        <div>
          <label className="label-base">Antrenör</label>
          <select
            className="input-base"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Antrenör atama</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>{t.user.name}</option>
            ))}
          </select>
        </div>

        {err && <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{err}</div>}
      </div>
    </Modal>
  );
}

// --- Toplu Bildirim Modalı ---
function BulkNotifyModal({
  count,
  ids,
  onClose,
  onSent,
}: {
  count: number;
  ids: string[];
  onClose: () => void;
  onSent: (n: number) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const send = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.post<{ count: number }>("/api/members/bulk", { action: "notify", ids, title, body });
      onSent(res.count);
    } catch (e: any) {
      setErr(e.message || "Gönderilemedi");
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Toplu Bildirim Gönder"
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost btn-md">Vazgeç</button>
          <button onClick={send} disabled={loading || !title.trim() || !body.trim()} className="btn-primary btn-md">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gönder"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted">Seçilen <span className="text-strong font-medium">{count} üyeye</span> uygulama içi bildirim gönderilecek.</p>
        <div>
          <label className="label-base">Başlık</label>
          <input className="input-base" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="örn. Yılbaşı kampanyası" />
        </div>
        <div>
          <label className="label-base">Mesaj</label>
          <textarea className="input-base h-24 resize-none" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Bildirim metni…" />
        </div>
        {err && <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{err}</div>}
      </div>
    </Modal>
  );
}
