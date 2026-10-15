"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, BellRing, CalendarClock, ChevronRight, FileText, ListChecks, MessageCircle, Search, Settings, X } from "lucide-react";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { dateRangeLabel, withDateRange, type DateRange } from "@/lib/date-range";
import { useToast } from "@/components/admin/Toast";
import { EmptyState, FilterTabs, Page, PageHeader, Panel } from "@/components/admin/kit";
import { NoteButton, NotePreview } from "@/components/admin/Notes";
import { Modal } from "@/components/Modal";
import { Button, Select } from "@/components/ui";
import type { ClaimRow } from "@/lib/billing";
import { dayLabel, formatMoney, PAY_STATUS, PAYMENT_METHOD_LABELS, payStatus, SOON_DAYS, type Access, type PayStatus, type PaymentMethod } from "@/lib/billing-shared";
import { formatDateTimeTr } from "@/lib/format";
import { normalizeForSearch } from "@/lib/search";
import { useRememberList, useUrlFilters } from "@/lib/use-url-filters";
import { approveClaimAction, createOverrideAction, rejectClaimAction } from "./actions";
import { accessLine, BillingPanel, PayPill, PaymentDialog, PromiseDialog, ReasonDialog, reminderHref, type PayTarget } from "./BillingParts";

export type AidatStudent = {
  id: number;
  name: string;
  studentNo: number | null;
  groupId: number | null;
  group: string | null;
  parentName: string;
  phone: string;
  billingDay: number | null;
  /** İndirim uygulanmış 8 antrenmanlık paket tutarı. */
  feeKurus: number;
  discount: string | null;
  access: Access;
  note: string | null;
};

type Tab = "students" | "claims";
/** Ödeme dilinde süzgeç (K-19); "unpaid": ödemeyenlerin hepsi (gecikti, ödeme günü geldi, ilk aidat, söz). */
export type AidatFilter = "all" | "unpaid" | PayStatus;
type GroupSel = "all" | "today" | number;

const UNPAID: PayStatus[] = ["late", "due", "first", "promise"];
const CHIPS: PayStatus[] = ["late", "due", "first", "promise", "soon", "paid"];
/** Süzgeç → adres parametresi (sayfa yenilenince ve paylaşılınca aynı liste açılır). */
const FILTER_PARAM: Partial<Record<AidatFilter, string>> = { late: "gecikti", due: "odeme-gunu", first: "ilk", promise: "soz", soon: "yaklasan", paid: "odedi", unpaid: "odemeyen" };
/** Adresteki durum → süzgeç (eski anahtarlar da: kilitli, tolerans). */
const PARAM_FILTER: Record<string, AidatFilter> = { ...Object.fromEntries(Object.entries(FILTER_PARAM).map(([f, p]) => [p, f as AidatFilter])), kilitli: "late", tolerans: "unpaid" };

function matchesFilter(st: PayStatus, a: Access, f: AidatFilter): boolean {
  if (f === "all") return true;
  // Sözünü tutmayan (gecikti / ödeme günü geldi) söz listesinde de görünür
  if (f === "unpaid") return UNPAID.includes(st) || Boolean(a.promiseMissed);
  if (f === "promise") return st === "promise" || Boolean(a.promiseMissed);
  return st === f;
}

/** Durum içinde sıralama günü: geciken ve ilk aidatta ödeme günü, ek sürede son gün, sözde söz günü, ödeyende sonraki ödeme. */
function sortDay(s: AidatStudent, st: PayStatus): string {
  const a = s.access;
  if (st === "late" || st === "first") return a.dueDate ?? "";
  if (st === "due") return a.lastDay ?? "";
  if (st === "promise") return a.override?.endsOn ?? "";
  return a.paidUntil ?? "";
}

