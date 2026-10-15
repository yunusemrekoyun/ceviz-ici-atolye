"use client";

import { useState, useTransition } from "react";
import { formatDateTimeTr } from "@/lib/format";
import { useToast } from "@/components/admin/Toast";
import { Button } from "@/components/ui";
import { revokeOtherSessionsAction, revokeSessionAction } from "../actions";

type SessionRow = { id: string; current: boolean; device: string; ip: string | null; lastIp: string | null; createdAt: string; lastSeenAt: string };

export function SessionList({ sessions }: { sessions: SessionRow[] }) {
  const toast = useToast();
  const [busy, startTransition] = useTransition();
  const [confirmAll, setConfirmAll] = useState(false);
  const others = sessions.filter((s) => !s.current).length;

  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-ink">Açık oturumlar ({sessions.length})</h2>
        {others > 0 ? (
          confirmAll ? (
            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="min-h-10 px-3 text-sm" onClick={() => setConfirmAll(false)}>
                Vazgeç
              </Button>
              <Button
                type="button"
                variant="danger"
                className="min-h-10 px-3 text-sm"
                loading={busy}
                onClick={() =>
                  startTransition(async () => {
                    const res = await revokeOtherSessionsAction();
                    setConfirmAll(false);
                    toast(res.ok ? { text: "Diğer tüm cihazlardan çıkış yapıldı." } : { kind: "error", text: res.error });
                  })
                }
              >
                Evet, hepsini kapat
              </Button>
            </div>
          ) : (
            <Button type="button" variant="secondary" className="min-h-10 px-3 text-sm" onClick={() => setConfirmAll(true)}>
              Diğer cihazlardan çıkış yap
            </Button>
          )
        ) : null}
      </div>
      <ul className="grid gap-3">
        {sessions.map((s) => (
          <li key={s.id} className={["flex flex-wrap items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md", s.current ? "border-emerald-300" : "border-line"].join(" ")}>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                {s.device}
                {s.current ? <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">Bu cihaz</span> : null}
              </p>
              <p className="mt-1 max-w-2xl text-[15px] text-muted">
                IP: <span className="font-mono">{s.lastIp ?? s.ip ?? "bilinmiyor"}</span>
                {s.ip && s.lastIp && s.ip !== s.lastIp ? <span className="font-mono text-xs"> (girişte {s.ip})</span> : null}
              </p>
              <p className="text-xs text-muted">
                Giriş: {formatDateTimeTr(s.createdAt)} · Son işlem: {formatDateTimeTr(s.lastSeenAt)}
              </p>
            </div>
            {!s.current ? (
              <Button
                type="button"
                variant="ghost"
                className="min-h-10 px-3 text-sm text-red-700 hover:bg-red-50"
                disabled={busy}
                onClick={() =>
                  startTransition(async () => {
                    const res = await revokeSessionAction(s.id);
                    toast(res.ok ? { text: `${s.device} oturumu kapatıldı.` } : { kind: "error", text: res.error });
                  })
                }
              >
                Oturumu kapat
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
