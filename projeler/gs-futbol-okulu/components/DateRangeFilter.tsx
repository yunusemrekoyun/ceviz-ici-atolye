"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { addDaysTo } from "@/lib/dates";
import { dateRangeLabel, defaultDateRange, validDateRange, type DateRange } from "@/lib/date-range";

type Props = { range: DateRange; today: string; min?: string; label?: string; className?: string; onChange?: (range: DateRange) => void; syncUrl?: boolean };

/** Tarih seçimi listeler, özetler ve indirme bağlantılarıyla aynı aralığı kullanır. */
export function DateRangeFilter(props: Props) {
  return <RangeForm key={`${props.range.from}:${props.range.to}`} {...props} />;
}

function RangeForm({ range, today, min, label = "Tarih aralığı", className = "", onChange, syncUrl = true }: Props) {
  const [draft, setDraft] = useState(range);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const valid = validDateRange(draft) && (!min || draft.from >= min);
  const apply = (next: DateRange) => {
    if (!validDateRange(next)) return;
    const selected = min && next.from < min ? { ...next, from: min } : next;
    if (!validDateRange(selected)) return;
    setDraft(selected);
    const url = new URL(window.location.href);
    url.searchParams.delete("ay");
    url.searchParams.set("from", selected.from);
    url.searchParams.set("to", selected.to);
    if (onChange) {
      onChange(selected);
      if (syncUrl) window.history.replaceState(null, "", `${pathname}${url.search}${url.hash}`);
      return;
    }
    startTransition(() => router.push(`${pathname}${url.search}${url.hash}`, { scroll: false }));
  };
  const control = "h-11 w-full min-w-0 rounded-xl border border-control bg-white px-3 text-[16px] text-ink shadow-xs outline-none focus:border-gs-red/50 focus:ring-4 focus:ring-gs-red/10 sm:h-10 sm:text-[15px]";
  return (
    <form className={`mb-5 grid min-w-0 gap-2 ${className}`} aria-label={label} aria-busy={pending} onSubmit={event => { event.preventDefault(); if (valid) apply(draft); }}>
      <fieldset disabled={pending} className="min-w-0">
        <legend className="mb-1.5 text-sm font-semibold text-ink">{label}</legend>
        <div className="grid min-w-0 grid-cols-2 items-end gap-2 sm:flex sm:flex-wrap">
          <label className="grid min-w-0 gap-1 sm:w-44"><span className="text-xs font-medium text-muted">Başlangıç</span><input type="date" value={draft.from} min={min} max={draft.to || undefined} required onChange={event => setDraft({ ...draft, from: event.target.value })} className={control} /></label>
          <label className="grid min-w-0 gap-1 sm:w-44"><span className="text-xs font-medium text-muted">Bitiş</span><input type="date" value={draft.to} min={draft.from || min} required onChange={event => setDraft({ ...draft, to: event.target.value })} className={control} /></label>
          <button type="submit" disabled={!valid || pending} className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-ink px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-10">{pending ? "Uygulanıyor…" : "Uygula"}</button>
          <div className="col-span-2 flex flex-wrap gap-1 sm:ml-1">
            {[
              { label: "Bugün", value: { from: today, to: today } },
              { label: "Son 7 gün", value: { from: addDaysTo(today, -6), to: today } },
              { label: "Başlangıçtan bugüne", value: defaultDateRange(today) },
            ].map(preset => <button key={preset.label} type="button" onClick={() => apply(preset.value)} className="min-h-10 cursor-pointer rounded-lg px-2.5 text-sm font-medium text-muted transition hover:bg-stone-100 hover:text-ink">{preset.label}</button>)}
          </div>
        </div>
      </fieldset>
      <p className={`text-sm ${valid ? "text-muted" : "text-red-700"}`} role={valid ? undefined : "alert"}>{valid ? `Gösterilen: ${dateRangeLabel(range)}` : "Başlangıç tarihi bitişten sonra olamaz; geçerli bir aralık seçin."}</p>
    </form>
  );
}
