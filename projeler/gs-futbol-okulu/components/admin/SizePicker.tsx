"use client";

import { useState } from "react";
import { normalizeShirt, normalizeSock, shirtLabel, SHIRT_AGES, SHIRT_LETTERS, SOCK_SIZES } from "@/lib/equipment-shared";

// Sütun sayısı genişliğe göre: pencerede 6-7, kayıt ekranının dar kutusunda 4-5; yazı hiç bölünmez
const GRID = "grid grid-cols-[repeat(auto-fill,minmax(3.4rem,1fr))] gap-1.5";

/**
 * Beden seçimi tek dokunuşla: forma-şort için yaş ve harf bedenler, tozluk için numaralar. Listede olmayan beden
 * "Başka" ile yazılır ve aynı biçime getirilir ("8 yaş" → "8"). Boş = bilinmiyor.
 */
export function SizePicker({ id, kind, legend, value, onChange }: { id: string; kind: "shirt" | "sock"; legend: string; value: string; onChange: (v: string) => void }) {
  const presets = kind === "shirt" ? [...SHIRT_AGES, ...SHIRT_LETTERS] : SOCK_SIZES;
  const custom = value && !presets.includes(value) ? value : null;
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const normalize = kind === "shirt" ? normalizeShirt : normalizeSock;
  const shown = kind === "shirt" ? shirtLabel(value) : value;

  const chip = (size: string, label = size) => (
    <button
      key={size}
      type="button"
      aria-pressed={value === size}
      onClick={() => {
        onChange(value === size ? "" : size);
        setTyping(false);
      }}
      className={[
        "min-h-11 cursor-pointer whitespace-nowrap rounded-lg border px-1 text-[15px] font-semibold tabular-nums transition active:scale-[0.97]",
        value === size ? "border-gs-red bg-gs-red-soft text-gs-red ring-1 ring-inset ring-gs-red" : "border-line bg-white text-ink hover:border-gray-400",
      ].join(" ")}
    >
      {label}
    </button>
  );

  return (
    <fieldset>
      <legend className="mb-1.5 flex w-full items-baseline justify-between gap-2 text-sm font-semibold text-ink">
        {legend}
        <span className={["text-sm", value ? "font-bold text-gs-red" : "font-normal text-muted"].join(" ")}>{shown || "Bilinmiyor"}</span>
      </legend>
      {kind === "shirt" ? (
        <>
          <p className="mb-1 text-xs font-medium text-muted">Yaş</p>
          <div className={GRID}>{SHIRT_AGES.map((s) => chip(s))}</div>
          <p className="mb-1 mt-2.5 text-xs font-medium text-muted">Harf beden</p>
          <div className={GRID}>{SHIRT_LETTERS.map((s) => chip(s))}</div>
        </>
      ) : (
        <div className={GRID}>{SOCK_SIZES.map((s) => chip(s))}</div>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {custom ? <span className="grid min-w-16">{chip(custom)}</span> : null}
        <button type="button" aria-pressed={!value} onClick={() => onChange("")} className={["min-h-11 cursor-pointer rounded-lg border px-3 text-sm font-semibold transition", !value ? "border-ink bg-ink text-white" : "border-line bg-white text-muted hover:text-ink"].join(" ")}>
          Bilinmiyor
        </button>
        <button type="button" aria-expanded={typing} aria-controls={`${id}-other`} onClick={() => setTyping((t) => !t)} className="min-h-11 cursor-pointer rounded-lg border border-dashed border-control bg-white px-3 text-sm font-semibold text-muted transition hover:text-ink">
          Başka…
        </button>
      </div>
      {typing ? (
        <div className="mt-2 flex gap-2">
          <label htmlFor={`${id}-other`} className="sr-only">
            {legend} (listede yoksa)
          </label>
          <input
            id={`${id}-other`}
            autoFocus
            value={draft}
            maxLength={20}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              onChange(normalize(draft) ?? "");
              setTyping(false);
              setDraft("");
            }}
            placeholder={kind === "shirt" ? "Ör. 3-4 ya da XXS" : "Ör. 24-26"}
            className="h-11 min-w-0 flex-1 rounded-lg border border-control bg-white px-3 text-[16px] outline-none focus:border-gs-red/50 focus:ring-4 focus:ring-gs-red/10"
          />
          <button
            type="button"
            onClick={() => {
              onChange(normalize(draft) ?? "");
              setTyping(false);
              setDraft("");
            }}
            className="min-h-11 shrink-0 cursor-pointer rounded-lg bg-ink px-4 text-sm font-semibold text-white"
          >
            Tamam
          </button>
        </div>
      ) : null}
    </fieldset>
  );
}
