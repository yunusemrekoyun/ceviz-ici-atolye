"use client";

import { useMemo, useState, useTransition } from "react";
import type { CallbackRequest } from "@/lib/db/schema";
import { formatDateTimeTr } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { telLink, whatsappLink } from "@/lib/whatsapp";
import { useRememberList, useUrlFilters } from "@/lib/use-url-filters";
import { useToast } from "@/components/admin/Toast";
import { Button, Input } from "@/components/ui";
import { deleteCallbackAction, setCallbackStatusAction, updateCallbackNoteAction, type ActionResult } from "../actions";

type Filter = "new" | "done" | "all";

export function CallbackList({ requests }: { requests: CallbackRequest[] }) {
  useRememberList();
  const { values: u, set } = useUrlFilters({ durum: "new" }, { valid: { durum: (v) => ["new", "done", "all"].includes(v) } });
  const filter = u.durum as Filter;
  const setFilter = (v: Filter) => set({ durum: v });
  const toast = useToast();
  const [busy, startTransition] = useTransition();

  const counts = useMemo(() => ({ new: requests.filter((r) => r.status === "new").length, done: requests.filter((r) => r.status === "done").length, all: requests.length }), [requests]);
  const rows = requests.filter((r) => filter === "all" || r.status === filter);

  function run(action: () => Promise<ActionResult>, success: string, undo?: () => Promise<ActionResult>) {
    startTransition(async () => {
      const res = await action();
      if (!res.ok) return toast({ kind: "error", text: res.error });
      toast({
        text: success,
        action: undo ? { label: "Geri Al", onClick: () => startTransition(async () => void (await undo())) } : undefined,
      });
    });
  }

  return (
    <div className="mt-5 grid gap-4">
      <div className="flex gap-1" role="tablist">
        {(
          [
            ["new", "Aranacak"],
            ["done", "Arandı"],
            ["all", "Tümü"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={["flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition", filter === key ? "bg-ink text-white" : "text-muted hover:bg-white hover:text-ink"].join(" ")}
          >
            {label}
            <span className={["rounded-full px-1.5 text-xs", filter === key ? "bg-white/20" : "bg-white"].join(" ")}>{counts[key]}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-muted">{filter === "new" ? "Aranmayı bekleyen talep yok." : "Kayıt yok."}</div>
      ) : (
        <ul className="grid gap-3">
          {rows.map((r) => (
            <li key={r.id} className={["rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md", r.status === "new" ? "border-amber-200" : "border-line"].join(" ")}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{r.fullName}</p>
                  <p className="text-xs text-muted">
                    {formatDateTimeTr(r.createdAt)}
                    {r.status === "done" && r.handledAt ? ` · arandı ${formatDateTimeTr(r.handledAt)}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href={telLink(r.phone)} className="inline-flex min-h-11 items-center rounded-xl bg-gs-red px-4 text-[15px] font-semibold text-white transition hover:bg-gs-red-dark active:scale-[0.97]">
                    Ara · {formatPhone(r.phone)}
                  </a>
                  <a
                    href={whatsappLink(r.phone, `Merhaba ${r.fullName.split(" ")[0]}, Kütahya Galatasaray Futbol Okulları'ndan yazıyoruz. Bizden aranma talebiniz ulaştı.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-[15px] font-semibold text-emerald-800 transition hover:bg-emerald-100 active:scale-[0.97]"
                  >
                    WhatsApp
                  </a>
                  {r.status === "new" ? (
                    <Button type="button" variant="success" className="min-h-11 px-4" disabled={busy} onClick={() => run(() => setCallbackStatusAction(r.id, "done"), `${r.fullName} arandı olarak işaretlendi.`, () => setCallbackStatusAction(r.id, "new"))}>
                      Arandı
                    </Button>
                  ) : (
                    <Button type="button" variant="secondary" className="min-h-11 px-4" disabled={busy} onClick={() => run(() => setCallbackStatusAction(r.id, "new"), "Talep yeniden açıldı.")}>
                      Geri Al
                    </Button>
                  )}
                </div>
              </div>
              <NoteRow key={`${r.id}-${r.note ?? ""}`} request={r} busy={busy} onSave={(note) => run(() => updateCallbackNoteAction(r.id, note), "Not kaydedildi.")} onDelete={() => run(() => deleteCallbackAction(r.id), "Talep silindi.")} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NoteRow({ request, busy, onSave, onDelete }: { request: CallbackRequest; busy: boolean; onSave: (note: string) => void; onDelete: () => void }) {
  const [note, setNote] = useState(request.note ?? "");
  const [confirming, setConfirming] = useState(false);
  const dirty = note.trim() !== (request.note ?? "").trim();
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Input aria-label="Not" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Not ekleyin (örn. ulaşılamadı, akşam tekrar ara)" className="min-h-10 flex-1 text-sm" />
      <Button type="button" variant="secondary" className="min-h-10 px-4 text-sm" disabled={!dirty || busy} onClick={() => onSave(note)}>
        Kaydet
      </Button>
      {confirming ? (
        <Button type="button" variant="danger" className="min-h-10 px-4 text-sm" disabled={busy} onClick={onDelete}>
          Silmeyi Onayla
        </Button>
      ) : (
        <Button type="button" variant="ghost" className="min-h-10 px-3 text-sm" onClick={() => setConfirming(true)}>
          Sil
        </Button>
      )}
    </div>
  );
}
