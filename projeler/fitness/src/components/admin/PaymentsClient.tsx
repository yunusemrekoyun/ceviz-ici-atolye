"use client";

import { useState, useCallback } from "react";
import { Search, Download, Plus, X, ChevronDown, Trash2, RotateCcw } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { formatDate, formatTRY } from "@/lib/utils";
import { api } from "@/lib/api";

interface PaymentMember { id: string; memberNo: string; user: { name: string; email: string } }
interface Payment {
  id: string; amount: number; status: string; method: string;
  invoiceNo: string | null; paidAt: string | null; createdAt: string; notes: string | null;
  refundReason?: string | null; refundedAt?: string | null;
  member: { id: string; user: { name: string; email: string } };
}

interface Stats { monthRevenue: number; pending: number; failed: number }
interface Props {
  initialPayments: Payment[];
  initialStats: Stats;
  initialTotal: number;
  members: PaymentMember[];
}

const STATUS_LABEL: Record<string, string> = { PAID: "Ödendi", PENDING: "Beklemede", FAILED: "Başarısız", REFUNDED: "İade" };
const STATUS_CLASS: Record<string, string> = {
  PAID: "bg-emerald-500/10 text-emerald-300",
  PENDING: "bg-amber-500/10 text-amber-300",
  FAILED: "bg-rose-500/10 text-rose-300",
  REFUNDED: "bg-sky-500/10 text-sky-300",
};
const METHOD_LABEL: Record<string, string> = { CASH: "Nakit", CARD: "Kart", TRANSFER: "Transfer", IYZICO: "iyzico", PAYTR: "PayTR" };

