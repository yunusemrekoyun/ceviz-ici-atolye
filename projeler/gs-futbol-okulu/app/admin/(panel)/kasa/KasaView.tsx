"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, MessageCircle, Search } from "lucide-react";
import { useToast } from "@/components/admin/Toast";
import { EmptyState, FilterTabs, Panel } from "@/components/admin/kit";
import { Button } from "@/components/ui";
import { formatMoney, PAYMENT_METHOD_LABELS } from "@/lib/billing-shared";
import { cashTotals, filterCashEntries, groupByDay, type CashDay, type CashEntry } from "@/lib/cashbook-shared";
import { addDaysTo } from "@/lib/dates";
import { formatDayLongTr } from "@/lib/format";
import { dateRangeLabel, withDateRange, type DateRange } from "@/lib/date-range";
import { useRememberList, useUrlFilters } from "@/lib/use-url-filters";
import { cashDayMessage, whatsappShareLink } from "@/lib/whatsapp";
import { CorrectPaymentDialog, ReasonDialog, type CorrectTarget } from "../aidat/BillingParts";
import { voidPaymentAction, voidPaymentsAction } from "../aidat/actions";

type Filter = "all" | "cash" | "eft" | "aidat" | "forma";

const FILTER_LABELS: Record<Filter, string> = { all: "Hepsi", cash: "Nakit", eft: "Havale", aidat: "Aidat", forma: "Forma" };

function matches(e: CashEntry, f: Filter): boolean {
  if (f === "cash" || f === "eft") return e.method === f;
  if (f === "aidat" || f === "forma") return e.kind === f;
  return true;
}

/**
 * Kasa defteri: seçilen aralığın günleri yeniden eskiye, her günün toplamı (nakit / havale) ve tek tek ödemeler.
 * Süzgeç (nakit, havale, aidat, forma) gün toplamlarını da süzer: "Nakit" seçiliyken gün toplamı o gün elden alınan paradır.
 */
