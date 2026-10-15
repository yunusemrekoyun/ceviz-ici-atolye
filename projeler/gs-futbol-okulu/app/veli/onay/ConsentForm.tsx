"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Markdown } from "@/components/Markdown";
import { saveConsentsAction } from "../actions";

export type ConsentItem = {
  registrationId: number;
  studentName: string;
  key: string;
  title: string;
  type: "required" | "optional";
  versionId: number;
  body: string;
  current: boolean;
  accepted: boolean | null;
};

export function ConsentForm({ items }: { items: ConsentItem[] }) {
  const id = (i: ConsentItem) => `${i.registrationId}:${i.versionId}`;
  const [answers, setAnswers] = useState<Record<string, boolean | null>>(() => Object.fromEntries(items.map((i) => [id(i), i.current ? i.accepted : null])));
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const router = useRouter();
  const students = [...new Map(items.map((i) => [i.registrationId, i.studentName])).entries()];

  const submit = () => {
    const missing = items.filter((i) => i.type === "required" && answers[id(i)] !== true);
    if (missing.length) return setError(`Onaylanması gereken metin var: ${missing[0]!.title}`);
    const unanswered = items.filter((i) => i.type === "optional" && answers[id(i)] == null);
    if (unanswered.length) return setError(`Lütfen seçim yapın: ${unanswered[0]!.title}`);
    startTransition(async () => {
      const changed = items.filter((i) => !i.current || i.accepted !== answers[id(i)]);
      const res = changed.length
        ? await saveConsentsAction(
            changed.map((i) => ({
              registrationId: i.registrationId,
              versionId: i.versionId,
              accepted: Boolean(answers[id(i)]),
            })),
          )
        : { ok: true as const };
      if (!res.ok) return setError(res.error);
      router.push("/veli");
      router.refresh();
    });
  };

  if (items.length === 0) return <p className="rounded-2xl bg-white p-4 text-muted">Onaylanacak metin yok.</p>;

  return (
    <div className="grid gap-5">
      {students.map(([regId, name]) => {
        const own = items.filter((i) => i.registrationId === regId);
        const required = own.filter((i) => i.type === "required");
        const done = own.filter((i) => (i.type === "required" ? answers[id(i)] === true : answers[id(i)] != null)).length;
        const open = required.filter((i) => answers[id(i)] !== true);
        return (
          <section key={regId} className="veli-consents">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="veli-title text-[28px] text-[var(--v-red)]">{students.length > 1 ? name : "Metinler"}</h2>
              <span className={["shrink-0 rounded-xl px-2.5 py-1 text-sm font-bold", done === own.length ? "bg-emerald-100 text-emerald-900" : "bg-stone-100 text-stone-700"].join(" ")}>
                {done} / {own.length} tamam
              </span>
            </div>
            {open.length > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setAnswers((a) => ({
                    ...a,
                    ...Object.fromEntries(open.map((i) => [id(i), true])),
                  }));
                }}
                className="veli-btn veli-btn--line mb-4 w-full"
              >
                Zorunlu {open.length} metnin hepsini okudum, onaylıyorum
              </button>
            ) : null}
            <ul className="grid gap-4">
              {own.map((i) => (
                <li key={id(i)} className="border-b border-[var(--v-line)] py-4">
                  <p className="text-lg font-bold text-ink">{i.title}</p>
                  <details className="mt-2">
                    <summary className="cursor-pointer font-semibold text-gs-red">Oku</summary>
                    <div className="mt-3 max-h-80 overflow-y-auto rounded-xl bg-surface p-3 text-[16px] text-ink">
                      <Markdown source={i.body} />
                    </div>
                  </details>
                  {i.type === "required" ? (
                    <label className="mt-3 flex min-h-12 cursor-pointer items-center gap-3 text-[17px] font-semibold text-ink">
                      <input
                        type="checkbox"
                        className="h-6 w-6 accent-[var(--color-gs-red)]"
                        checked={answers[id(i)] === true}
                        onChange={(e) =>
                          setAnswers((a) => ({
                            ...a,
                            [id(i)]: e.target.checked,
                          }))
                        }
                      />
                      Okudum, onaylıyorum
                    </label>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {[true, false].map((v) => (
                        <button
                          key={String(v)}
                          type="button"
                          aria-pressed={answers[id(i)] === v}
                          onClick={() => setAnswers((a) => ({ ...a, [id(i)]: v }))}
                          className={["veli-btn", answers[id(i)] === v ? "veli-btn--primary" : "veli-btn--line"].join(" ")}
                        >
                          {v ? "İzin veriyorum" : "İzin vermiyorum"}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {error ? <p className="rounded-2xl bg-red-50 p-3 font-semibold text-red-800">{error}</p> : null}
      <button type="button" onClick={submit} disabled={busy} className="veli-btn veli-btn--primary disabled:opacity-60">
        {busy ? "Kaydediliyor…" : "Kaydet ve devam et"}
      </button>
    </div>
  );
}