export function PaymentsClient({ initialPayments, initialStats, initialTotal, members }: Props) {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [total, setTotal] = useState(initialTotal);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [loading, setLoading] = useState(false);
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / 20);

  // Manual payment modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ memberId: "", amount: "", method: "CARD", status: "PAID", notes: "" });
  const [memberSearch, setMemberSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const buildParams = useCallback((overrides: Record<string, any> = {}) => {
    const p: Record<string, string> = {};
    const s = overrides.search ?? search;
    const st = overrides.status ?? filterStatus;
    const m = overrides.method ?? filterMethod;
    const f = overrides.from ?? filterFrom;
    const t = overrides.to ?? filterTo;
    const pg = overrides.page ?? page;
    if (s) p.q = s;
    if (st) p.status = st;
    if (m) p.method = m;
    if (f) p.from = f;
    if (t) p.to = t;
    p.skip = String((pg - 1) * 20);
    p.take = "20";
    return new URLSearchParams(p).toString();
  }, [search, filterStatus, filterMethod, filterFrom, filterTo, page]);

  const reload = useCallback(async (overrides: Record<string, any> = {}) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payments?${buildParams(overrides)}`);
      const json = await res.json();
      setPayments(json.items);
      setTotal(json.total);
    } catch { toast({ type: "error", message: "Yüklenemedi." }); }
    finally { setLoading(false); }
  }, [buildParams, toast]);

  async function updateStatus(id: string, status: string) {
    setStatusDropdown(null);
    let refundReason: string | undefined;
    if (status === "REFUNDED") {
      const reason = window.prompt("İade nedeni (ör. üye talebi, hatalı çekim):")?.trim();
      if (!reason) return; // iptal edildi veya boş
      refundReason = reason;
    }
    try {
      const res = await api.patch<{ payment: Payment }>(`/api/payments/${id}`, { status, refundReason });
      setPayments((prev) => prev.map((p) => p.id === id ? { ...p, status: res.payment.status, paidAt: res.payment.paidAt, refundReason: res.payment.refundReason, refundedAt: res.payment.refundedAt } : p));
      toast({ type: "success", message: `Durum: ${STATUS_LABEL[status]}` });
    } catch (e: any) { toast({ type: "error", message: e.message || "Güncellenemedi." }); }
  }

  async function handleDelete(id: string, invoiceNo: string | null) {
    if (!confirm(`"${invoiceNo || "Bu ödeme"}" silinsin mi?`)) return;
    try {
      await api.del(`/api/payments/${id}`);
      setPayments((prev) => prev.filter((p) => p.id !== id));
      setTotal((t) => t - 1);
      toast({ type: "success", message: "Ödeme silindi." });
    } catch { toast({ type: "error", message: "Silinemedi." }); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.memberId || !form.amount) return toast({ type: "error", message: "Üye ve tutar zorunlu." });
    setSaving(true);
    try {
      await api.post("/api/payments", {
        memberId: form.memberId,
        amount: parseFloat(form.amount),
        method: form.method,
        status: form.status,
        notes: form.notes || undefined,
      });
      toast({ type: "success", message: "Ödeme kaydedildi." });
      setModalOpen(false);
      setForm({ memberId: "", amount: "", method: "CARD", status: "PAID", notes: "" });
      setMemberSearch("");
      reload({ page: 1 });
    } catch (e: any) {
      toast({ type: "error", message: e.message || "Kaydedilemedi." });
    } finally { setSaving(false); }
  }

  const filteredMembers = members.filter((m) =>
    !memberSearch || m.user.name.toLowerCase().includes(memberSearch.toLowerCase()) || m.memberNo.includes(memberSearch)
  );

  const exportUrl = `/api/export/payments?${new URLSearchParams({
    ...(filterFrom ? { from: filterFrom } : {}),
    ...(filterTo ? { to: filterTo } : {}),
  }).toString()}`;

  return (
    <div className="space-y-4" onClick={() => setStatusDropdown(null)}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ödemeler & Faturalar</h1>
          <p className="text-sm text-label mt-1">{total} kayıt</p>
        </div>
        <div className="flex gap-2">
          <a href={exportUrl} download className="btn-secondary btn-md"><Download className="w-4 h-4" />CSV</a>
          <button onClick={() => setModalOpen(true)} className="btn-primary btn-md"><Plus className="w-4 h-4" />Manuel Ödeme</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-surface p-4">
          <div className="text-xs text-label">Bu Ay Gelir</div>
          <div className="text-xl font-bold text-neon mt-1">{formatTRY(stats.monthRevenue)}</div>
        </div>
        <div className="card-surface p-4">
          <div className="text-xs text-label">Bekleyen</div>
          <div className="text-xl font-bold text-amber-300 mt-1">{stats.pending}</div>
        </div>
        <div className="card-surface p-4">
          <div className="text-xs text-label">Başarısız</div>
          <div className="text-xl font-bold text-rose-300 mt-1">{stats.failed}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
          <input
            className="input w-full pl-9"
            placeholder="Üye adı veya fatura no..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); reload({ search: e.target.value, page: 1 }); setPage(1); }}
          />
        </div>
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); reload({ status: e.target.value, page: 1 }); setPage(1); }} className="input">
          <option value="">Tüm durumlar</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterMethod} onChange={(e) => { setFilterMethod(e.target.value); reload({ method: e.target.value, page: 1 }); setPage(1); }} className="input">
          <option value="">Tüm yöntemler</option>
          {Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); reload({ from: e.target.value, page: 1 }); setPage(1); }} className="input" title="Başlangıç tarihi" />
        <input type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); reload({ to: e.target.value, page: 1 }); setPage(1); }} className="input" title="Bitiş tarihi" />
      </div>

      {/* Table */}
      <div className={`card-surface overflow-x-auto transition-opacity ${loading ? "opacity-50" : ""}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-subtle">
              <th className="text-left px-4 py-3 text-muted font-medium">Fatura No</th>
              <th className="text-left px-4 py-3 text-muted font-medium">Üye</th>
              <th className="text-left px-4 py-3 text-muted font-medium">Yöntem</th>
              <th className="text-left px-4 py-3 text-muted font-medium">Tarih</th>
              <th className="text-right px-4 py-3 text-muted font-medium">Tutar</th>
              <th className="text-left px-4 py-3 text-muted font-medium">Durum</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-faint">Ödeme bulunamadı</td></tr>
            )}
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-subtle hover:bg-subtle">
                <td className="px-4 py-3 font-mono text-xs text-body">{p.invoiceNo || "—"}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{p.member.user.name}</div>
                  <div className="text-xs text-muted">{p.member.user.email}</div>
                </td>
                <td className="px-4 py-3 text-body">{METHOD_LABEL[p.method] ?? p.method}</td>
                <td className="px-4 py-3 text-body">{p.paidAt ? formatDate(p.paidAt) : formatDate(p.createdAt)}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatTRY(Number(p.amount))}</td>
                <td className="px-4 py-3 relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setStatusDropdown(statusDropdown === p.id ? null : p.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CLASS[p.status] ?? ""}`}
                  >
                    {STATUS_LABEL[p.status] ?? p.status}<ChevronDown className="w-3 h-3" />
                  </button>
                  {statusDropdown === p.id && (
                    <div className="absolute z-20 left-4 mt-1 w-36 card-surface rounded-xl shadow-xl border border-subtle-md overflow-hidden">
                      {Object.entries(STATUS_LABEL).map(([k, v]) => (
                        <button key={k} onClick={() => updateStatus(p.id, k)}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-subtle flex items-center gap-2 ${p.status === k ? "text-neon" : "text-dim"}`}
                        >
                          {k === "REFUNDED" && <RotateCcw className="w-3 h-3" />}
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                  {p.status === "REFUNDED" && p.refundReason && (
                    <div className="text-[10px] text-sky-300/80 mt-1 max-w-[160px]" title={p.refundReason}>
                      {p.refundedAt ? formatDate(p.refundedAt) + " · " : ""}{p.refundReason}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(p.id, p.invoiceNo)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted hover:text-rose-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-subtle">
            <span className="text-xs text-muted">{page} / {totalPages} sayfa</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => { setPage(page - 1); reload({ page: page - 1 }); }} className="btn-secondary btn-sm px-3 disabled:opacity-30">←</button>
              <button disabled={page >= totalPages} onClick={() => { setPage(page + 1); reload({ page: page + 1 }); }} className="btn-secondary btn-sm px-3 disabled:opacity-30">→</button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Payment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-lg card-surface rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Manuel Ödeme Ekle</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-subtle text-label"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs text-body mb-1.5">Üye Ara *</label>
                <input className="input w-full" placeholder="İsim veya üye no..." value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)} />
                <div className="mt-1 max-h-36 overflow-y-auto rounded-xl border border-subtle-md">
                  {filteredMembers.slice(0, 8).map((m) => (
                    <button key={m.id} type="button"
                      onClick={() => { setForm((f) => ({ ...f, memberId: m.id })); setMemberSearch(m.user.name); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-subtle ${form.memberId === m.id ? "bg-neon/10 text-neon" : ""}`}
                    >
                      <span className="font-medium">{m.user.name}</span>
                      <span className="text-muted text-xs ml-2">{m.memberNo}</span>
                    </button>
                  ))}
                  {filteredMembers.length === 0 && <div className="px-3 py-2 text-xs text-faint">Üye bulunamadı</div>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-body mb-1.5">Tutar (₺) *</label>
                  <input className="input w-full" type="number" step="0.01" min="1" placeholder="1499"
                    value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-xs text-body mb-1.5">Yöntem</label>
                  <select className="input w-full" value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}>
                    {Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-body mb-1.5">Durum</label>
                <select className="input w-full" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-body mb-1.5">Notlar</label>
                <input className="input w-full" placeholder="Opsiyonel not..." value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary btn-md flex-1">İptal</button>
                <button type="submit" disabled={saving || !form.memberId} className="btn-primary btn-md flex-1">
                  {saving ? "Kaydediliyor…" : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
