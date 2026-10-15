"use client";

import { useEffect, useState, useTransition } from "react";
import { useToast } from "@/components/admin/Toast";
import { Modal } from "@/components/Modal";
import { Button, Input } from "@/components/ui";
import { formatDateTr } from "@/lib/format";
import { attestConsentAction, getConsentStatesAction, type ConsentRow } from "./metinler/actions";

/** Öğrencinin onay durumları; veli kâğıt formda onay verdiyse admin buradan işler. */
export function ConsentPanel({ registrationId, canEdit = true }: { registrationId: number; canEdit?: boolean }) {
  const [rows, setRows] = useState<ConsentRow[] | null>(null);
  const [target, setTarget] = useState<ConsentRow | null>(null);
  const [note, setNote] = useState("");
  const [busy, startTransition] = useTransition();
  const toast = useToast();

  useEffect(() => {
    let alive = true;
    getConsentStatesAction(registrationId).then((r) => alive && setRows(r ?? []));
    return () => {
      alive = false;
    };
  }, [registrationId]);

  const record = (accepted: boolean) =>
    startTransition(async () => {
      if (!target) return;
      const res = await attestConsentAction(registrationId, target.versionId, accepted, note);
      if (!res.ok) return toast({ kind: "error", text: res.error });
      toast({ text: "Kaydedildi." });
      setTarget(null);
      setNote("");
      setRows((await getConsentStatesAction(registrationId)) ?? []);
    });

  if (rows === null) return <p className="py-2 text-sm text-muted">Yükleniyor…</p>;
  if (rows.length === 0) return <p className="py-2 text-sm text-muted">Onay gerektiren yayında metin yok.</p>;

  return (
    <>
      <ul className="divide-y divide-line/70">
        {rows.map((r) => {
          const state = !r.last ? "none" : !r.current ? "old" : r.last.accepted ? "yes" : "no";
          const label = { none: "Onay yok", old: `Eski sürüm (v${r.last?.version}) onaylı`, yes: "Onaylandı", no: "Reddetti" }[state];
          const color = { none: "bg-gray-100 text-gray-700", old: "bg-amber-100 text-amber-800", yes: "bg-emerald-100 text-emerald-800", no: "bg-red-100 text-red-800" }[state];
          return (
            <li key={r.key} className="flex flex-wrap items-center gap-2 py-2">
              <span className="min-w-0 flex-1 text-[15px] text-ink">
                {r.title}
                {r.type === "optional" ? <span className="ml-1 text-xs text-muted">(isteğe bağlı)</span> : null}
              </span>
              <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${color}`} title={r.last ? `${formatDateTr(r.last.at.slice(0, 10))} · ${r.last.method === "admin_attest" ? "yazılı, admin işledi" : "veli panelinden"}` : undefined}>
                {label}
              </span>
              {canEdit ? (
                <button type="button" className="inline-flex min-h-9 cursor-pointer items-center rounded-lg px-2.5 text-sm font-semibold text-gs-red hover:bg-gs-red-soft pointer-coarse:min-h-11" onClick={() => setTarget(r)}>
                  Onay gir
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      <Modal
        open={Boolean(target)}
        title={target ? target.title : ""}
        onClose={() => setTarget(null)}
        footer={
          <>
            {target?.type === "optional" ? (
              <Button type="button" variant="secondary" onClick={() => record(false)} loading={busy}>
                İzin vermedi
              </Button>
            ) : null}
            <Button type="button" onClick={() => record(true)} loading={busy}>
              Yazılı onay alındı
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">Velinin bu metnin sürüm {target?.version} içeriğini kâğıt üzerinde imzaladığını kaydediyorsunuz. Kayıt sizin adınızla işlem geçmişine düşer.</p>
        <div className="mt-3">
          <label htmlFor="consent-note" className="mb-1.5 block text-sm font-semibold text-ink">
            Not (isteğe bağlı)
          </label>
          <Input id="consent-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ör. kayıt dosyasında imzalı" maxLength={300} />
        </div>
      </Modal>
    </>
  );
}
