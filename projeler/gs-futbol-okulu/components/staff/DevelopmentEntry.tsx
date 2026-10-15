"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { DatePicker } from "@/components/Calendar";
import { Button, Select, Textarea } from "@/components/ui";
import { entryRosterAction, saveEvaluationAction, saveMeasurementsAction, saveTestResultsAction, type EntryRow } from "@/app/development-actions";

type Mode = "measure" | "test" | "evaluate";
type Test = { id: number; name: string; unit: string; decimals: number };

const parseNum = (v: string): number | null => {
  const t = v.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};
const show = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));

/** Grup halinde hızlı gelişim girişi: ölçüm, test sonucu ya da antrenör değerlendirmesi. */
export function DevelopmentEntry({ groups, today }: { groups: { id: number; name: string }[]; today: string }) {
  const [groupId, setGroupId] = useState(groups[0]?.id ?? 0);
  const [mode, setMode] = useState<Mode>("measure");
  const [date, setDate] = useState(today);
  const [testId, setTestId] = useState<number | null>(null);
  const [rows, setRows] = useState<EntryRow[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [criteria, setCriteria] = useState<string[]>([]);
  const [values, setValues] = useState<Record<number, { a: string; b: string }>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, startTransition] = useTransition();

  const load = useCallback(async () => {
    if (!groupId) return;
    const res = await entryRosterAction(groupId, mode, date, testId);
    if (!res.ok) return setMessage({ ok: false, text: res.error });
    setRows(res.rows);
    setTests(res.tests);
    setCriteria(res.criteria);
    setValues(Object.fromEntries(res.rows.map((r) => [r.id, { a: show(r.a), b: show(r.b) }])));
    if (mode === "test" && !testId && res.tests[0]) setTestId(res.tests[0].id);
  }, [groupId, mode, date, testId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seçim değişince listeyi sunucudan yükler
    void load();
  }, [load]);

  const save = () =>
    startTransition(async () => {
      const list = rows.map((r) => ({ id: r.id, a: parseNum(values[r.id]?.a ?? ""), b: parseNum(values[r.id]?.b ?? "") }));
      if (list.some((r) => Number.isNaN(r.a) || Number.isNaN(r.b))) return setMessage({ ok: false, text: "Sayı olmayan bir değer var." });
      const res =
        mode === "measure"
          ? await saveMeasurementsAction(groupId, date, list.map((r) => ({ id: r.id, height: r.a, weight: r.b })))
          : await saveTestResultsAction(groupId, testId!, date, list.map((r) => ({ id: r.id, value: r.a })));
      setMessage(res.ok ? { ok: true, text: `${res.count} öğrenci kaydedildi.` } : { ok: false, text: res.error });
      if (res.ok) await load();
    });

  const test = tests.find((t) => t.id === testId);

  if (groups.length === 0) return <p className="rounded-2xl bg-white p-4 text-muted">Size atanmış grup yok.</p>;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Select aria-label="Grup" value={groupId} onChange={(e) => setGroupId(Number(e.target.value))}>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
        <DatePicker id="dev-date" value={date} onChange={setDate} max={today} />
        <div className="flex gap-1 rounded-xl bg-surface p-1">
          {(
            [
              ["measure", "Boy/Kilo"],
              ["test", "Test"],
              ["evaluate", "Değerlendir"],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={mode === k} onClick={() => (setMode(k), setMessage(null))} className={["min-h-10 flex-1 cursor-pointer rounded-lg text-sm font-semibold", mode === k ? "bg-white text-ink shadow-sm" : "text-muted"].join(" ")}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === "test" ? (
        tests.length === 0 ? (
          <p className="rounded-2xl bg-amber-50 p-4 text-amber-900">Bu grup için tanımlı test yok. Yönetici “Testler” sekmesinden test eklemeli.</p>
        ) : (
          <Select aria-label="Test" value={testId ?? ""} onChange={(e) => setTestId(Number(e.target.value))}>
            {tests.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.unit})
              </option>
            ))}
          </Select>
        )
      ) : null}

      {message ? <p className={["rounded-xl p-3 text-sm font-semibold", message.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"].join(" ")}>{message.text}</p> : null}

      {mode === "evaluate" ? (
        <ul className="grid gap-3">
          {rows.map((r) => (
            <EvaluationCard key={`${r.id}-${date}`} row={r} criteria={criteria} date={date} onSaved={load} />
          ))}
        </ul>
      ) : mode === "test" && !test ? null : (
        <>
          <ul className="overflow-hidden rounded-2xl border border-line bg-white">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-2 border-b border-line px-3 py-2 last:border-0">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">{r.name}</span>
                  <span className="text-xs text-muted">No {r.studentNo ?? "—"}</span>
                </span>
                <label className="flex items-center gap-1 text-sm text-muted">
                  <input
                    inputMode="decimal"
                    aria-label={mode === "measure" ? `${r.name} boy` : `${r.name} ${test?.name}`}
                    value={values[r.id]?.a ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [r.id]: { a: e.target.value, b: v[r.id]?.b ?? "" } }))}
                    className="h-12 w-20 rounded-xl border border-gray-300 px-2 text-center text-[16px] text-ink outline-none focus:border-gs-red"
                  />
                  {mode === "measure" ? "cm" : test?.unit}
                </label>
                {mode === "measure" ? (
                  <label className="flex items-center gap-1 text-sm text-muted">
                    <input
                      inputMode="decimal"
                      aria-label={`${r.name} kilo`}
                      value={values[r.id]?.b ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [r.id]: { a: v[r.id]?.a ?? "", b: e.target.value } }))}
                      className="h-12 w-20 rounded-xl border border-gray-300 px-2 text-center text-[16px] text-ink outline-none focus:border-gs-red"
                    />
                    kg
                  </label>
                ) : null}
              </li>
            ))}
            {rows.length === 0 ? <li className="p-4 text-muted">Bu grupta öğrenci yok.</li> : null}
          </ul>
          {rows.length ? (
            <Button type="button" className="min-h-14 text-lg" onClick={save} loading={busy}>
              Kaydet
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}

function EvaluationCard({ row, criteria, date, onSaved }: { row: EntryRow; criteria: string[]; date: string; onSaved: () => void }) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  return (
    <li className="rounded-2xl border border-line bg-white p-4">
      <p className="font-bold text-ink">
        {row.name}
        {row.evaluatedToday ? <span className="ml-2 rounded bg-emerald-100 px-1.5 text-xs font-bold text-emerald-800">Bu tarihte değerlendirildi</span> : null}
      </p>
      <div className="mt-2 grid gap-2">
        {criteria.map((c) => (
          <div key={c} className="flex items-center gap-2">
            <span className="w-32 shrink-0 text-sm text-ink">{c}</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${c} ${n}`}
                  aria-pressed={scores[c] === n}
                  onClick={() => setScores((s) => ({ ...s, [c]: n }))}
                  className={["h-10 w-10 cursor-pointer rounded-lg border-2 font-bold", scores[c] && scores[c] >= n ? "border-gs-yellow bg-gs-yellow text-black" : "border-line text-muted"].join(" ")}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Textarea aria-label="Yorum" rows={2} className="mt-2 py-2" placeholder="Veliye görünecek kısa yorum (isteğe bağlı)" value={comment} maxLength={1000} onChange={(e) => setComment(e.target.value)} />
      <div className="mt-2 flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          className="min-h-10 px-4 text-sm"
          loading={busy}
          onClick={() =>
            startTransition(async () => {
              const res = await saveEvaluationAction(row.id, date, scores, comment);
              setMsg(res.ok ? "Kaydedildi." : res.error);
              if (res.ok) {
                setScores({});
                setComment("");
                onSaved();
              }
            })
          }
        >
          Kaydet
        </Button>
        {msg ? <span className="text-sm text-muted">{msg}</span> : null}
      </div>
    </li>
  );
}
