"use client";

import dynamic from "next/dynamic";
import { useCallback, useState, useTransition } from "react";
import { closeRollAction, markAction, rosterAction } from "@/app/staff-actions";
import { sessionJournalAction } from "@/app/development-actions";
import type { RosterRow } from "@/lib/attendance";
import { ACCESS_BADGE, ACCESS_LABELS } from "@/lib/billing-shared";
import { Button, Textarea } from "@/components/ui";
import { KeeperBadge } from "@/components/admin/kit";

// Kamera ve QR çözücü yalnız tarama açılınca yüklenir.
const QrScanner = dynamic(() => import("./QrScanner").then((m) => m.QrScanner), { ssr: false, loading: () => <p className="text-sm text-muted">Kamera açılıyor…</p> });

type SessionInfo = { id: number; groupName: string; date: string; startTime: string; endTime: string; venueName: string | null; logText: string | null; editable: boolean };

const STATUS_LABEL = { present: "Geldi", absent: "Gelmedi", excused: "İzinli" } as const;

type DrillOption = { id: number; name: string; category: string };

/** `cardScan`: kartla yoklama ayarı açıksa "Kart okut" düğmesi çıkar (kartlar basılana kadar kapalı). */
export function AttendanceSheet({ session, initialRows, canLog, cardScan = false, drills = [], initialDrills = [] }: { session: SessionInfo; initialRows: RosterRow[]; canLog: boolean; cardScan?: boolean; drills?: DrillOption[]; initialDrills?: number[] }) {
  const [chosen, setChosen] = useState<number[]>(initialDrills);
  const [rows, setRows] = useState(initialRows);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState(session.logText ?? "");
  const [logSaved, setLogSaved] = useState(true);
  const [busy, startTransition] = useTransition();

  const reload = useCallback(async () => {
    const res = await rosterAction(session.id);
    if (res.ok) setRows(res.rows);
  }, [session.id]);

  const mark = (r: RosterRow, status: keyof typeof STATUS_LABEL) => {
    const next = r.status === status ? null : status;
    setRows((p) => p.map((x) => (x.id === r.id ? { ...x, status: next } : x)));
    startTransition(async () => {
      const res = await markAction(session.id, r.id, next);
      if (!res.ok) {
        setError(res.error);
        await reload();
      } else setError(null);
    });
  };

  const present = rows.filter((r) => r.status === "present").length;
  const absent = rows.filter((r) => r.status === "absent").length;
  const unmarked = rows.filter((r) => !r.status).length;
  const keepers = rows.filter((r) => r.isGoalkeeper);

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-emerald-50 p-2">
          <p className="text-2xl font-black text-emerald-800">{present}</p>
          <p className="text-xs font-semibold text-emerald-800">Geldi</p>
        </div>
        <div className="rounded-xl bg-red-50 p-2">
          <p className="text-2xl font-black text-red-800">{absent}</p>
          <p className="text-xs font-semibold text-red-800">Gelmedi</p>
        </div>
        <div className="rounded-xl bg-surface p-2">
          <p className="text-2xl font-black text-ink">{unmarked}</p>
          <p className="text-xs font-semibold text-muted">İşaretsiz</p>
        </div>
      </div>

      {keepers.length ? (
        <p className="-mt-2 text-sm text-muted">
          Kaleci: {keepers.length} öğrenci · {keepers.filter((r) => r.status === "present").length} geldi
        </p>
      ) : null}

      {session.editable ? (
        <div className="flex flex-wrap gap-2">
          {cardScan ? (
            <Button type="button" className="min-h-12 flex-1" onClick={() => setScanning((v) => !v)}>
              {scanning ? "Taramayı kapat" : "Kart okut"}
            </Button>
          ) : null}
          {unmarked > 0 ? (
            <Button
              type="button"
              variant="secondary"
              className="min-h-12 flex-1"
              disabled={busy}
              onClick={() =>
                startTransition(async () => {
                  const res = await closeRollAction(session.id);
                  if (!res.ok) setError(res.error);
                  await reload();
                })
              }
            >
              Kalanlar gelmedi
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="rounded-xl bg-surface p-3 text-sm text-muted">Bu seansın yoklaması henüz açılmadı (ileri tarih).</p>
      )}

      {cardScan && scanning ? <QrScanner sessionId={session.id} onMarked={reload} /> : null}
      {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p> : null}

      {rows.length === 0 ? <p className="py-6 text-center text-muted">Bu grupta kayıtlı öğrenci yok.</p> : null}
      <ul className="grid gap-2">
        {rows.map((r) => (
          <li key={r.id} className={["rounded-2xl border bg-white p-3 shadow-sm", r.allowed ? "border-line" : "border-red-300 bg-red-50/60"].join(" ")}>
            <div className="flex items-center gap-3">
              {r.photoFileId ? (
                // eslint-disable-next-line @next/next/no-img-element -- yetki kontrollü dosya adresi
                <img src={`/api/dosya/${r.photoFileId}`} alt="" className="h-12 w-10 shrink-0 rounded-md object-cover" />
              ) : (
                <span className="flex h-12 w-10 shrink-0 items-center justify-center rounded-md bg-surface text-sm font-bold text-muted">{r.name.slice(0, 1)}</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{r.name}</p>
                <p className="text-xs text-muted">
                  No {r.studentNo ?? "—"}
                  {r.source === "qr" ? " · kartla" : r.source === "guardian" && r.status === "excused" ? " · veli bildirdi" : ""}
                  {r.isGoalkeeper ? <KeeperBadge className="ml-1.5" /> : null}
                  {!r.allowed ? <span className={`ml-1 rounded px-1 font-bold ${ACCESS_BADGE[r.access]}`}>{ACCESS_LABELS[r.access]}</span> : null}
                </p>
              </div>
            </div>
            {session.editable ? (
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {(["present", "absent", "excused"] as const).map((s) => {
                  const active = r.status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={active}
                      onClick={() => mark(r, s)}
                      className={[
                        "min-h-11 cursor-pointer rounded-xl border-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40",
                        active
                          ? s === "present"
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : s === "absent"
                              ? "border-red-600 bg-red-600 text-white"
                              : "border-sky-600 bg-sky-600 text-white"
                          : "border-line bg-white text-ink hover:border-gray-400",
                      ].join(" ")}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {canLog ? (
        <section className="rounded-2xl border border-line bg-white p-4">
          <label htmlFor="session-log" className="text-[15px] font-semibold text-ink">
            Antrenman günlüğü
          </label>
          <p className="text-xs text-muted">Bugün ne çalışıldı? Kısa not (velilere gösterilmez).</p>
          {drills.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {drills.map((d) => {
                const on = chosen.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setChosen((p) => (on ? p.filter((x) => x !== d.id) : [...p, d.id]));
                      setLogSaved(false);
                    }}
                    className={["min-h-9 cursor-pointer rounded-full border px-3 text-sm font-semibold", on ? "border-gs-red bg-gs-red text-white" : "border-line text-ink"].join(" ")}
                  >
                    {d.name}
                  </button>
                );
              })}
            </div>
          ) : null}
          <Textarea
            id="session-log"
            rows={3}
            className="mt-2 py-2"
            value={log}
            maxLength={2000}
            onChange={(e) => {
              setLog(e.target.value);
              setLogSaved(false);
            }}
          />
          <div className="mt-2 flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="min-h-10 px-4 text-sm"
              disabled={logSaved || busy}
              onClick={() =>
                startTransition(async () => {
                  const res = await sessionJournalAction(session.id, log, chosen);
                  if (res.ok) setLogSaved(true);
                  else setError(res.error);
                })
              }
            >
              Kaydet
            </Button>
            {logSaved && (log || chosen.length) ? <span className="text-sm text-emerald-700">Kaydedildi</span> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
