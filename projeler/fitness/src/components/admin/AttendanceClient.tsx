"use client";

import { useState, useCallback } from "react";
import { UserCheck, LogOut, Trash2, Search, RefreshCw, UserPlus } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { formatDate } from "@/lib/utils";
import { api } from "@/lib/api";

interface AttRecord {
  id: string;
  checkIn: string;
  checkOut: string | null;
  source: string;
  member: { id: string; memberNo: string; user: { name: string } };
  branch: { name: string } | null;
}

interface Branch { id: string; name: string }
interface Member { id: string; memberNo: string; user: { name: string } }

interface Props {
  initialRecords: AttRecord[];
  initialTotal: number;
  branches: Branch[];
  members: Member[];
  today: string;
}

function duration(checkIn: string, checkOut: string | null) {
  if (!checkOut) return null;
  const mins = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000);
  if (mins < 60) return `${mins} dk`;
  return `${Math.floor(mins / 60)} sa ${mins % 60} dk`;
}

function timeStr(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export function AttendanceClient({ initialRecords, initialTotal, branches, members, today }: Props) {
  const { toast } = useToast();
  const [records, setRecords] = useState<AttRecord[]>(initialRecords);
  const [total, setTotal] = useState(initialTotal);
  const [date, setDate] = useState(today);
  const [branchId, setBranchId] = useState("");
  const [loading, setLoading] = useState(false);

  // Manual check-in state
  const [manualOpen, setManualOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [manualBranchId, setManualBranchId] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredMembers = members.filter((m) =>
    !memberSearch || m.user.name.toLowerCase().includes(memberSearch.toLowerCase()) || m.memberNo.includes(memberSearch)
  );

  const reload = useCallback(async (newDate?: string, newBranch?: string) => {
    setLoading(true);
    const d = newDate ?? date;
    const b = newBranch ?? branchId;
    const params = new URLSearchParams({ date: d });
    if (b) params.set("branchId", b);
    try {
      const res = await fetch(`/api/attendance?${params}`);
      const json = await res.json();
      setRecords(json.data);
      setTotal(json.total);
    } catch {
      toast({ type: "error", message: "Yüklenemedi." });
    } finally {
      setLoading(false);
    }
  }, [date, branchId, toast]);

  function handleDateChange(v: string) {
    setDate(v);
    reload(v, branchId);
  }

  function handleBranchChange(v: string) {
    setBranchId(v);
    reload(date, v);
  }

  async function handleCheckOut(id: string) {
    try {
      const res = await api.patch<{ attendance: AttRecord }>(`/api/attendance/${id}`, {});
      setRecords((prev) => prev.map((r) => r.id === id ? { ...r, checkOut: res.attendance.checkOut } : r));
      toast({ type: "success", message: "Check-out kaydedildi." });
    } catch (e: any) {
      toast({ type: "error", message: e.message || "Check-out başarısız." });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu kaydı silmek istiyor musunuz?")) return;
    try {
      await api.del(`/api/attendance/${id}`);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      setTotal((t) => t - 1);
      toast({ type: "success", message: "Kayıt silindi." });
    } catch {
      toast({ type: "error", message: "Silinemedi." });
    }
  }

  async function handleManualCheckIn(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMemberId) return toast({ type: "error", message: "Üye seçin." });
    setSaving(true);
    try {
      const res = await api.post<{ attendance: AttRecord }>("/api/attendance", {
        memberId: selectedMemberId,
        branchId: manualBranchId || undefined,
        source: "MANUAL",
      });
      setRecords((prev) => [res.attendance, ...prev]);
      setTotal((t) => t + 1);
      toast({ type: "success", message: `${res.attendance.member.user.name} check-in yapıldı.` });
      setManualOpen(false);
      setSelectedMemberId("");
      setMemberSearch("");
    } catch (e: any) {
      toast({ type: "error", message: e.message || "Check-in başarısız." });
    } finally {
      setSaving(false);
    }
  }

  const SOURCE_BADGE: Record<string, string> = {
    QR: "bg-neon/10 text-neon",
    MANUAL: "bg-subtle-md text-body",
    FACE: "bg-violet-500/10 text-violet-300",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Yoklama</h1>
          <p className="text-sm text-label mt-1">{total} kayıt</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => reload()} className="btn-secondary btn-md">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setManualOpen(true)} className="btn-primary btn-md">
            <UserPlus className="w-4 h-4" /> Manuel Check-in
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          className="input"
        />
        {branches.length > 1 && (
          <select
            value={branchId}
            onChange={(e) => handleBranchChange(e.target.value)}
            className="input"
          >
            <option value="">Tüm şubeler</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <div className={`card-surface overflow-x-auto transition-opacity ${loading ? "opacity-50" : ""}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-subtle">
              <th className="text-left px-4 py-3 text-muted font-medium">Üye</th>
              <th className="text-left px-4 py-3 text-muted font-medium">Giriş</th>
              <th className="text-left px-4 py-3 text-muted font-medium">Çıkış</th>
              <th className="text-left px-4 py-3 text-muted font-medium">Süre</th>
              <th className="text-left px-4 py-3 text-muted font-medium">Kaynak</th>
              <th className="text-left px-4 py-3 text-muted font-medium">Şube</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-faint">Bu tarihte kayıt yok</td></tr>
            )}
            {records.map((r) => (
              <tr key={r.id} className="border-b border-subtle hover:bg-subtle">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.member.user.name}</div>
                  <div className="text-xs text-muted">{r.member.memberNo}</div>
                </td>
                <td className="px-4 py-3 font-mono text-neon">{timeStr(r.checkIn)}</td>
                <td className="px-4 py-3 font-mono text-body">{r.checkOut ? timeStr(r.checkOut) : "—"}</td>
                <td className="px-4 py-3 text-body">{duration(r.checkIn, r.checkOut) ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SOURCE_BADGE[r.source] ?? "bg-subtle-md text-label"}`}>
                    {r.source}
                  </span>
                </td>
                <td className="px-4 py-3 text-label">{r.branch?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    {!r.checkOut && (
                      <button
                        onClick={() => handleCheckOut(r.id)}
                        className="p-1.5 rounded-lg hover:bg-neon/10 text-muted hover:text-neon transition-colors"
                        title="Check-out"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted hover:text-rose-400 transition-colors"
                      title="Sil"
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

      {/* Manual check-in modal */}
      {manualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setManualOpen(false)} />
          <div className="relative w-full max-w-md card-surface rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Manuel Check-in</h2>
            <form onSubmit={handleManualCheckIn} className="space-y-4">
              <div>
                <label className="block text-xs text-body mb-1.5">Üye Ara</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
                  <input
                    className="input w-full pl-9"
                    placeholder="İsim veya üye no..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                  />
                </div>
                <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-subtle-md">
                  {filteredMembers.slice(0, 10).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { setSelectedMemberId(m.id); setMemberSearch(m.user.name); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-subtle ${selectedMemberId === m.id ? "bg-neon/10 text-neon" : ""}`}
                    >
                      <span className="font-medium">{m.user.name}</span>
                      <span className="text-muted ml-2 text-xs">{m.memberNo}</span>
                    </button>
                  ))}
                  {filteredMembers.length === 0 && (
                    <div className="px-3 py-2 text-xs text-faint">Üye bulunamadı</div>
                  )}
                </div>
              </div>
              {branches.length > 1 && (
                <div>
                  <label className="block text-xs text-body mb-1.5">Şube</label>
                  <select value={manualBranchId} onChange={(e) => setManualBranchId(e.target.value)} className="input w-full">
                    <option value="">Şube seç</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setManualOpen(false)} className="btn-secondary btn-md flex-1">İptal</button>
                <button type="submit" disabled={saving || !selectedMemberId} className="btn-primary btn-md flex-1">
                  <UserCheck className="w-4 h-4" />
                  {saving ? "Kaydediliyor…" : "Check-in Yap"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