type Props = {
  today: string;
  feeKurus: number;
  graceDays: number;
  students: AidatStudent[];
  claims: ClaimRow[];
  collectedInRange: number;
  range: DateRange;
  canCollect: boolean;
  canOverride: boolean;
  canSettings: boolean;
  /** Öğrenci dosyasını açabilir mi (kayit.gor); açamıyorsa aidat ayrıntısı pencerede gösterilir. */
  canOpenFile: boolean;
  /** Yönetici notu ekleyebilir mi (kayit.duzenle). */
  canNote: boolean;
  initialStudentId: number | null;
  initialTab: Tab;
  groups: { id: number; name: string }[];
  /** Bugün antrenmanı olan gruplar (sahada aidat toplarken). */
  todayGroupIds: number[];
  /** Bugün ekranındaki "Aidat al": arama kutusu odaklı açılır. */
  focusSearch?: boolean;
};

const toTarget = (s: AidatStudent): PayTarget => ({ id: s.id, name: s.name, parentName: s.parentName, phone: s.phone, feeKurus: s.feeKurus, access: s.access });

export function AidatView(props: Props) {
  const { today, feeKurus, students, claims, canCollect } = props;
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(props.initialTab);
  // Süzgeçler adreste (?durum=gecikti&grup=3&q=…): öğrenci dosyasından geri gelince aynı liste
  useRememberList();
  const { values: u, set, reset, changed } = useUrlFilters({ durum: "", grup: "all", q: "" }, { typed: ["q"] });
  const filter: AidatFilter = PARAM_FILTER[u.durum] ?? "all";
  const groupSel: GroupSel = u.grup === "bugun" ? "today" : u.grup !== "all" && props.groups.some((g) => g.id === Number(u.grup)) ? Number(u.grup) : "all";
  const query = u.q;
  const setQuery = (v: string) => set({ q: v });
  const [payFor, setPayFor] = useState<AidatStudent | null>(null);
  const [promiseFor, setPromiseFor] = useState<AidatStudent | null>(null);
  const toast = useToast();
  const [detailId, setDetailId] = useState<number | null>(props.canOpenFile ? null : props.initialStudentId);
  const byId = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const pick = (f: AidatFilter) => {
    setTab("students");
    set({ durum: FILTER_PARAM[f] ?? "" });
  };
  const pickGroup = (g: GroupSel) => set({ grup: g === "today" ? "bugun" : String(g) });

  // Seçili gruptaki öğrenciler ve ödeme durumları; sayılar ve tutarlar bunlardan
  const base = useMemo(
    () =>
      students
        .filter((s) => groupSel === "all" || (groupSel === "today" ? s.groupId !== null && props.todayGroupIds.includes(s.groupId) : s.groupId === groupSel))
        .map((s) => ({ s, st: payStatus(s.access, today) })),
    [students, groupSel, props.todayGroupIds, today],
  );
  const stats = useMemo(() => {
    const out = {} as Record<AidatFilter, { count: number; amount: number }>;
    for (const f of ["all", "unpaid", ...CHIPS, "unbilled"] as AidatFilter[]) out[f] = { count: 0, amount: 0 };
    for (const { s, st } of base)
      for (const f of Object.keys(out) as AidatFilter[])
        if (matchesFilter(st, s.access, f)) {
          out[f].count++;
          out[f].amount += UNPAID.includes(st) || s.access.promiseMissed ? s.access.amountDueKurus : s.feeKurus;
        }
    return out;
  }, [base]);
  const groupCounts = useMemo(() => {
    const m = new Map<number, number>();
    for (const s of students) if (s.groupId !== null) m.set(s.groupId, (m.get(s.groupId) ?? 0) + 1);
    return m;
  }, [students]);

  const visible = useMemo(() => {
    const q = normalizeForSearch(query);
    return base
      .filter(({ s, st }) => matchesFilter(st, s.access, filter) && (!q || normalizeForSearch(s.name).includes(q) || normalizeForSearch(s.parentName).includes(q) || String(s.studentNo ?? "") === query.trim()))
      .sort(
        (a, b) =>
          PAY_STATUS[a.st].order - PAY_STATUS[b.st].order ||
          Number(Boolean(b.s.access.promiseMissed)) - Number(Boolean(a.s.access.promiseMissed)) ||
          sortDay(a.s, a.st).localeCompare(sortDay(b.s, b.st)) ||
          a.s.name.localeCompare(b.s.name, "tr"),
      )
      .map(({ s }) => s);
  }, [base, filter, query]);

  const unpaidTotal = stats.unpaid;
  const groupName = groupSel === "all" ? null : groupSel === "today" ? "bugün antrenmanı olanlar" : (props.groups.find((g) => g.id === groupSel)?.name ?? null);
  const summary = (() => {
    const st = stats[filter];
    const n = `${st.count} öğrenci`;
    if (filter === "all") return { title: "Tüm öğrenciler", text: `${n}${unpaidTotal.count ? ` · ödemeyen ${unpaidTotal.count} öğrenciden ${formatMoney(unpaidTotal.amount)} bekleniyor` : " · herkes ödedi"}` };
    if (filter === "unpaid") return { title: "Ödemeyenler", text: `${n}${st.count ? ` · ${formatMoney(st.amount)} bekleniyor` : ""}`, hint: "Geciken, ödeme günü gelen, ilk aidatı beklenen ve söz verenler; en acil olan üstte." };
    const info = PAY_STATUS[filter];
    const money = !st.count ? "" : filter === "soon" ? ` · ${formatMoney(st.amount)} gelecek` : filter === "paid" ? "" : ` · ${formatMoney(st.amount)} bekleniyor`;
    return { title: info.label, text: `${n}${money}`, hint: filter === "promise" ? `${info.hint} Sözü geçenler de burada, üstte.` : info.hint };
  })();

  const open = (id: number) => (props.canOpenFile ? router.push(`/admin/kayit/${id}#aidat`) : setDetailId(id));
  const detail = detailId ? byId.get(detailId) : null;

  return (
    <Page>
      <PageHeader
        title="Aidat"
        description={feeKurus > 0 ? `${formatMoney(feeKurus)} = 8 antrenman · ${props.graceDays} gün ek süre` : "Aidat tutarı girilmedi"}
        actions={
          <>
            {props.canCollect ? (
              <Link href="/admin/aidat/hak" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-control bg-white px-3.5 text-sm font-semibold text-ink shadow-xs hover:bg-gray-50 pointer-coarse:min-h-11">
                <ListChecks className="h-4 w-4 text-gs-red" aria-hidden="true" /> Hak girişi · kalan antrenmanlar
              </Link>
            ) : null}
            <Link href={withDateRange("/admin/kasa?tur=aidat", props.range)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-control bg-white px-3.5 text-sm font-semibold text-ink shadow-xs hover:bg-gray-50 pointer-coarse:min-h-11">
              <Banknote className="h-4 w-4 text-muted" aria-hidden="true" /> Kasa · gün gün ödemeler
            </Link>
            {props.canSettings ? (
              <Link href="/admin/ayarlar" className="hidden min-h-10 items-center gap-2 rounded-xl border border-control bg-white px-3.5 text-sm font-semibold text-ink shadow-xs hover:bg-gray-50 lg:inline-flex">
                <Settings className="h-4 w-4 text-muted" aria-hidden="true" /> Aidat ayarları
              </Link>
            ) : null}
          </>
        }
      />

      <DateRangeFilter range={props.range} today={today} label="Tahsilat tarih aralığı" />
      <p className="mb-4 text-sm text-muted lg:hidden">Seçili aralıkta alınan aidat: <Link href={withDateRange("/admin/kasa?tur=aidat", props.range)} className="font-semibold text-gs-red">{formatMoney(props.collectedInRange)}</Link></p>

      {feeKurus <= 0 ? (
        <p className="mb-5 rounded-xl bg-gs-yellow-soft px-4 py-3 text-sm text-ink ring-1 ring-inset ring-gs-yellow/60">
          8 antrenmanlık aidat tutarı girilene kadar dönem açılmaz ve hiçbir öğrenci kilitlenmez. {props.canSettings ? "Ayarlar sayfasından tutarı girerek sistemi başlatın." : "Yöneticiden tutarı girmesini isteyin."}
        </p>
      ) : null}

      {claims.length && tab !== "claims" ? (
        <button
          type="button"
          onClick={() => setTab("claims")}
          className="mb-4 flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-left text-sky-900 transition hover:bg-sky-100 active:scale-[0.99]"
        >
          <BellRing className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 text-[15px]">
            <span className="font-semibold">{claims.length} veli ödeme yaptığını bildirdi.</span> Dekontu görüp onaylayın.
          </span>
          <ChevronRight className="h-5 w-5 shrink-0" aria-hidden="true" />
        </button>
      ) : null}

      <div className="mb-5 hidden overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgb(28_23_21/0.04)] lg:grid lg:grid-cols-4">
        <Metric label="Şu an beklenen aidat" value={formatMoney(stats.unpaid.amount)} sub={stats.unpaid.count ? `${stats.unpaid.count} öğrenci ödemedi` : "Herkes ödedi"} tone={stats.unpaid.count ? "warn" : undefined} active={tab === "students" && filter === "unpaid"} onClick={() => pick("unpaid")} />
        <Metric label="Gecikti" value={stats.late.count} sub={stats.late.count ? `${formatMoney(stats.late.amount)} · antrenmana katılamıyor` : "Geciken yok"} tone={stats.late.count ? "alert" : undefined} active={tab === "students" && filter === "late"} onClick={() => pick("late")} />
        <Metric label="Ödemesi yaklaşıyor" value={stats.soon.count} sub={stats.soon.count ? `${SOON_DAYS} gün içinde · ${formatMoney(stats.soon.amount)}` : `${SOON_DAYS} gün içinde yok`} active={tab === "students" && filter === "soon"} onClick={() => pick("soon")} />
        <Metric label="Seçili aralıkta alınan aidat" value={formatMoney(props.collectedInRange)} sub={dateRangeLabel(props.range)} onClick={() => router.push(withDateRange("/admin/kasa?tur=aidat", props.range))} />
      </div>

      <div className="mb-4 border-b border-line pb-2">
        <FilterTabs<Tab>
          value={tab}
          onChange={setTab}
          label="Aidat bölümleri"
          options={[
            { value: "students", label: "Öğrenciler", count: students.length },
            { value: "claims", label: "Veli bildirimleri", count: claims.length },
          ]}
        />
      </div>

      {tab === "students" ? (
        <>
          {/* Telefonda kaydırırken arama, grup ve durumlar üstte kalır */}
          <div className="sticky top-[calc(3.75rem+env(safe-area-inset-top))] z-20 -mx-4 flex flex-col gap-2 bg-surface/95 px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:gap-3 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <div className="flex gap-2">
              <label className="relative min-w-0 flex-1 lg:max-w-sm">
                <span className="sr-only">Öğrenci ara</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input type="search" autoFocus={props.focusSearch} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Öğrenci, veli ya da no" className="h-11 w-full rounded-xl border border-control bg-white pl-9 pr-3 text-[16px] shadow-xs outline-none focus:border-gs-red/50 focus:ring-4 focus:ring-gs-red/10 lg:h-10 lg:text-[15px]" />
              </label>
              <select
                aria-label="Grup"
                value={String(groupSel)}
                onChange={(e) => pickGroup(e.target.value === "all" || e.target.value === "today" ? e.target.value : Number(e.target.value))}
                className={[
                  "h-11 w-[40%] shrink-0 cursor-pointer appearance-none truncate rounded-xl border bg-white bg-[length:16px] bg-[right_0.7rem_center] bg-no-repeat pl-3 pr-8 text-[16px] shadow-xs outline-none focus:border-gs-red/50 focus:ring-4 focus:ring-gs-red/10 sm:w-60 lg:h-10 lg:text-[15px]",
                  groupSel === "all" ? "border-control text-ink" : "border-ink font-semibold text-ink",
                ].join(" ")}
                style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")" }}
              >
                <option value="all">Tüm gruplar</option>
                {props.todayGroupIds.length ? <option value="today">Bugün antrenmanı olanlar</option> : null}
                {props.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({groupCounts.get(g.id) ?? 0})
                  </option>
                ))}
              </select>
              {changed() > 0 ? (
                <button type="button" onClick={() => reset()} aria-label="Filtreleri sıfırla" className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-2.5 text-[15px] font-semibold text-gs-red hover:bg-gs-red-soft lg:min-h-10">
                  <X className="h-4 w-4" aria-hidden="true" />
                  <span className="max-sm:sr-only">Filtreleri sıfırla</span>
                </button>
              ) : null}
            </div>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible" role="tablist" aria-label="Ödeme durumu">
              <StatusChip on={filter === "all"} onClick={() => pick("all")} label="Tümü" count={stats.all.count} />
              <StatusChip on={filter === "unpaid"} onClick={() => pick("unpaid")} label="Ödemeyenler" count={stats.unpaid.count} />
              <span aria-hidden="true" className="mx-0.5 my-2 w-px shrink-0 bg-line" />
              {CHIPS.map((st) => (
                <StatusChip key={st} on={filter === st} onClick={() => pick(st)} label={PAY_STATUS[st].label} count={stats[st].count} dot={PAY_STATUS[st].dot} />
              ))}
              {stats.unbilled.count ? <StatusChip on={filter === "unbilled"} onClick={() => pick("unbilled")} label={PAY_STATUS.unbilled.label} count={stats.unbilled.count} dot={PAY_STATUS.unbilled.dot} /> : null}
            </div>
          </div>
          <p className="mb-3 mt-2 text-[15px] leading-snug text-muted lg:mt-3" aria-live="polite">
            <span className="font-semibold text-ink">{summary.title}</span>
            {groupName ? ` (${groupName})` : ""} · {summary.text}
            {summary.hint ? (
              <>
                <span className="hidden sm:inline">. </span>
                <span className="block text-sm sm:inline sm:text-[15px]">{summary.hint}</span>
              </>
            ) : null}
          </p>
          <Panel flush>
            {visible.length === 0 ? (
              <EmptyState
                title={students.length ? "Bu seçimde öğrenci yok" : "Henüz kayıtlı öğrenci yok"}
                action={
                  students.length && (filter !== "all" || groupSel !== "all" || query) ? (
                    <Button type="button" size="sm" variant="secondary" onClick={() => reset()}>
                      Tüm öğrencileri göster
                    </Button>
                  ) : undefined
                }
              >
                {students.length ? "Başka bir durum ya da grup seçin." : "Okula kaydı yapılan öğrenciler burada listelenir."}
              </EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {visible.map((s) => {
                  const reminder = reminderHref(s, today);
                  return (
                    <li key={s.id} className="group flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition hover:bg-surface/60 sm:px-5">
                      <button type="button" onClick={() => open(s.id)} className="flex min-w-0 flex-1 basis-64 cursor-pointer items-center gap-3 text-left">
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="truncate text-[15px] font-semibold text-ink group-hover:text-gs-red">{s.name}</span>
                            <PayPill access={s.access} today={today} />
                          </span>
                          <span className={`mt-0.5 block truncate text-sm ${s.access.promiseMissed ? "font-medium text-red-700" : s.access.state === "override" ? "text-sky-800" : "text-muted"}`}>
                            {accessLine(s.access, today)}
                          </span>
                          <NotePreview note={s.note} className="mt-1" />
                        </span>
                      </button>
                      <span className="hidden w-48 shrink-0 text-sm text-muted md:block">
                        <span className="block truncate">{[s.studentNo ? `No ${s.studentNo}` : null, s.group].filter(Boolean).join(" · ") || "—"}</span>
                        <span className="block truncate text-xs">
                          {formatMoney(s.feeKurus)}
                          {s.discount ? ` · ${s.discount}` : ""}
                        </span>
                      </span>
                      <span className="flex w-full items-center justify-end gap-2 sm:w-auto">
                        {reminder ? (
                          <a href={reminder} target="_blank" rel="noopener noreferrer" aria-label={`${s.name} için WhatsApp hatırlatma`} title="WhatsApp ile hatırlat" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-control bg-white px-2.5 text-sm font-semibold text-ink shadow-xs hover:bg-gray-50 pointer-coarse:h-11">
                            <MessageCircle className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                            <span className="sm:hidden lg:inline">Hatırlat</span>
                          </a>
                        ) : null}
                        {props.canOverride && (s.access.state === "grace" || s.access.state === "locked" || s.access.state === "override") ? (
                          <button
                            type="button"
                            onClick={() => setPromiseFor(s)}
                            aria-label={`${s.name} için ödeme sözü`}
                            title="Ödeyeceği günü gir"
                            className="inline-flex h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-control bg-white px-2.5 text-sm font-semibold text-ink shadow-xs hover:bg-gray-50 pointer-coarse:h-11"
                          >
                            <CalendarClock className="h-4 w-4 text-sky-700" aria-hidden="true" />
                            <span className="sm:hidden">Söz</span>
                            <span className="hidden lg:inline">{s.access.state === "override" ? "Söz günü" : "Ödeme sözü"}</span>
                          </button>
                        ) : null}
                        <NoteButton id={s.id} name={s.name} note={s.note} canEdit={props.canNote} />
                        {canCollect && feeKurus > 0 ? (
                          <Button type="button" size="sm" variant={s.access.state === "paid" ? "secondary" : "success"} className="flex-1 sm:flex-none" onClick={() => setPayFor(s)}>
                            {s.access.state === "paid" ? "Peşin al" : "Aidat al"}
                          </Button>
                        ) : null}
                        <ChevronRight className="hidden h-4 w-4 text-stone-300 sm:block" aria-hidden="true" />
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </>
      ) : (
        <ClaimsList claims={claims} canCollect={canCollect} feeKurus={feeKurus} feeFor={(id) => byId.get(id)?.feeKurus ?? feeKurus} onOpenStudent={open} />
      )}

      {payFor ? <PaymentDialog student={toTarget(payFor)} today={today} onClose={() => setPayFor(null)} /> : null}
      {promiseFor ? (
        <PromiseDialog
          name={promiseFor.name}
          today={today}
          current={promiseFor.access.state === "override" ? promiseFor.access.override : null}
          onClose={() => setPromiseFor(null)}
          onConfirm={async (endsOn, note) => {
            const res = await createOverrideAction(promiseFor.id, endsOn, note);
            if (res.ok) {
              toast({ text: `${promiseFor.name}: ödeme sözü ${dayLabel(endsOn, false)}.` });
              setPromiseFor(null);
              router.refresh();
            }
            return res;
          }}
        />
      ) : null}
      {detail ? (
        <Modal open title={detail.name} onClose={() => setDetailId(null)} size="lg">
          <BillingPanel
            studentId={detail.id}
            target={toTarget(detail)}
            onPay={() => {
              setDetailId(null);
              setPayFor(detail);
            }}
          />
        </Modal>
      ) : null}
    </Page>
  );
}

function Metric({ label, value, sub, onClick, tone, active }: { label: string; value: React.ReactNode; sub?: string; onClick: () => void; tone?: "alert" | "warn"; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={["relative cursor-pointer border-line p-4 text-left transition hover:bg-surface/70 lg:border-r lg:last:border-r-0", active ? "bg-surface/80" : ""].join(" ")}
    >
      {active ? <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-gs-red" /> : null}
      <p className="text-sm text-muted">{label}</p>
      <p className={["mt-1 text-2xl font-bold tabular-nums tracking-tight", tone === "alert" ? "text-red-700" : tone === "warn" ? "text-amber-700" : "text-ink"].join(" ")}>{value}</p>
      {sub ? <p className="mt-0.5 truncate text-sm text-muted">{sub}</p> : null}
    </button>
  );
}

/** Ödeme durumu düğmesi: renkli nokta, ad, sayı. Sayısı sıfır olan soluk durur ama seçilebilir. */
function StatusChip({ on, onClick, label, count, dot }: { on: boolean; onClick: () => void; label: string; count: number; dot?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  // Telefonda yatay kayan sırada seçili düğme görünür kalsın (adresten gelen süzgeç dahil)
  useEffect(() => {
    if (on) ref.current?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [on]);
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={on}
      onClick={onClick}
      className={[
        "inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition active:scale-[0.97] pointer-coarse:min-h-11",
        on ? "border-ink bg-ink text-white" : count ? "border-line bg-white text-ink hover:border-stone-300" : "border-line bg-white/60 text-muted hover:border-stone-300",
      ].join(" ")}
    >
      {dot ? <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot} ${!on && !count ? "opacity-40" : ""}`} /> : null}
      {label}
      <span className={["rounded-full px-1.5 text-xs tabular-nums", on ? "bg-white/20" : "bg-stone-100 text-stone-600"].join(" ")}>{count}</span>
    </button>
  );
}

/* ---------------- Veli bildirimleri ---------------- */

function ClaimsList({ claims, canCollect, feeKurus, feeFor, onOpenStudent }: { claims: ClaimRow[]; canCollect: boolean; feeKurus: number; feeFor: (registrationId: number) => number; onOpenStudent: (id: number) => void }) {
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [rejecting, setRejecting] = useState<ClaimRow | null>(null);
  const [busy, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  if (claims.length === 0)
    return (
      <Panel>
        <EmptyState title="Onay bekleyen bildirim yok">Veli portaldan “ödeme yaptım” dediğinde burada görünür; onaylayınca antrenman hakkı verilir.</EmptyState>
      </Panel>
    );

  return (
    <Panel flush>
      <ul className="divide-y divide-line">
        {claims.map((c) => (
          <li key={c.id} className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <button type="button" onClick={() => onOpenStudent(c.registrationId)} className="cursor-pointer text-left text-[15px] font-semibold text-ink hover:text-gs-red">
                {c.studentFullName}
              </button>
              <p className="mt-0.5 text-sm text-muted">
                {c.studentNo ? `No ${c.studentNo} · ` : ""}
                {formatDateTimeTr(c.createdAt)} · {PAYMENT_METHOD_LABELS[c.method as PaymentMethod] ?? c.method}
              </p>
              {c.note ? <p className="mt-1 text-sm text-ink">“{c.note}”</p> : null}
              {c.fileId ? (
                <a href={`/api/dosya/${c.fileId}`} target="_blank" rel="noopener" className="mt-1.5 inline-flex min-h-8 items-center gap-1.5 rounded-lg text-sm font-semibold text-gs-red hover:underline">
                  <FileText className="h-4 w-4" aria-hidden="true" /> Dekontu görüntüle
                </a>
              ) : (
                <p className="mt-1 max-w-2xl text-[15px] text-muted">Dekont eklenmemiş.</p>
              )}
            </div>
            {canCollect ? (
              <div className="flex flex-wrap items-center gap-2">
                <Select aria-label="Kaç antrenmanlık" value={String(counts[c.id] ?? 1)} onChange={(e) => setCounts((p) => ({ ...p, [c.id]: Number(e.target.value) }))} className="min-h-10 w-auto text-[15px]">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n * 8} antrenman · {formatMoney(feeFor(c.registrationId) * n)}
                    </option>
                  ))}
                </Select>
                <Button
                  type="button"
                  size="md"
                  variant="success"
                  className="flex-1 lg:flex-none"
                  disabled={busy || feeKurus <= 0}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await approveClaimAction(c.id, counts[c.id] ?? 1);
                      toast(res.ok ? { text: `${c.studentFullName}: aidat onaylandı, antrenman hakkı verildi.` } : { kind: "error", text: res.error });
                      if (res.ok) router.refresh();
                    })
                  }
                >
                  Onayla
                </Button>
                <Button type="button" size="md" variant="ghost" className="text-red-700 hover:bg-red-50" disabled={busy} onClick={() => setRejecting(c)}>
                  Reddet
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {rejecting ? (
        <ReasonDialog
          title={`Reddet · ${rejecting.studentFullName}`}
          label="Red gerekçesi (veliye gösterilmez)"
          confirm="Reddet"
          onClose={() => setRejecting(null)}
          onConfirm={async (r) => {
            const res = await rejectClaimAction(rejecting.id, r);
            if (res.ok) {
              toast({ text: "Bildirim reddedildi; veliye iletişime geçmesi söylendi." });
              setRejecting(null);
              router.refresh();
            }
            return res;
          }}
        />
      ) : null}
    </Panel>
  );
}