export function KasaView({
  entries,
  today,
  range,
  canCollect,
  canOpenFile,
}: {
  entries: CashEntry[];
  today: string;
  range: DateRange;
  canCollect: boolean;
  canOpenFile: boolean;
}) {
  // Süzgeç ve arama adreste: öğrenci dosyasından geri gelince aynı görünüm
  useRememberList();
  const { values: u, set } = useUrlFilters({ tur: "all", q: "", iptal: "" }, { typed: ["q"], valid: { tur: (v) => v in FILTER_LABELS } });
  const filter = u.tur as Filter;
  const setFilter = (v: Filter) => set({ tur: v });
  const query = u.q;
  const setQuery = (v: string) => set({ q: v });
  const showVoided = u.iptal === "1";
  const setShowVoided = (fn: (v: boolean) => boolean) => set({ iptal: fn(showVoided) ? "1" : "" });
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [correcting, setCorrecting] = useState<CorrectTarget | null>(null);
  const [voiding, setVoiding] = useState<CashEntry[] | null>(null);
  const toast = useToast();
  const router = useRouter();

  const voidedCount = entries.filter((e) => e.voided).length;
  const counts = useMemo(() => {
    const c = { all: 0, cash: 0, eft: 0, aidat: 0, forma: 0 } as Record<Filter, number>;
    for (const e of entries) if (!e.voided) for (const f of Object.keys(c) as Filter[]) if (matches(e, f)) c[f]++;
    return c;
  }, [entries]);

  const selectedEntries = useMemo(() => filterCashEntries(entries, { kind: filter, query, showVoided }), [entries, filter, query, showVoided]);
  const days = useMemo(() => groupByDay(selectedEntries), [selectedEntries]);
  const totals = useMemo(() => cashTotals(selectedEntries), [selectedEntries]);
  const exportParams = new URLSearchParams({ odemeTuru: filter, q: query, iptal: showVoided ? "1" : "" });

  const toggle = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const fileHref = (e: CashEntry) => `/admin/kayit/${e.registrationId}#${e.kind === "forma" ? "forma" : "aidat"}`;
  const filterNote = filter === "all" ? undefined : FILTER_LABELS[filter].toLocaleLowerCase("tr-TR");

  if (entries.length === 0)
    return (
      <Panel>
        <EmptyState title={"Seçili aralıkta alınan para yok"}>Aidat ya da forma parası alındığında burada gün gün görünür. Geçmiş bir günün ödemesini “Aidat al” penceresinde “Başka gün” seçerek girebilirsiniz.</EmptyState>
      </Panel>
    );

  return (
    <div className="grid grid-cols-1 gap-5">
      {/* Tarih ve ödeme süzgecinin özeti */}
      <section className="rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgb(28_23_21/0.04)] sm:p-5" aria-label={`${dateRangeLabel(range)} özeti`}>
        <p className="text-[15px] font-medium text-muted">Seçili aralıkta kasaya giren</p>
        <p className="mt-1 text-[32px] font-bold leading-tight tracking-[-0.02em] tabular-nums text-ink">{formatMoney(totals.total)}</p>
        <p className="mt-0.5 text-sm text-muted">{totals.count} ödeme</p>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 sm:grid-cols-4">
          <Mini label="Nakit" value={totals.cash} />
          <Mini label="Havale / EFT" value={totals.eft} />
          <Mini label="Aidat" value={totals.aidat} />
          <Mini label="Forma ve malzeme" value={totals.forma} />
        </dl>
      </section>

      {/* Süzgeç: telefonda kaydırırken üstte kalır */}
      <div className="sticky top-[calc(3.75rem+env(safe-area-inset-top))] z-20 -mx-4 -my-2 flex flex-col gap-2 bg-surface/95 px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:my-0 lg:flex-row lg:items-center lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <label className="relative lg:w-72">
          <span className="sr-only">Öğrenci ya da makbuz ara</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Öğrenci ya da makbuz no"
            className="h-11 w-full rounded-xl border border-control bg-white pl-9 pr-3 text-[16px] shadow-xs outline-none focus:border-gs-red/50 focus:ring-4 focus:ring-gs-red/10 lg:h-10 lg:text-[15px]"
          />
        </label>
        <FilterTabs<Filter> value={filter} onChange={setFilter} label="Ödeme türü" options={(Object.keys(FILTER_LABELS) as Filter[]).map((f) => ({ value: f, label: FILTER_LABELS[f], count: counts[f] }))} />
      </div>

      {range.from <= today && range.to >= today && days[0]?.day !== today && filter === "all" && !query ? <p className="-mb-2 text-[15px] text-muted">Bugün henüz ödeme alınmadı.</p> : null}

      {days.length === 0 ? (
        <Panel>
          <EmptyState title="Bu süzgeçte ödeme yok">Başka bir tür seçin ya da aramayı temizleyin.</EmptyState>
        </Panel>
      ) : (
        days.map((d) => (
          <DaySection
            key={d.day}
            day={d}
            today={today}
            filterNote={filterNote}
            canCollect={canCollect}
            canOpenFile={canOpenFile}
            fileHref={fileHref}
            selecting={selecting}
            selected={selected}
            onToggle={toggle}
            onCorrect={(e) =>
              // "Kayıtta alındı" notu listede rozet olarak gösterilir; düzeltmede kaybolmasın
              setCorrecting({ kind: e.kind, id: e.id, studentName: e.studentName, amountKurus: e.amountKurus, what: e.what, receiptNo: e.receiptNo, method: e.method, day: e.day, note: e.atEnrollment && !e.note ? "Kayıtta alındı" : e.note })
            }
          />
        ))
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <a
          href={withDateRange(`/api/admin/rapor?tur=tahsilat&${exportParams}`, range)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-control bg-white px-4 text-[15px] font-semibold text-ink shadow-xs hover:bg-gray-50"
        >
          <Download className="h-4 w-4 text-muted" aria-hidden="true" /> Seçili aralığın kasa defteri (Excel)
        </a>
        {voidedCount ? (
          <button type="button" onClick={() => setShowVoided((v) => !v)} className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl px-3 text-sm font-semibold text-muted hover:bg-stone-200/60 hover:text-ink">
            {showVoided ? "İptal edilenleri gizle" : `İptal edilen ${voidedCount} ödemeyi göster`}
          </button>
        ) : null}
        {canCollect && counts.aidat > 1 ? (
          <button
            type="button"
            onClick={() => (setSelecting((v) => !v), setSelected([]))}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl px-3 text-sm font-semibold text-muted hover:bg-stone-200/60 hover:text-ink sm:ml-auto"
          >
            {selecting ? "Seçmeyi bırak" : "Birden çok ödemeyi iptal et"}
          </button>
        ) : null}
      </div>

      {selecting ? (
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-lg lg:bottom-4">
          <span className="min-w-0 flex-1 text-[15px] text-ink">{selected.length ? `${selected.length} ödeme seçildi` : "İptal edilecek aidat ödemelerini seçin"}</span>
          <Button type="button" size="md" variant="danger" disabled={!selected.length} onClick={() => setVoiding(entries.filter((e) => e.kind === "aidat" && selected.includes(e.id)))}>
            İptal et
          </Button>
        </div>
      ) : null}

      {correcting ? (
        <CorrectPaymentDialog
          target={correcting}
          today={today}
          onClose={() => setCorrecting(null)}
          onVoid={
            correcting.kind === "aidat"
              ? () => {
                  const e = entries.find((x) => x.kind === "aidat" && x.id === correcting.id);
                  setCorrecting(null);
                  if (e) setVoiding([e]);
                }
              : undefined
          }
        />
      ) : null}
      {voiding ? (
        <ReasonDialog
          title={voiding.length === 1 ? `Makbuz ${voiding[0]!.receiptNo} iptal` : `${voiding.length} ödemeyi iptal et`}
          label={voiding.length === 1 ? "İptal gerekçesi" : `İptal gerekçesi (${voiding.map((e) => e.studentName).join(", ")})`}
          confirm={voiding.length === 1 ? "Ödemeyi iptal et" : `${voiding.length} ödemeyi iptal et`}
          onClose={() => setVoiding(null)}
          onConfirm={async (r) => {
            const res = voiding.length === 1 ? await voidPaymentAction(voiding[0]!.id, r) : await voidPaymentsAction(voiding.map((e) => e.id), r);
            if (res.ok) {
              toast({ text: voiding.length === 1 ? "Ödeme iptal edildi; hak paketi yeniden ödenmedi oldu." : `${voiding.length} ödeme iptal edildi; hak paketleri yeniden ödenmedi oldu.` });
              setVoiding(null);
              setSelected([]);
              setSelecting(false);
              router.refresh();
            }
            return res;
          }}
        />
      ) : null}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={["mt-0.5 text-lg font-bold tabular-nums", value ? "text-ink" : "text-stone-400"].join(" ")}>{formatMoney(value)}</dd>
    </div>
  );
}

function DaySection({
  day,
  today,
  filterNote,
  canCollect,
  canOpenFile,
  fileHref,
  selecting,
  selected,
  onToggle,
  onCorrect,
}: {
  day: CashDay;
  today: string;
  filterNote?: string;
  canCollect: boolean;
  canOpenFile: boolean;
  fileHref: (e: CashEntry) => string;
  selecting: boolean;
  selected: number[];
  onToggle: (id: number) => void;
  onCorrect: (e: CashEntry) => void;
}) {
  const prefix = day.day === today ? "Bugün · " : day.day === addDaysTo(today, -1) ? "Dün · " : "";
  // Nakdi kim aldı (birden çok kişi aldıysa): gün sonu teslimi için
  const takers = new Map<string, number>();
  for (const e of day.entries) if (!e.voided && e.method === "cash" && e.takenBy) takers.set(e.takenBy, (takers.get(e.takenBy) ?? 0) + e.amountKurus);
  const split = [day.cash ? `Nakit ${formatMoney(day.cash)}` : null, day.eft ? `Havale ${formatMoney(day.eft)}` : null, `${day.count} ödeme`].filter(Boolean).join(" · ");

  return (
    <section id={`gun-${day.day}`} className="scroll-mt-40 rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgb(28_23_21/0.04)]" aria-label={formatDayLongTr(day.day)}>
      <header className="flex items-start gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-semibold text-ink">
            {prefix}
            {formatDayLongTr(day.day)}
          </h2>
          <p className="mt-0.5 text-sm text-muted">{split}</p>
          {takers.size > 1 ? <p className="mt-0.5 text-sm text-muted">Nakdi alan: {[...takers.entries()].map(([who, amount]) => `${who} ${formatMoney(amount)}`).join(" · ")}</p> : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-xl font-bold tabular-nums text-ink">{formatMoney(day.total)}</span>
          {day.count ? (
            <a
              href={whatsappShareLink(cashDayMessage(day, filterNote))}
              target="_blank"
              rel="noopener noreferrer"
              className="-mr-1.5 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1.5 text-sm font-semibold text-ink hover:bg-stone-100 pointer-coarse:min-h-11"
              title="Gün sonu özetini WhatsApp ile gönder"
            >
              <MessageCircle className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              Gönder
              <span className="sr-only"> ({formatDayLongTr(day.day)} kasası, WhatsApp)</span>
            </a>
          ) : null}
        </div>
      </header>
      <ul className="divide-y divide-line">
        {day.entries.map((e) => {
          const pickable = selecting && e.kind === "aidat" && !e.voided;
          const meta = [e.kind === "aidat" ? `Aidat · ${e.what}` : e.what, PAYMENT_METHOD_LABELS[e.method], e.takenBy ? `${e.takenBy} aldı` : null].filter(Boolean).join(" · ");
          return (
            <li key={e.key} className={["flex items-start gap-3 px-4 py-3 sm:px-5", e.voided ? "opacity-60" : "", pickable && selected.includes(e.id) ? "bg-red-50/60" : ""].join(" ")}>
              {pickable ? (
                <input
                  type="checkbox"
                  aria-label={`${e.studentName} ${e.receiptNo} seç`}
                  checked={selected.includes(e.id)}
                  onChange={() => onToggle(e.id)}
                  className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[var(--color-gs-red)]"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                {canOpenFile ? (
                  <Link href={fileHref(e)} className={["block truncate text-[15px] font-semibold text-ink hover:text-gs-red", e.voided ? "line-through" : ""].join(" ")}>
                    {e.studentName}
                  </Link>
                ) : (
                  <span className={["block truncate text-[15px] font-semibold text-ink", e.voided ? "line-through" : ""].join(" ")}>{e.studentName}</span>
                )}
                <p className="mt-0.5 text-sm text-muted">
                  {meta}
                  {e.atEnrollment ? " · kayıtta alındı" : ""}
                </p>
                {e.voided ? <p className="mt-0.5 text-sm font-semibold text-red-700">İptal edildi{e.voidReason ? `: ${e.voidReason}` : ""}</p> : null}
                {e.note ? <p className="mt-0.5 text-sm text-ink">“{e.note}”</p> : null}
                {e.receiptNo ? (
                  <a href={`/admin/aidat/makbuz/${e.id}`} target="_blank" rel="noopener" className="-ml-1.5 mt-0.5 inline-flex min-h-8 items-center rounded-md px-1.5 text-sm font-semibold tabular-nums text-gs-red hover:bg-gs-red-soft pointer-coarse:min-h-10">
                    Makbuz {e.receiptNo}
                  </a>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span className={["text-[15px] font-semibold tabular-nums text-ink", e.voided ? "line-through" : ""].join(" ")}>{formatMoney(e.amountKurus)}</span>
                {canCollect && !e.voided && !selecting ? (
                  <button
                    type="button"
                    onClick={() => onCorrect(e)}
                    className="-mr-2 inline-flex min-h-8 cursor-pointer items-center rounded-md px-2 text-sm font-semibold text-muted hover:bg-stone-100 hover:text-ink pointer-coarse:min-h-10"
                  >
                    Düzelt
                    <span className="sr-only"> ({e.studentName})</span>
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
