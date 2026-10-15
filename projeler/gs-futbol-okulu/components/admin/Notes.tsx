"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { NotebookPen, Pencil, Plus, StickyNote } from "lucide-react";
import { appendNoteAction, updateNoteAction } from "@/app/admin/(panel)/actions";
import { Modal } from "@/components/Modal";
import { Button, Textarea } from "@/components/ui";
import { useToast } from "./Toast";

/** Not satırları, en yenisi önce. */
export function noteLines(note: string | null | undefined): string[] {
  return (note ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .reverse();
}

/** Listelerde adın altında son not (tamamı üzerine gelince). */
export function NotePreview({ note, className }: { note: string | null | undefined; className?: string }) {
  const lines = noteLines(note);
  if (!lines.length) return null;
  return (
    <span className={`flex min-w-0 items-center gap-1.5 text-[13px] text-amber-900 ${className ?? ""}`} title={lines.join("\n")}>
      <StickyNote className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
      <span className="truncate">{lines[0]}</span>
      {lines.length > 1 ? <span className="shrink-0 text-xs text-amber-700/80">+{lines.length - 1}</span> : null}
    </span>
  );
}

/**
 * Notlar: üstte hızlı ekleme (tarihiyle eklenir), altında notlar (en yenisi önce), istenirse tümünü düzenleme.
 * Öğrenci dosyasında ve listelerdeki not penceresinde aynı bileşen kullanılır.
 */
export function NotesEditor({ id, note, canEdit, limit, autoFocus }: { id: number; note: string | null; canEdit: boolean; limit?: number; autoFocus?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  const [full, setFull] = useState(note ?? "");
  const [showAll, setShowAll] = useState(false);
  const [busy, startTransition] = useTransition();
  const lines = noteLines(note);
  const visible = limit && !showAll ? lines.slice(0, limit) : lines;

  const add = () =>
    startTransition(async () => {
      const res = await appendNoteAction(id, text);
      if (!res.ok) return toast({ kind: "error", text: res.error });
      setText("");
      toast({ text: "Not eklendi." });
      router.refresh();
    });

  const saveAll = () =>
    startTransition(async () => {
      const res = await updateNoteAction(id, full);
      if (!res.ok) return toast({ kind: "error", text: res.error });
      setEditing(false);
      toast({ text: "Notlar kaydedildi." });
      router.refresh();
    });

  if (editing)
    return (
      <div className="grid gap-2">
        <Textarea aria-label="Tüm notlar" value={full} onChange={(e) => setFull(e.target.value)} rows={Math.min(12, Math.max(4, full.split("\n").length + 1))} maxLength={4000} className="py-2 text-[15px]" autoFocus />
        <p className="text-xs text-muted">Her satır ayrı bir not. Silmek için satırı kaldırın.</p>
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => (setEditing(false), setFull(note ?? ""))}>
            Vazgeç
          </Button>
          <Button type="button" size="sm" loading={busy} onClick={saveAll}>
            Kaydet
          </Button>
        </div>
      </div>
    );

  return (
    <div className="grid gap-3">
      {canEdit ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) add();
          }}
        >
          <label className="sr-only" htmlFor={`note-add-${id}`}>
            Yeni not
          </label>
          <input
            id={`note-add-${id}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            autoFocus={autoFocus}
            autoComplete="off"
            placeholder="Not yazın, Enter ile ekleyin"
            className="h-11 min-w-0 flex-1 rounded-xl border border-control bg-white px-3 text-[16px] shadow-xs outline-none placeholder:text-stone-500 focus:border-gs-red/50 focus:ring-4 focus:ring-gs-red/10 lg:h-10 lg:text-[15px]"
          />
          <Button type="submit" size="md" variant="secondary" loading={busy} disabled={!text.trim()} aria-label="Notu ekle">
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="max-sm:hidden">Ekle</span>
          </Button>
        </form>
      ) : null}
      {lines.length ? (
        <ul className="grid gap-1.5">
          {visible.map((l, i) => (
            <li key={`${i}-${l}`} className="whitespace-pre-wrap break-words rounded-lg bg-amber-50/70 px-3 py-2 text-sm text-ink ring-1 ring-inset ring-amber-600/10">
              {l}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Henüz not yok.</p>
      )}
      {lines.length > (limit ?? Infinity) || (canEdit && lines.length) ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {limit && lines.length > limit ? (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="cursor-pointer rounded-md px-1 text-sm font-semibold text-gs-red hover:bg-gs-red-soft">
              {showAll ? "Daha az" : `Tüm notlar (${lines.length})`}
            </button>
          ) : (
            <span />
          )}
          {canEdit && lines.length ? (
            <button type="button" onClick={() => (setFull(note ?? ""), setEditing(true))} className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1 text-sm font-semibold text-muted hover:text-ink">
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Düzenle
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Satırdaki not düğmesi: not varsa dolu görünür; dokununca notlar penceresi açılır. */
export function NoteButton({ id, name, note, canEdit }: { id: number; name: string; note: string | null; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const count = noteLines(note).length;
  if (!canEdit && !count) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={count ? `${name}: notlar (${count})` : `${name}: not ekle`}
        title={count ? "Notlar" : "Not ekle"}
        className={[
          "relative inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition active:scale-95 pointer-coarse:h-11 pointer-coarse:w-11",
          count ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100" : "border-control bg-white text-muted shadow-xs hover:bg-gray-50 hover:text-ink",
        ].join(" ")}
      >
        <NotebookPen className="h-4 w-4" aria-hidden="true" />
        {count ? <span className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-amber-500 px-1 text-center text-[11px] font-bold leading-4 text-white">{count}</span> : null}
      </button>
      {open ? (
        <Modal open title={`Notlar · ${name}`} onClose={() => setOpen(false)}>
          <NotesEditor id={id} note={note} canEdit={canEdit} autoFocus />
        </Modal>
      ) : null}
    </>
  );
}
