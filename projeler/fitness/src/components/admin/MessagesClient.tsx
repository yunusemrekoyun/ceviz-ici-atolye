"use client";

import { useState } from "react";
import { Mail, MailOpen, Trash2, Phone, UserPlus, StickyNote, Loader2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { MemberDialog, type MemberInitial } from "./MemberDialog";

type ContactStatus = "NEW" | "CONTACTED" | "CONVERTED" | "LOST";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  isRead: boolean;
  status: ContactStatus;
  assignedToId: string | null;
  adminNote: string | null;
  createdAt: string;
}

type StaffOption = { id: string; name: string };
type Options = { plans: any[]; trainers: any[]; branches: any[]; staff: StaffOption[] };

const STATUS_META: Record<ContactStatus, { label: string; badge: string }> = {
  NEW: { label: "Yeni", badge: "badge-success" },
  CONTACTED: { label: "Arandı", badge: "badge-info" },
  CONVERTED: { label: "Dönüştü", badge: "badge-neon" },
  LOST: { label: "Kaybedildi", badge: "badge-neutral" },
};
const STAGES: ContactStatus[] = ["NEW", "CONTACTED", "CONVERTED", "LOST"];

export function MessagesClient({
  initialMessages,
  options,
}: {
  initialMessages: ContactMessage[];
  options: Options;
}) {
  const { toast } = useToast();
  const [messages, setMessages] = useState(initialMessages);
  const [filter, setFilter] = useState<ContactStatus | "ALL">("ALL");
  const [noteOpen, setNoteOpen] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [convertLead, setConvertLead] = useState<MemberInitial | null>(null);

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/contact/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  };

  async function toggleRead(m: ContactMessage) {
    if (await patch(m.id, { isRead: !m.isRead }))
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, isRead: !x.isRead } : x)));
  }

  async function changeStatus(m: ContactMessage, status: ContactStatus) {
    if (await patch(m.id, { status, isRead: true })) {
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, status, isRead: true } : x)));
      toast({ type: "success", message: `Durum: ${STATUS_META[status].label}` });
    }
  }

  async function changeAssignee(m: ContactMessage, assignedToId: string) {
    if (await patch(m.id, { assignedToId: assignedToId || null }))
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, assignedToId: assignedToId || null } : x)));
  }

  async function saveNote(m: ContactMessage) {
    setSavingNote(true);
    if (await patch(m.id, { adminNote: noteDraft })) {
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, adminNote: noteDraft } : x)));
      toast({ type: "success", message: "Not kaydedildi." });
      setNoteOpen(null);
    } else {
      toast({ type: "error", message: "Not kaydedilemedi." });
    }
    setSavingNote(false);
  }

  async function remove(m: ContactMessage) {
    if (!confirm("Bu kayıt silinsin mi?")) return;
    await fetch(`/api/contact/${m.id}`, { method: "DELETE" });
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
    toast({ type: "success", message: "Kayıt silindi." });
  }

  function startConvert(m: ContactMessage) {
    // Aday üyeye dönüştürülüyor → aşamayı işaretle ve üye formunu ön-doldur
    changeStatus(m, "CONVERTED");
    setConvertLead({ name: m.name, email: m.email, phone: m.phone });
  }

  const counts = STAGES.reduce(
    (acc, s) => ({ ...acc, [s]: messages.filter((m) => m.status === s).length }),
    {} as Record<ContactStatus, number>
  );
  const shown = filter === "ALL" ? messages : messages.filter((m) => m.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter("ALL")} className={`badge ${filter === "ALL" ? "badge-neon" : "badge-neutral"} hover:bg-subtle-md`}>
          Tümü · {messages.length}
        </button>
        {STAGES.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`badge ${filter === s ? "badge-neon" : "badge-neutral"} hover:bg-subtle-md`}>
            {STATUS_META[s].label} · {counts[s]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card-surface p-12 text-center text-faint">Bu aşamada kayıt yok</div>
      ) : (
        <div className="space-y-3">
          {shown.map((m) => {
            const assignee = options.staff.find((s) => s.id === m.assignedToId);
            return (
              <div key={m.id} className={`card-surface p-5 ${!m.isRead ? "border-neon/30" : ""}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{m.name}</span>
                      <span className={STATUS_META[m.status].badge}>{STATUS_META[m.status].label}</span>
                      {!m.isRead && <span className="badge badge-warn">Okunmadı</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted flex-wrap">
                      <a href={`mailto:${m.email}`} className="hover:text-white">{m.email}</a>
                      {m.phone && (
                        <a href={`tel:${m.phone}`} className="flex items-center gap-1 hover:text-white">
                          <Phone className="w-3 h-3" />{m.phone}
                        </a>
                      )}
                      <span>{new Date(m.createdAt).toLocaleString("tr-TR")}</span>
                    </div>
                    <p className="mt-3 text-sm text-body whitespace-pre-wrap">{m.message}</p>

                    {m.adminNote && noteOpen !== m.id && (
                      <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex gap-2">
                        <StickyNote className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span className="whitespace-pre-wrap">{m.adminNote}</span>
                      </div>
                    )}

                    {noteOpen === m.id && (
                      <div className="mt-3 space-y-2">
                        <textarea
                          className="input-base h-20 resize-none text-sm"
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          placeholder="Aday hakkında not…"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => saveNote(m)} disabled={savingNote} className="btn-primary btn-sm">
                            {savingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Kaydet"}
                          </button>
                          <button onClick={() => setNoteOpen(null)} className="btn-secondary btn-sm">Vazgeç</button>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <select
                        value={m.status}
                        onChange={(e) => changeStatus(m, e.target.value as ContactStatus)}
                        className="input-base h-9 text-sm w-auto"
                      >
                        {STAGES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                      </select>
                      <select
                        value={m.assignedToId ?? ""}
                        onChange={(e) => changeAssignee(m, e.target.value)}
                        className="input-base h-9 text-sm w-auto"
                        title="Sorumlu ata"
                      >
                        <option value="">Sorumlu yok</option>
                        {options.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      {assignee && <span className="text-xs text-muted">→ {assignee.name}</span>}
                      <button
                        onClick={() => { setNoteOpen(m.id); setNoteDraft(m.adminNote ?? ""); }}
                        className="btn-secondary btn-sm gap-1.5"
                      >
                        <StickyNote className="w-3.5 h-3.5" /> Not
                      </button>
                      {m.status !== "CONVERTED" && (
                        <button onClick={() => startConvert(m)} className="btn-primary btn-sm gap-1.5">
                          <UserPlus className="w-3.5 h-3.5" /> Üyeye Dönüştür
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleRead(m)} className="p-1.5 rounded-lg hover:bg-subtle text-label" title={m.isRead ? "Okunmadı işaretle" : "Okundu işaretle"}>
                      {m.isRead ? <MailOpen className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                    </button>
                    <button onClick={() => remove(m)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-300" title="Sil">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MemberDialog
        open={!!convertLead}
        onClose={() => setConvertLead(null)}
        initial={convertLead ?? undefined}
        plans={options.plans}
        trainers={options.trainers}
        branches={options.branches}
      />
    </div>
  );
}
