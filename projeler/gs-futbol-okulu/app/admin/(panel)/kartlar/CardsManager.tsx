"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import { Modal } from "@/components/Modal";
import { Button, Field, Input } from "@/components/ui";
import type { ActionResult } from "@/lib/admin-action";
import { formatDateTimeTr } from "@/lib/format";
import { shrinkImage } from "@/lib/image-client";
import { normalizeForSearch } from "@/lib/search";
import { useRememberList, useUrlFilters } from "@/lib/use-url-filters";
import { reissueCardAction, removePhotoAction, uploadPhotoAction } from "./actions";

export type CardRow = {
  id: number;
  name: string;
  studentNo: number | null;
  group: string | null;
  photoFileId: number | null;
  photoConsent: boolean | null;
  cardCode: string | null;
  printedAt: string | null;
};

export function CardsManager({ rows }: { rows: CardRow[] }) {
  useRememberList();
  const { values: u, set } = useUrlFilters({ q: "", durum: "all" }, { typed: ["q"], valid: { durum: (v) => ["all", "unprinted", "nophoto"].includes(v) } });
  const query = u.q;
  const setQuery = (v: string) => set({ q: v });
  const filter = u.durum as "all" | "unprinted" | "nophoto";
  const setFilter = (v: "all" | "unprinted" | "nophoto") => set({ durum: v });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [reissue, setReissue] = useState<CardRow | null>(null);
  const [uploadFor, setUploadFor] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const visible = useMemo(() => {
    const q = normalizeForSearch(query);
    return rows.filter(
      (r) =>
        (!q || normalizeForSearch(r.name).includes(q) || String(r.studentNo ?? "") === query.trim()) &&
        (filter === "all" || (filter === "unprinted" ? !r.printedAt : r.photoConsent && !r.photoFileId)),
    );
  }, [rows, query, filter]);

  const act = (fn: () => Promise<ActionResult>, ok: string) =>
    startTransition(async () => {
      const res = await fn();
      toast(res.ok ? { text: ok } : { kind: "error", text: res.error });
      if (res.ok) router.refresh();
    });

  const pickPhoto = (id: number) => {
    setUploadFor(id);
    fileRef.current?.click();
  };

  const onFile = async (file: File | undefined) => {
    const id = uploadFor;
    if (!file || id === null) return;
    const small = await shrinkImage(file);
    const form = new FormData();
    form.set("photo", small);
    act(() => uploadPhotoAction(id, form), "Fotoğraf yüklendi.");
    if (fileRef.current) fileRef.current.value = "";
  };

  const toggle = (id: number) =>
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const printHref = `/admin/kartlar/baski?ids=${[...selected].join(",")}`;

  return (
    <div className="mt-5">
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input type="search" placeholder="Öğrenci adı veya numarası" value={query} onChange={(e) => setQuery(e.target.value)} className="sm:max-w-xs" aria-label="Öğrenci ara" />
        <div className="flex gap-1.5 overflow-x-auto">
          {(
            [
              ["all", "Tümü"],
              ["unprinted", "Basılmamış"],
              ["nophoto", "Fotoğrafı eksik"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
              className={["min-h-10 shrink-0 cursor-pointer rounded-full border px-3.5 text-sm font-semibold transition", filter === k ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-gray-400"].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="sticky top-16 z-10 mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white/95 p-3 shadow-sm backdrop-blur lg:top-2">
        <span className="text-sm font-semibold text-ink">{selected.size} seçili</span>
        <button type="button" className="cursor-pointer rounded-lg px-2 py-1 text-sm font-semibold text-gs-red hover:bg-gs-red-soft" onClick={() => setSelected(new Set(visible.map((r) => r.id)))}>
          Görünenleri seç
        </button>
        {selected.size ? (
          <button type="button" className="cursor-pointer rounded-lg px-2 py-1 text-sm font-semibold text-muted hover:bg-surface" onClick={() => setSelected(new Set())}>
            Temizle
          </button>
        ) : null}
        <a
          href={selected.size ? printHref : undefined}
          target="_blank"
          rel="noopener"
          aria-disabled={!selected.size}
          className={["ml-auto inline-flex min-h-11 items-center rounded-xl px-4 font-semibold text-white", selected.size ? "bg-gs-red hover:bg-gs-red-dark" : "pointer-events-none bg-gray-300"].join(" ")}
        >
          Seçilenleri bas
        </a>
      </div>

      {visible.length === 0 ? <p className="mt-8 text-center text-muted">Öğrenci yok.</p> : null}
      <ul className="mt-3 grid gap-3 md:grid-cols-2">
        {visible.map((r) => (
          <li key={r.id} className={["rounded-2xl border bg-white p-3 shadow-sm", selected.has(r.id) ? "border-gs-red ring-2 ring-gs-red/15" : "border-line"].join(" ")}>
            <div className="flex items-start gap-3">
              <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-gs-red)]" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`${r.name} seç`} />
              {r.photoFileId ? (
                // eslint-disable-next-line @next/next/no-img-element -- yetki kontrollü dosya adresi
                <img src={`/api/dosya/${r.photoFileId}`} alt="" className="h-20 w-16 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="flex h-20 w-16 shrink-0 items-center justify-center rounded-lg bg-surface text-xs text-muted">Foto yok</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">{r.name}</p>
                <p className="text-sm text-muted">
                  No {r.studentNo ?? "—"} · {r.group ?? "Grupsuz"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {r.cardCode ? (
                    <>
                      Kart <span className="font-mono">{r.cardCode}</span> · {r.printedAt ? `basıldı ${formatDateTimeTr(r.printedAt)}` : "basılmadı"}
                    </>
                  ) : (
                    "Kart henüz oluşturulmadı (basınca oluşur)"
                  )}
                </p>
                <p className="text-xs">
                  {r.photoConsent === true ? <span className="text-emerald-700">Fotoğraf izni var</span> : r.photoConsent === false ? <span className="text-red-700">Fotoğraf izni verilmedi</span> : <span className="text-muted">Fotoğraf izni işlenmedi</span>}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {r.photoConsent ? (
                <Button type="button" variant="secondary" className="min-h-10 px-3 text-sm" disabled={busy} onClick={() => pickPhoto(r.id)}>
                  {r.photoFileId ? "Fotoğrafı değiştir" : "Fotoğraf ekle"}
                </Button>
              ) : null}
              {r.photoFileId ? (
                <Button type="button" variant="ghost" className="min-h-10 px-3 text-sm" disabled={busy} onClick={() => act(() => removePhotoAction(r.id), "Fotoğraf silindi.")}>
                  Fotoğrafı sil
                </Button>
              ) : null}
              {r.cardCode ? (
                <Button type="button" variant="ghost" className="min-h-10 px-3 text-sm text-red-700 hover:bg-red-50" onClick={() => setReissue(r)}>
                  Kayıp · yeni kart
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {reissue ? <ReissueDialog row={reissue} onClose={() => setReissue(null)} /> : null}
    </div>
  );
}

function ReissueDialog({ row, onClose }: { row: CardRow; onClose: () => void }) {
  const [reason, setReason] = useState("Kart kayboldu");
  const [busy, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <Modal
      open
      title={`${row.name} · yeni kart`}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={busy}
            onClick={() =>
              startTransition(async () => {
                const res = await reissueCardAction(row.id, reason);
                toast(res.ok ? { text: "Yeni kart oluşturuldu; eski kart artık çalışmaz. Basmayı unutmayın." } : { kind: "error", text: res.error });
                if (res.ok) {
                  onClose();
                  router.refresh();
                }
              })
            }
          >
            Eski kartı iptal et, yeni kart oluştur
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink">
        <span className="font-mono">{row.cardCode}</span> kodlu kart iptal edilecek; okutulursa “iptal edilmiş kart” uyarısı çıkar. Öğrenci numarası değişmez.
      </p>
      <div className="mt-3">
        <Field label="Gerekçe" htmlFor="reissue-reason">
          <Input id="reissue-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
        </Field>
      </div>
    </Modal>
  );
}
