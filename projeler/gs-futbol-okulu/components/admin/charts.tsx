import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, MessageCircle, Phone } from "lucide-react";
import { telLink, whatsappLink } from "@/lib/whatsapp";

/**
 * Raporlar için sade görseller (sunucu bileşeni, kütüphanesiz). Her çubukta değer yazılıdır; renk tek başına
 * anlam taşımaz. Dokunulabilir öğeler ilgili listeyi açar.
 */

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const TONE_TEXT = { neutral: "text-ink", good: "text-emerald-700", warn: "text-amber-700", bad: "text-red-700", info: "text-sky-800" } as const;
export type ChartTone = keyof typeof TONE_TEXT;

/** Büyük rakam: soru başlığı, rakam, kısa açıklama; bağlantılıysa tüm kart dokunulur. */
export function Figure({ label, value, sub, tone = "neutral", href, className }: { label: string; value: ReactNode; sub?: ReactNode; tone?: ChartTone; href?: string; className?: string }) {
  const body = (
    <>
      <span className="block text-[15px] font-medium text-muted">{label}</span>
      <span className={cx("mt-1 block text-[28px] font-bold leading-tight tracking-[-0.02em] tabular-nums sm:text-[32px]", TONE_TEXT[tone])}>{value}</span>
      {sub ? <span className="mt-1 block text-sm text-muted">{sub}</span> : null}
      {href ? <ChevronRight className="absolute right-4 top-4 h-5 w-5 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-muted" aria-hidden="true" /> : null}
    </>
  );
  const cls = cx("group relative block rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgb(28_23_21/0.04)] sm:p-5", href && "transition hover:border-stone-300 active:scale-[0.99]", className);
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Seçilen günler için çubuklar; uzun aralıkta grafik kendi içinde kayar. */
export function DateBars({ items, label }: { items: { key: string; label: string; value: number; display: string; current?: boolean }[]; label: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="py-2 text-sm text-muted">Seçili aralıkta tahsilat yok.</p>;
  return (
    <figure aria-label={label} className="flex h-44 items-end gap-2 overflow-x-auto pb-2 sm:gap-3 lg:h-64">
      {items.map((i) => (
        <div key={i.key} className="flex h-full min-w-20 flex-1 flex-col items-center justify-end gap-1.5">
          <span className={cx("whitespace-nowrap text-xs font-semibold tabular-nums", i.current ? "text-ink" : "text-muted")}>{i.display}</span>
          <span
            className={cx("block w-full max-w-12 rounded-t-lg", i.current ? "bg-gs-red" : "bg-stone-300")}
            style={{ height: `${Math.max(i.value > 0 ? 4 : 1, Math.round((i.value / max) * 100))}%` }}
            aria-hidden="true"
          />
          <span className={cx("text-xs", i.current ? "font-semibold text-ink" : "text-muted")}>{i.label}</span>
        </div>
      ))}
    </figure>
  );
}

/** Yatay çubuk listesi: ad solda, değer sağda, çubuk altta. Satır bağlantılıysa dokunulur. */
export function BarList({ items, emptyText }: { items: { key: string; label: string; value: number; max?: number; display: string; sub?: string; href?: string; tone?: ChartTone }[]; emptyText?: string }) {
  if (!items.length) return <p className="py-2 text-sm text-muted">{emptyText ?? "Veri yok."}</p>;
  const max = Math.max(1, ...items.map((i) => i.max ?? i.value));
  const bar = { neutral: "bg-stone-400", good: "bg-emerald-600", warn: "bg-amber-500", bad: "bg-red-600", info: "bg-sky-600" } as const;
  return (
    <ul className="grid gap-1">
      {items.map((i) => {
        const inner = (
          <>
            <span className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[15px] font-medium text-ink">{i.label}</span>
              <span className={cx("shrink-0 text-[15px] font-bold tabular-nums", TONE_TEXT[i.tone ?? "neutral"])}>{i.display}</span>
            </span>
            {i.sub ? <span className="block text-xs text-muted">{i.sub}</span> : null}
            <span className="mt-1.5 block h-2.5 overflow-hidden rounded-full bg-stone-100" aria-hidden="true">
              <span className={cx("block h-full rounded-full", bar[i.tone ?? "neutral"])} style={{ width: `${Math.min(100, Math.round((i.value / (i.max ?? max)) * 100))}%` }} />
            </span>
          </>
        );
        return (
          <li key={i.key}>
            {i.href ? (
              <Link href={i.href} className="-mx-2 block rounded-xl px-2 py-2 transition hover:bg-surface active:scale-[0.99]">
                {inner}
              </Link>
            ) : (
              <div className="py-2">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Sayı listesi: etiket ve değer; bağlantılıysa satır dokunulur. */
export function StatList({ items }: { items: { key: string; label: string; value: string; tone?: ChartTone; href?: string }[] }) {
  return (
    <ul className="-mx-4 divide-y divide-line border-t border-line sm:-mx-5">
      {items.map((i) => {
        const inner = (
          <>
            <span className="min-w-0 flex-1 text-[15px] text-ink">{i.label}</span>
            <span className={cx("shrink-0 text-[17px] font-bold tabular-nums", TONE_TEXT[i.tone ?? "neutral"])}>{i.value}</span>
            {i.href ? <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" aria-hidden="true" /> : <span className="w-4 shrink-0" aria-hidden="true" />}
          </>
        );
        return (
          <li key={i.key}>
            {i.href ? (
              <Link href={i.href} className="flex min-h-13 items-center gap-3 px-4 py-2.5 transition hover:bg-surface/70 sm:px-5">
                {inner}
              </Link>
            ) : (
              <div className="flex min-h-13 items-center gap-3 px-4 py-2.5 sm:px-5">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export type StackSegment = { key: string; label: string; value: number; tone: ChartTone };

/** Parçalı çubuk (ör. bir grupta hakkı var / bekleniyor / söz / yok) ve sayılı açıklama. */
export function StackBar({ segments, total }: { segments: StackSegment[]; total: number }) {
  const bg = { neutral: "bg-stone-400", good: "bg-emerald-600", warn: "bg-amber-500", bad: "bg-red-600", info: "bg-sky-600" } as const;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-stone-100" aria-hidden="true">
        {segments.map((s) => (s.value > 0 ? <span key={s.key} className={bg[s.tone]} style={{ width: `${(s.value / Math.max(1, total)) * 100}%` }} /> : null))}
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm">
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5 text-muted">
              <span className={cx("h-2.5 w-2.5 rounded-sm", bg[s.tone])} aria-hidden="true" />
              <span className={cx("font-semibold tabular-nums", TONE_TEXT[s.tone])}>{s.value}</span> {s.label}
            </span>
          ))}
      </p>
    </div>
  );
}

/** Kişi listesi: ad, alt satır, sağda tek dokunuşla Ara ve WhatsApp (hazır mesajla). */
export function PeopleList({
  people,
  emptyText,
}: {
  people: { id: number; name: string; sub: ReactNode; subTone?: ChartTone; phone: string; message?: string }[];
  emptyText: string;
}) {
  if (!people.length) return <p className="py-2 text-[15px] text-muted">{emptyText}</p>;
  return (
    <ul className="-mx-4 divide-y divide-line border-t border-line sm:-mx-5">
      {people.map((p) => (
        <li key={p.id} className="flex items-center gap-2 px-4 py-2.5 sm:px-5">
          <Link href={`/admin/kayit/${p.id}`} className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold text-ink hover:text-gs-red">{p.name}</span>
            <span className={cx("block truncate text-sm", p.subTone ? TONE_TEXT[p.subTone] : "text-muted")}>{p.sub}</span>
          </Link>
          {p.phone ? (
            <>
              <a href={telLink(p.phone)} aria-label={`${p.name} velisini ara`} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-control bg-white text-gs-red shadow-xs active:scale-95">
                <Phone className="h-5 w-5" aria-hidden="true" />
              </a>
              <a href={whatsappLink(p.phone, p.message)} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} velisine WhatsApp`} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-control bg-white text-emerald-700 shadow-xs active:scale-95">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
              </a>
            </>
          ) : (
            <span className="shrink-0 text-xs text-muted">telefon yok</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Tutarı kısa yazar: 12.500 ₺ → "12,5 bin ₺" (dar çubuklar için). */
export function moneyShort(kurus: number): string {
  const tl = Math.round(kurus / 100);
  if (tl < 1000) return `${tl} ₺`;
  const k = tl / 1000;
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: k < 10 ? 1 : 0 }).format(k)} bin ₺`;
}
