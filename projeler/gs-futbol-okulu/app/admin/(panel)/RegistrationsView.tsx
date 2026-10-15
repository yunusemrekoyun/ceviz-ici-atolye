"use client";

import { DateRangeFilter } from "@/components/DateRangeFilter";
import { defaultDateRange, isDateKey, withDateRange, type DateRange } from "@/lib/date-range";
import Link from "next/link";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import {
  ArrowDownUp,
  CalendarDays,
  CalendarPlus,
  Check,
  CalendarX,
  ChevronDown,
  Contact,
  Download,
  Ellipsis,
  FileSpreadsheet,
  MessageCircle,
  Phone,
  Plus,
  Printer,
  QrCode,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Undo2,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import type { BillingOptions } from "@/lib/panel-data";
import type { RegistrationDto } from "@/lib/api";
import { birthYearOf, effectiveGroup, type AgeGroupView } from "@/lib/age-groups";
import { dayLabel, dayLabelAt, formatMoney, PAY_STATUS, PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type PayStatus } from "@/lib/billing-shared";
import { isStudentSort, STUDENT_SORTS, studentComparator, type StudentSort } from "@/lib/student-sort";
import { useRememberList, useUrlFilters } from "@/lib/use-url-filters";
import { formatDateTimeTr, formatDateTr, formatDayLongTr, formatTimeTr, istanbulDayKey } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { REGISTRATION_STATUSES, STATUS_BADGE, STATUS_LABELS, isRegistrationStatus, type RegistrationStatus } from "@/lib/registration-status";
import { matchesSearch } from "@/lib/search";
import { appointmentMessage, firstContactMessage, missedMessage, telLink, whatsappLink } from "@/lib/whatsapp";
import { useToast } from "@/components/admin/Toast";
import { Avatar, Badge, EmptyState, FilterTabs, KeeperBadge, Page, PageHeader, Panel } from "@/components/admin/kit";
import { Menu, type MenuItem } from "@/components/admin/Menu";
import { NoteButton, NotePreview } from "@/components/admin/Notes";
import { fixHref, issuesOf } from "@/lib/data-issues";
import { addDays, MonthGrid } from "@/components/Calendar";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui";
import { cancelAppointmentAction, markNoShowAction, restoreProcessAction, setStatusAction, type ActionResult } from "./actions";
import { ExportDialog } from "./ExportDialog";
import { AppointmentDialog, type BookedSlot } from "./ProcessDialogs";
import { CandidateTabs } from "@/components/admin/SectionTabs";
import type { StudentInsight } from "@/lib/insights";
import { inStudentList, isStudentListKey, STUDENT_LISTS, studentListCounts, type StudentListKey } from "./ogrenciler/lists";

export type RegistrationsViewMode = "registrations" | "appointments" | "students";

type Props = {
  range?: DateRange;
  registrations: RegistrationDto[];
  groups: AgeGroupView[];
  view: RegistrationsViewMode;
  publicFormUrl?: string;
  /** Aidat: erişim durumları (aidat.gor izni varsa). */
  access?: Record<number, PayStatus>;
  billing?: BillingOptions;
  canEdit?: boolean;
  /** Öğrenciler: hazır listeler için öğrenci başına özet (aidat, forma, devam). */
  insights?: Record<number, StudentInsight>;
};

const VIEW_TITLES: Record<RegistrationsViewMode, { title: string; hint: string }> = {
  registrations: { title: "Başvurular", hint: "Formdan ve sahadan gelen adaylar. Satıra dokununca dosyası açılır." },
  appointments: { title: "Randevular", hint: "Veli gelince “Geldi, kaydet”, gelmezse “Gelmedi”." },
  students: { title: "Öğrenciler", hint: "Okula kayıtlı öğrenciler. Satıra dokununca dosyası açılır." },
};

/** Veliye gönderilecek hazır WhatsApp mesajı, sürecin o anki adımına göre. */
function messageFor(r: RegistrationDto): string {
  if (r.status === "scheduled" && r.appointmentAt) return appointmentMessage(r.contact.fullName, r.studentFullName, r.appointmentAt);
  if (r.status === "no_show") return missedMessage(r.contact.fullName, r.studentFullName);
  return firstContactMessage(r.contact.fullName, r.studentFullName);
}

const fileHref = (r: RegistrationDto) => `/admin/kayit/${r.id}`;
const enrollHref = (r: RegistrationDto) => `/admin/kayit/${r.id}/asil-kayit`;

export function RegistrationsView({ registrations, groups, view, publicFormUrl, access, canEdit = true, insights, range }: Props) {
  const toast = useToast();
  useRememberList();
  const dayToday = istanbulDayKey(new Date());
  // Süzgeçler adreste: öğrenci dosyasından geri gelince, sayfa yenilenince aynı liste (PNL-25)
  const { values: f, set, reset, changed } = useUrlFilters(
    { q: "", durum: view === "registrations" ? "active" : "all", grup: "all", liste: "hepsi", sira: "ad", eksik: "", gun: "", yil: "", aidat: "", forma: "", kayitFrom: "", kayitTo: "", yontem: "", foto: "" },
    {
      typed: ["q"],
      valid: { kayitFrom: isDateKey, kayitTo: isDateKey, durum: (v) => v === "all" || v === "active" || isRegistrationStatus(v), liste: isStudentListKey, sira: isStudentSort, gun: (v) => v === "bugun" || /^\d{4}-\d{2}-\d{2}$/.test(v) },
    },
  );
  const query = f.q;
  const statusFilter = f.durum as RegistrationStatus | "all" | "active";
  const groupFilter = f.grup;
  const list = f.liste as StudentListKey;
  const sort = f.sira as StudentSort;
  const onlyIncomplete = f.eksik === "1";
  const dayFilter = f.gun === "bugun" ? dayToday : f.gun || null;
  const setQuery = (v: string) => set({ q: v });
  const setStatusFilter = (v: RegistrationStatus | "all" | "active") => set({ durum: v });
  const setGroupFilter = (v: string) => set({ grup: v });
  const setList = (v: StudentListKey) => set({ liste: v });
  const pickSort = (v: StudentSort) => set({ sira: v });
  const setOnlyIncomplete = (fn: (v: boolean) => boolean) => set({ eksik: fn(onlyIncomplete) ? "1" : "" });
  const setDayFilter = (v: string | null | ((d: string | null) => string | null)) => set({ gun: (typeof v === "function" ? v(dayFilter) : v) ?? "" });
  const [appointmentFor, setAppointmentFor] = useState<number | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [, startTransition] = useTransition();
  const [calendarMonth, setCalendarMonth] = useState(() => (dayFilter ?? istanbulDayKey(new Date())).slice(0, 7));
  const [showCalendar, setShowCalendar] = useState(false);
  const detailKeys = ["yil", "aidat", "forma", "kayitFrom", "kayitTo", "yontem", "foto"] as const;
  const detailCount = detailKeys.filter((k) => f[k]).length;
  const [showMore, setShowMore] = useState(detailCount > 0);

  const byId = useMemo(() => new Map(registrations.map((r) => [r.id, r])), [registrations]);
  const appointmentReg = appointmentFor !== null ? (byId.get(appointmentFor) ?? null) : null;
  const booked = useMemo<BookedSlot[]>(() => registrations.filter((r) => r.status === "scheduled" && r.appointmentAt).map((r) => ({ id: r.id, appointmentAt: r.appointmentAt! })), [registrations]);
  const groupOf = useMemo(() => (r: RegistrationDto) => effectiveGroup(r, groups), [groups]);

  const base = useMemo(() => {
    if (view === "appointments") return registrations.filter((r) => r.status === "scheduled");
    if (view === "students") return registrations.filter((r) => r.status === "enrolled");
    return registrations;
  }, [registrations, view]);

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(REGISTRATION_STATUSES.map((s) => [s, 0])) as Record<RegistrationStatus, number>;
    for (const r of base) if (r.status in counts) counts[r.status as RegistrationStatus]++;
    return counts;
  }, [base]);
  const activeCount = statusCounts.pending + statusCounts.scheduled + statusCounts.no_show;

  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of base) {
      const key = String(groupOf(r).group?.id ?? "none");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [base, groupOf]);

  const filtered = useMemo(() => {
    const rows = base.filter(
      (r) =>
        (statusFilter === "all" || (statusFilter === "active" ? r.status === "pending" || r.status === "scheduled" || r.status === "no_show" : r.status === statusFilter)) &&
        (groupFilter === "all" || String(groupOf(r).group?.id ?? "none") === groupFilter) &&
        (view !== "appointments" || !dayFilter || istanbulDayKey(r.appointmentAt ?? "") === dayFilter) &&
        (!onlyIncomplete || r.missing.length > 0) &&
        (view !== "students" || inStudentList(list, r, insights?.[r.id], dayToday)) &&
        matchesDetail(r, f, { access: access?.[r.id], insight: insights?.[r.id], today: dayToday, students: view === "students" }) &&
        matchesSearch(r, query),
    );
    if (view === "appointments") rows.sort((a, b) => (a.appointmentAt ?? "").localeCompare(b.appointmentAt ?? ""));
    if (view === "students")
      rows.sort(
        studentComparator(sort, {
          groupRank: (r) => {
            const i = groups.findIndex((g) => g.id === groupOf(r).group?.id);
            return i < 0 ? groups.length : i;
          },
          payRank: (r) => (access?.[r.id] ? PAY_STATUS[access[r.id]!].order : 99),
        }),
      );
    return rows;
  }, [base, statusFilter, groupFilter, query, view, groupOf, dayFilter, onlyIncomplete, list, insights, dayToday, sort, groups, access, f]);

  // Hazır listelerin sayıları seçili gruba göre
  const listCounts = useMemo(
    () => (view === "students" ? studentListCounts(base.filter((r) => groupFilter === "all" || String(groupOf(r).group?.id ?? "none") === groupFilter), insights ?? {}, dayToday) : null),
    [view, base, groupFilter, groupOf, insights, dayToday],
  );

  const incompleteCount = useMemo(() => base.filter((r) => r.missing.length > 0 && r.status !== "cancelled").length, [base]);
  const appointmentMarks = useMemo(() => {
    const marks: Record<string, number> = {};
    for (const r of base) if (r.appointmentAt) marks[istanbulDayKey(r.appointmentAt)] = (marks[istanbulDayKey(r.appointmentAt)] ?? 0) + 1;
    return marks;
  }, [base]);

  /** Hızlı işlem + "Geri Al" düğmeli bildirim. */
  function quick(r: RegistrationDto, action: () => Promise<ActionResult>, success: string) {
    const previous = { status: r.status, noShowCount: r.noShowCount, appointmentAt: r.appointmentAt };
    startTransition(async () => {
      const res = await action();
      if (!res.ok) return toast({ kind: "error", text: res.error });
      toast({
        text: success,
        action: {
          label: "Geri Al",
          onClick: () =>
            startTransition(async () => {
              const undo = await restoreProcessAction(r.id, previous);
              toast(undo.ok ? { text: "İşlem geri alındı." } : { kind: "error", text: undo.error });
            }),
        },
      });
    });
  }

  /** Satırın ana eylemi (en fazla iki) ve "⋯" menüsündeki diğerleri. */
  function actionsFor(r: RegistrationDto): { main: ReactNode; more: MenuItem[] } {
    const more: MenuItem[] = [];
    if (r.contact.phone) {
      more.push({ label: "Ara", icon: <Phone />, hint: formatPhone(r.contact.phone), href: telLink(r.contact.phone) });
      more.push({ label: "WhatsApp", icon: <MessageCircle />, href: whatsappLink(r.contact.phone, messageFor(r)), external: true });
    }
    if (!canEdit) return { main: null, more };
    const moreEdit: MenuItem[] = [];
    let main: ReactNode = null;
    switch (r.status) {
      case "pending":
        main = (
          <>
            <Button type="button" size="sm" variant="secondary" onClick={() => setAppointmentFor(r.id)}>
              <CalendarPlus className="ico h-4 w-4 text-gs-red" aria-hidden="true" /> Randevu ver
            </Button>
            <EnrollLink r={r} />
          </>
        );
        moreEdit.push({ label: "Veli vazgeçti", icon: <UserX />, onSelect: () => quick(r, () => setStatusAction(r.id, "cancelled"), `${r.studentFullName}: vazgeçti.`) });
        break;
      case "scheduled":
        main = (
          <>
            <Button type="button" size="sm" variant="secondary" onClick={() => quick(r, () => markNoShowAction(r.id), `${r.studentFullName}: gelmedi olarak işaretlendi.`)}>
              Gelmedi
            </Button>
            <EnrollLink r={r} primary label="Geldi, kaydet" />
          </>
        );
        moreEdit.push({ label: "Randevuyu değiştir", icon: <CalendarDays />, onSelect: () => setAppointmentFor(r.id) });
        moreEdit.push({ label: "Randevuyu geri al", icon: <Undo2 />, onSelect: () => quick(r, () => cancelAppointmentAction(r.id), `${r.studentFullName}: randevu geri alındı.`) });
        break;
      case "no_show":
        main = (
          <>
            <Button type="button" size="sm" variant="secondary" onClick={() => setAppointmentFor(r.id)}>
              <CalendarPlus className="ico h-4 w-4 text-gs-red" aria-hidden="true" /> Yeni randevu
            </Button>
            <EnrollLink r={r} />
          </>
        );
        moreEdit.push({ label: "Veli vazgeçti", icon: <UserX />, onSelect: () => quick(r, () => setStatusAction(r.id, "cancelled"), `${r.studentFullName}: vazgeçti.`) });
        break;
      case "cancelled":
        moreEdit.push({ label: "Süreci yeniden başlat", icon: <RotateCcw />, onSelect: () => quick(r, () => setStatusAction(r.id, "pending"), "Süreç yeniden başlatıldı.") });
        moreEdit.push({ label: "Okula kaydet", icon: <UserCheck />, href: enrollHref(r) });
        break;
    }
    return { main, more: moreEdit.length ? [...moreEdit, ...(more.length ? [{ divider: true } as MenuItem, ...more] : [])] : more };
  }

  const { title, hint } = VIEW_TITLES[view];
  const today = istanbulDayKey(new Date());
  const tomorrow = addDays(today, 1);

  const exportMenu: MenuItem[] = [
    { label: "PDF / Excel", icon: <FileSpreadsheet />, hint: "Sütun ve filtre seçerek", onSelect: () => setShowExport(true) },
    ...(view === "registrations"
      ? ([
          { label: "Rehbere aktar (VCF)", icon: <Contact />, hint: "Veli telefonları", href: "/api/admin/export/vcf", download: true },
          { divider: true },
          { label: "Başvuru formu QR kodu", icon: <QrCode />, onSelect: () => setShowQr(true) },
          { label: "QR afişini yazdır", icon: <Printer />, href: "/admin/qr-afis", external: true },
        ] as MenuItem[])
      : []),
  ];

  // Sekme rozetleri menüdekilerle aynı: bekleyen başvuru ve sonucu girilmemiş randevu.
  const pendingCount = registrations.filter((r) => r.status === "pending").length;
  const scheduledRegs = registrations.filter((r) => r.status === "scheduled");
  const nowIso = new Date().toISOString();
  const overdueCount = scheduledRegs.filter((r) => (r.appointmentAt ?? "") < nowIso && istanbulDayKey(r.appointmentAt ?? "") !== today).length;

  return (
    <Page width="wide">
      {view !== "students" ? <CandidateTabs active={view} pending={pendingCount} overdue={overdueCount} /> : null}
      <PageHeader
        title={title}
        description={hint}
        actions={
          view !== "appointments" ? (
            <>
              <Menu
                label="Dışa aktar"
                items={exportMenu}
                trigger={(p) => (
                  <button type="button" {...p} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-control bg-white px-3.5 text-[15px] font-semibold text-ink shadow-xs transition hover:bg-gray-50 pointer-coarse:min-h-11">
                    <Download className="h-4 w-4 text-muted" aria-hidden="true" /> Dışa aktar <ChevronDown className="h-4 w-4 text-muted" aria-hidden="true" />
                  </button>
                )}
              />
              {canEdit ? (
                <Link href="/admin/kayit/yeni" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-gs-red px-4 lg:hidden text-[15px] font-semibold text-white transition hover:bg-gs-red-dark active:scale-[0.97] pointer-coarse:min-h-11">
                  <Plus className="h-4 w-4" aria-hidden="true" /> Yeni kayıt
                </Link>
              ) : null}
            </>
          ) : null
        }
      />

      {view === "students" && range ? <DateRangeFilter range={range} today={today} label="Devam tarih aralığı" /> : null}
      {/* Süzgeçler */}
      <div className="mb-4 grid gap-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <label className="relative md:max-w-sm md:flex-1">
            <span className="sr-only">Listede ara</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ad, veli ya da telefon" autoComplete="off" className="h-11 w-full rounded-xl border border-control bg-white pl-9 pr-3 text-[16px] shadow-xs outline-none placeholder:text-stone-500 focus:border-gs-red/50 focus:ring-4 focus:ring-gs-red/10 md:h-10 md:text-[15px]" />
          </label>
          {view === "students" ? (
            <label className="relative md:w-64">
              <span className="sr-only">Sırala</span>
              <ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <select
                value={sort}
                onChange={(e) => pickSort(e.target.value as StudentSort)}
                aria-label="Sırala"
                className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-control bg-white pl-9 pr-9 text-[16px] text-ink shadow-xs outline-none focus:border-gs-red/50 focus:ring-4 focus:ring-gs-red/10 md:h-10 md:text-[15px]"
              >
                {STUDENT_SORTS.filter((o) => (!o.billing || access) && !o.attendance).map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            </label>
          ) : null}
          {view !== "students" ? (
            <label className="relative md:w-56">
              <span className="sr-only">Grup</span>
              <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-control bg-white pl-3 pr-9 text-[16px] text-ink shadow-xs outline-none focus:border-gs-red/50 focus:ring-4 focus:ring-gs-red/10 md:h-10 md:text-[15px]">
                <option value="all">Tüm gruplar</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({groupCounts.get(String(g.id)) ?? 0})
                  </option>
                ))}
                <option value="none">Grup dışı yaş ({groupCounts.get("none") ?? 0})</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            </label>
          ) : null}
          {view === "registrations" && (incompleteCount > 0 || onlyIncomplete) ? (
            <button
              type="button"
              aria-pressed={onlyIncomplete}
              onClick={() => setOnlyIncomplete((v) => !v)}
              className={[
                "inline-flex min-h-10 cursor-pointer items-center gap-2 self-start rounded-xl px-3.5 text-sm font-semibold ring-1 ring-inset transition pointer-coarse:min-h-11 md:self-auto",
                onlyIncomplete ? "bg-amber-500 text-white ring-amber-500" : "bg-amber-50 text-amber-900 ring-amber-600/25 hover:bg-amber-100",
              ].join(" ")}
            >
              Eksik bilgili <span className={["rounded-full px-1.5 text-xs tabular-nums", onlyIncomplete ? "bg-white/25" : "bg-white"].join(" ")}>{incompleteCount}</span>
            </button>
          ) : null}
          {view !== "appointments" ? (
            <button
              type="button"
              aria-expanded={showMore}
              onClick={() => setShowMore((v) => !v)}
              className={[
                "inline-flex min-h-11 cursor-pointer items-center gap-2 self-start rounded-xl border px-3.5 text-[15px] font-semibold shadow-xs transition md:min-h-10 md:self-auto",
                detailCount ? "border-ink bg-ink text-white" : "border-control bg-white text-ink hover:bg-gray-50",
              ].join(" ")}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filtreler
              {detailCount ? <span className="rounded-full bg-white/25 px-1.5 text-xs tabular-nums">{detailCount}</span> : null}
            </button>
          ) : null}
          {changed() > 0 ? (
            <button type="button" onClick={() => reset()} className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 self-start rounded-xl px-3 text-[15px] font-semibold text-gs-red hover:bg-gs-red-soft md:min-h-10 md:self-auto">
              <X className="h-4 w-4" aria-hidden="true" /> Filtreleri sıfırla
            </button>
          ) : null}
        </div>
        {showMore && view !== "appointments" ? <MoreFilters rows={base} view={view} values={f} onChange={set} billing={Boolean(access)} kits={Boolean(insights && Object.values(insights).some((i) => i.kit))} /> : null}

        {view === "registrations" ? (
          <FilterTabs<RegistrationStatus | "all" | "active">
            value={statusFilter}
            onChange={setStatusFilter}
            label="Duruma göre"
            options={[
              { value: "active", label: "Süreçte", count: activeCount },
              ...(["pending", "scheduled", "no_show", "enrolled", "cancelled"] as const).map((s) => ({ value: s, label: STATUS_LABELS[s], count: statusCounts[s] })),
              { value: "all", label: "Tümü", count: base.length },
            ]}
          />
        ) : null}
        {view === "students" && listCounts ? (
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Kimleri göstereyim?</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Hazır listeler">
              {STUDENT_LISTS.filter((l) => l.key === "hepsi" || l.key === list || listCounts[l.key] > 0).map((l) => {
                const on = list === l.key;
                return (
                  <button
                    key={l.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setList(l.key)}
                    className={[
                      "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-[15px] font-semibold transition active:scale-[0.97]",
                      on ? "border-ink bg-ink text-white" : "border-control bg-white text-ink hover:border-stone-400",
                    ].join(" ")}
                  >
                    {l.label}
                    <span className={["rounded-full px-1.5 text-xs font-bold tabular-nums", on ? "bg-white/20" : l.key !== "hepsi" && l.tone === "bad" ? "bg-red-50 text-red-700" : "bg-stone-100 text-stone-700"].join(" ")}>{listCounts[l.key]}</span>
                  </button>
                );
              })}
            </div>
            {list !== "hepsi" ? <p className="mt-2 text-sm text-muted">{STUDENT_LISTS.find((l) => l.key === list)?.hint}</p> : null}
          </div>
        ) : null}
        {view === "students" ? <p className="-mb-1 text-sm font-semibold text-ink">Grup</p> : null}
        {view === "students" ? (
          <FilterTabs
            value={groupFilter}
            onChange={setGroupFilter}
            label="Gruba göre"
            options={[
              { value: "all", label: "Tümü", count: base.length },
              ...groups.map((g) => ({ value: String(g.id), label: g.name, count: groupCounts.get(String(g.id)) ?? 0 })),
              ...(groupCounts.get("none") ? [{ value: "none", label: "Grupsuz", count: groupCounts.get("none") ?? 0 }] : []),
            ]}
          />
        ) : null}
        {view === "appointments" ? (
          <div className="lg:hidden">
            <FilterTabs
              value={dayFilter === today ? "today" : dayFilter === tomorrow ? "tomorrow" : dayFilter ? "custom" : "all"}
              onChange={(v) => {
                if (v === "calendar") return setShowCalendar((s) => !s);
                if (v === "custom") return;
                setDayFilter(v === "today" ? today : v === "tomorrow" ? tomorrow : null);
                setShowCalendar(false);
              }}
              label="Güne göre"
              options={[
                { value: "all", label: "Tümü", count: base.length },
                { value: "today", label: "Bugün", count: appointmentMarks[today] ?? 0 },
                { value: "tomorrow", label: "Yarın", count: appointmentMarks[tomorrow] ?? 0 },
                ...(dayFilter && dayFilter !== today && dayFilter !== tomorrow ? [{ value: "custom", label: formatDayLongTr(dayFilter), count: appointmentMarks[dayFilter] ?? 0 }] : []),
                { value: "calendar", label: showCalendar ? "Takvimi gizle" : "Takvim" },
              ]}
            />
          </div>
        ) : null}
      </div>

      <div className={view === "appointments" && base.length > 0 ? "lg:grid lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start lg:gap-6" : undefined}>
        {view === "appointments" && base.length > 0 ? (
          <div className={["mb-4 lg:sticky lg:top-24 lg:mb-0 lg:block", showCalendar ? "block" : "hidden"].join(" ")}>
            <Panel>
              <MonthGrid
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                selected={dayFilter}
                onSelect={(day) => {
                  setDayFilter((d) => (d === day ? null : day));
                  setShowCalendar(false);
                }}
                marks={appointmentMarks}
              />
              <p className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
                {dayFilter ? `${formatDayLongTr(dayFilter)} gösteriliyor` : "Güne dokunarak listeyi süzün"}
                {dayFilter ? (
                  <button type="button" onClick={() => setDayFilter(null)} className="cursor-pointer font-semibold text-gs-red hover:underline">
                    Tüm günler
                  </button>
                ) : null}
              </p>
            </Panel>
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <Panel>
            {base.length === 0 ? (
              view === "registrations" ? (
                <EmptyState title="Henüz başvuru yok" action={<Button type="button" size="md" variant="secondary" onClick={() => setShowQr(true)}><QrCode className="h-4 w-4" aria-hidden="true" /> QR kodu göster</Button>}>
                  QR kodu velilerle paylaşarak başvuru toplamaya başlayabilirsiniz.
                </EmptyState>
              ) : view === "appointments" ? (
                <EmptyState icon={<CalendarDays />} title="Bekleyen randevu yok">Başvurulardan randevu verebilirsiniz.</EmptyState>
              ) : (
                <EmptyState title="Henüz kayıtlı öğrenci yok">Asıl kaydı yapılan öğrenciler burada listelenir.</EmptyState>
              )
            ) : (
              <EmptyState icon={<Search />} title="Bu süzgeçle eşleşen kayıt yok">Aramayı temizleyin ya da başka bir durum seçin.</EmptyState>
            )}
          </Panel>
        ) : view === "appointments" ? (
          <AppointmentList rows={filtered} groupOf={groupOf} actionsFor={actionsFor} today={today} canEdit={canEdit} />
        ) : (
          <Panel flush>
            <ul className="divide-y divide-line">
              {filtered.map((r) => (
                <Row
                  key={r.id}
                  r={r}
                  view={view}
                  group={groupOf(r)}
                  access={access?.[r.id]}
                  actions={view === "registrations" ? actionsFor(r) : null}
                  canEdit={canEdit}
                  extra={view === "students" ? listDetail(list, r, insights?.[r.id], dayToday) : null}
                  payment={view === "students" && access ? (insights?.[r.id]?.lastPayment ?? null) : undefined}
                />
              ))}
            </ul>
          </Panel>
        )}
      </div>
      {filtered.length > 0 ? (
        view === "students" ? (
          <p className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted">
            {filtered.length} öğrenci
            <a href={withDateRange(`/api/admin/export/xlsx?status=enrolled&ids=${filtered.map((r) => r.id).join(",")}&dateField=none`, range ?? defaultDateRange(today))} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 font-semibold text-gs-red hover:bg-gs-red-soft">
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Bu listeyi Excel&apos;e aktar
            </a>
          </p>
        ) : (
          <p className="mt-3 text-center text-xs text-muted">{filtered.length} kayıt</p>
        )
      ) : null}

      {appointmentReg ? (
        <AppointmentDialog
          reg={appointmentReg}
          booked={booked}
          onClose={() => setAppointmentFor(null)}
          onDone={(text) => {
            setAppointmentFor(null);
            toast({ text });
          }}
        />
      ) : null}

      {showExport ? (
        <ExportDialog
          registrations={filtered}
          attendanceRange={range}
          initialDateRange={{ from: f.kayitFrom, to: f.kayitTo }}
          groups={groups}
          initialStatuses={view === "students" ? ["enrolled"] : statusFilter === "all" ? [...REGISTRATION_STATUSES] : statusFilter === "active" ? ["pending", "scheduled", "no_show"] : [statusFilter]}
          initialGroups={groupFilter === "all" ? null : [groupFilter]}
          onClose={() => setShowExport(false)}
          billing={Boolean(access)}
          mode={view === "students" ? "students" : "registrations"}
        />
      ) : null}

      <Modal
        open={showQr}
        title="Başvuru formu QR kodu"
        onClose={() => setShowQr(false)}
        footer={
          <>
            <a href="/admin/qr-afis" target="_blank" rel="noopener" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-control bg-white px-4 font-semibold text-ink transition hover:bg-gray-50">
              <Printer className="h-4 w-4" aria-hidden="true" /> Afişi yazdır
            </a>
            <a href="/api/admin/qr?download=1" download className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gs-red px-4 font-semibold text-white transition hover:bg-gs-red-dark">
              <Download className="h-4 w-4" aria-hidden="true" /> PNG indir
            </a>
          </>
        }
      >
        {showQr ? (
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- sunucuda üretilen dinamik PNG */}
            <img src="/api/admin/qr" alt="Ön kayıt formu QR kodu" className="mx-auto w-full max-w-xs rounded-xl border border-line" />
            {publicFormUrl ? <p className="mt-3 break-all font-mono text-xs text-muted">{publicFormUrl}</p> : null}
          </div>
        ) : null}
      </Modal>
    </Page>
  );
}

/* ---------------- Satır ---------------- */

function Flags({ r, access }: { r: RegistrationDto; access?: PayStatus }) {
  const broken = issuesOf(r).filter((i) => i.severity === "error");
  return (
    <>
      {broken.length ? (
        <Link href={fixHref(r.id, broken[0]!.fix) ?? `/admin/kayit/${r.id}`} title={broken.map((i) => i.label).join(", ")} className="relative z-[1] inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-600/20 hover:bg-red-100">
          Bozuk veri{broken.length > 1 ? ` (${broken.length})` : ""}
        </Link>
      ) : null}
      {r.isGoalkeeper && (r.status === "enrolled" || r.status === "left") ? <KeeperBadge /> : null}
      {r.missing.length > 0 && r.status !== "cancelled" ? <Badge tone="amber">Eksik bilgi</Badge> : null}
      {!broken.length && r.missing.length === 0 ? <CompleteBadge /> : null}
      {r.submission ? <Badge tone="sky">Güncel bilgi geldi</Badge> : r.duplicates?.length ? <Badge tone="violet">Olası tekrar</Badge> : null}
      {access && access !== "paid" && access !== "unbilled" && access !== "inactive" ? <span className={`inline-flex rounded-md px-1.5 py-0.5 text-xs font-semibold ${PAY_STATUS[access].badge}`}>{PAY_STATUS[access].label}</span> : null}
    </>
  );
}

function CompleteBadge() {
  return (
    <Badge tone="green" className="gap-0.5">
      <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" /> Bilgiler tamam
    </Badge>
  );
}

function StatusPill({ status, className }: { status: string; className?: string }) {
  return <span className={`inline-flex shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-semibold ${isRegistrationStatus(status) ? STATUS_BADGE[status] : ""} ${className ?? ""}`}>{STATUS_LABELS[status as RegistrationStatus] ?? status}</span>;
}

/** Kayda almak için tek fiil: "Okula kaydet" (randevulu veli için "Geldi, kaydet"). */
function EnrollLink({ r, primary, label = "Okula kaydet" }: { r: RegistrationDto; primary?: boolean; label?: string }) {
  return (
    <Link
      href={enrollHref(r)}
      className={[
        "inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition active:scale-[0.97] pointer-coarse:min-h-11",
        primary ? "bg-gs-red text-white hover:bg-gs-red-dark" : "border border-control bg-white text-ink shadow-xs hover:bg-gray-50",
      ].join(" ")}
    >
      <UserCheck className={["ico h-4 w-4", primary ? "" : "text-gs-red"].join(" ")} aria-hidden="true" /> {label}
    </Link>
  );
}

function MoreMenu({ items, name }: { items: MenuItem[]; name: string }) {
  if (!items.length) return null;
  return (
    <Menu
      label={`${name} için işlemler`}
      items={items}
      trigger={(p) => (
        <button type="button" {...p} aria-label={`${name} için diğer işlemler`} className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition hover:bg-stone-100 hover:text-ink pointer-coarse:h-11 pointer-coarse:w-11">
          <Ellipsis className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    />
  );
}

/** Hazır listede satıra eklenen bağlama uygun bilgi (ör. "Ödeme günü 27 Eylül", "%40 devam"). */
function listDetail(list: StudentListKey, r: RegistrationDto, i: StudentInsight | undefined, today: string): { text: string; tone: "bad" | "warn" | "info" } | null {
  if (!i) return null;
  switch (list) {
    case "yenileme":
      return i.paidUntil ? { text: i.paidUntil === today ? "Ödeme günü bugün" : `Ödeme günü ${dayLabel(i.paidUntil, false)}`, tone: "warn" } : null;
    case "soz":
      return i.promiseDay ? (i.promiseMissed ? { text: `${dayLabelAt(i.promiseDay)} ödeyecekti, gelmedi`, tone: "bad" } : { text: `${dayLabelAt(i.promiseDay)} ödeyecek`, tone: "info" }) : null;
    case "forma":
      return { text: "Forması girilmedi", tone: "bad" };
    case "forma-para":
      return { text: "Forma / eşofman parası alınmadı", tone: "warn" };
    case "az-gelen":
      return i.attendanceRate !== null ? { text: `Seçili aralıkta %${i.attendanceRate} devam (${i.attended} yoklama)`, tone: "bad" } : null;
    case "eksik":
      return r.missing.length ? { text: `Eksik: ${r.missing.slice(0, 3).join(", ")}${r.missing.length > 3 ? "…" : ""}`, tone: "warn" } : null;
    default:
      return null;
  }
}

function Row({
  r,
  view,
  group,
  access,
  actions,
  canEdit,
  extra,
  payment,
}: {
  r: RegistrationDto;
  view: RegistrationsViewMode;
  group: { group: AgeGroupView | null; suggested: boolean };
  access?: PayStatus;
  actions: { main: ReactNode; more: MenuItem[] } | null;
  canEdit: boolean;
  extra?: { text: string; tone: "bad" | "warn" | "info" } | null;
  /** Son aidat (aidat izni varsa; yoksa undefined). */
  payment?: StudentInsight["lastPayment"];
}) {
  const meta = [r.studentNo ? `No ${r.studentNo}` : null, r.age !== null ? `${r.age} yaş` : null, group.group ? group.group.name : group.suggested ? "Grup dışı yaş" : null].filter(Boolean).join(" · ");
  return (
    <li className="group relative flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition hover:bg-surface/70 sm:px-5">
      <div className="flex min-w-0 flex-1 basis-60 items-center gap-3">
        <Avatar name={r.studentFullName} photoId={r.photoFileId} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {/* Tüm satır bu bağlantıyla açılır; eylem düğmeleri üstte kalır. */}
            <Link href={fileHref(r)} className="truncate text-[15px] font-semibold text-ink after:absolute after:inset-0 after:content-[''] group-hover:text-gs-red">
              {r.studentFullName}
            </Link>
            <Flags r={r} access={access} />
          </div>
          <p className="mt-0.5 flex min-w-0 items-center gap-2 text-sm text-muted">
            {view === "registrations" ? <StatusPill status={r.status} className="md:hidden" /> : null}
            <span className="truncate">{meta || "—"}</span>
          </p>
          {view === "students" ? (
            <p className="mt-0.5 text-xs text-muted md:hidden">
              Kayıt {r.enrolledAt ? dayLabel(istanbulDayKey(r.enrolledAt)) : "—"}
              {payment !== undefined ? <span className="block">{paymentLine(payment)}</span> : null}
            </p>
          ) : null}
          {extra ? <p className={["mt-0.5 text-sm font-medium", extra.tone === "bad" ? "text-red-700" : extra.tone === "info" ? "text-sky-800" : "text-amber-800"].join(" ")}>{extra.text}</p> : null}
          <NotePreview note={r.adminNote} className="mt-1" />
        </div>
      </div>
      <div className="hidden w-52 shrink-0 text-sm md:block">
        <p className="truncate text-ink">{r.contact.fullName || "—"}</p>
        <p className="truncate text-xs tabular-nums text-muted">{r.contact.phone ? formatPhone(r.contact.phone) : ""}</p>
      </div>
      {view === "registrations" ? (
        <div className="w-40 shrink-0 max-md:order-first max-md:hidden">
          <StatusPill status={r.status} />
          <p className="mt-0.5 text-xs text-muted">{r.status === "scheduled" && r.appointmentAt ? `Randevu ${formatDateTimeTr(r.appointmentAt)}` : `Başvuru ${dayLabel(istanbulDayKey(r.createdAt))}`}</p>
        </div>
      ) : (
        <div className="hidden w-60 shrink-0 text-sm md:block">
          <p className="text-ink">
            <span className="text-muted">Kayıt </span>
            {r.enrolledAt ? dayLabel(istanbulDayKey(r.enrolledAt)) : "—"}
          </p>
          {payment !== undefined ? <p className="truncate text-xs text-muted">{paymentLine(payment)}</p> : null}
        </div>
      )}
      <div className={["relative z-[1] flex items-center justify-end gap-2", actions ? "w-full sm:w-auto md:w-[23rem] max-sm:[&>.main]:flex-1" : "ml-auto"].join(" ")}>
        {actions?.main ? <div className="main flex gap-2 max-sm:[&>*]:flex-1 max-sm:[&_.ico]:hidden">{actions.main}</div> : null}
        <NoteButton id={r.id} name={r.studentFullName} note={r.adminNote} canEdit={canEdit} />
        {actions ? <MoreMenu items={actions.more} name={r.studentFullName} /> : null}
      </div>
    </li>
  );
}

/** "Son aidat 23 Eylül · Nakit · 1.500 ₺" */
function paymentLine(p: StudentInsight["lastPayment"]): string {
  if (!p) return "Aidat ödemesi yok";
  return `Son aidat ${dayLabel(p.paidOn, false)} · ${PAYMENT_METHOD_LABELS[p.method] ?? p.method} · ${formatMoney(p.amountKurus)}`;
}

/* ---------------- Ayrıntılı süzgeçler ---------------- */

type DetailValues = { yil: string; aidat: string; forma: string; kayitFrom: string; kayitTo: string; yontem: string; foto: string };

const KIT_FILTER: Record<string, string> = { none: "Forma kaydı yok", unpaid: "Parası alınmadı", order: "Teslim bekliyor", ok: "Tamam" };

function matchesDetail(r: RegistrationDto, v: DetailValues, ctx: { access?: PayStatus; insight?: StudentInsight; today: string; students: boolean }): boolean {
  if (v.yil && String(birthYearOf(r.birthDate) ?? "") !== v.yil) return false;
  if (v.foto && (v.foto === "var") !== Boolean(r.photoFileId)) return false;
  if (v.kayitFrom || v.kayitTo) {
    const at = ctx.students ? r.enrolledAt : r.createdAt;
    if (!at) return false;
    const day = istanbulDayKey(at);
    if (v.kayitFrom && day < v.kayitFrom || v.kayitTo && day > v.kayitTo) return false;
  }
  if (!ctx.students) return true;
  if (v.aidat && ctx.access !== v.aidat) return false;
  if (v.forma && ctx.insight?.kit !== v.forma) return false;
  if (v.yontem && (v.yontem === "yok" ? Boolean(ctx.insight?.lastPayment) : ctx.insight?.lastPayment?.method !== v.yontem)) return false;
  return true;
}

function MoreFilters({ rows, view, values, onChange, billing, kits }: { rows: RegistrationDto[]; view: RegistrationsViewMode; values: DetailValues; onChange: (patch: Partial<DetailValues>) => void; billing: boolean; kits: boolean }) {
  const students = view === "students";
  const years = [...new Set(rows.map((r) => birthYearOf(r.birthDate)).filter((y): y is number => y !== null))].sort((a, b) => b - a);
  const select = (label: string, key: keyof DetailValues, options: { value: string; label: string }[]) => (
    <label className="grid gap-1">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <span className="relative">
        <select
          value={values[key]}
          onChange={(e) => onChange({ [key]: e.target.value })}
          className={[
            "h-11 w-full cursor-pointer appearance-none rounded-xl border bg-white pl-3 pr-9 text-[16px] text-ink shadow-xs outline-none focus:border-gs-red/50 focus:ring-4 focus:ring-gs-red/10 md:h-10 md:text-[15px]",
            values[key] ? "border-ink font-semibold" : "border-control",
          ].join(" ")}
        >
          <option value="">Hepsi</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      </span>
    </label>
  );
  return (
    <div className="grid gap-3 rounded-2xl border border-line bg-white p-3 shadow-xs sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {select("Doğum yılı", "yil", years.map((y) => ({ value: String(y), label: String(y) })))}
      <fieldset className="min-w-0 sm:col-span-2">
        <legend className="mb-1 text-xs font-semibold text-muted">{students ? "Okula kayıt tarihi" : "Başvuru tarihi"}</legend>
        <div className="grid min-w-0 grid-cols-2 gap-2">
          {(["kayitFrom", "kayitTo"] as const).map(key => <label key={key} className="grid min-w-0 gap-1"><span className="text-xs text-muted">{key === "kayitFrom" ? "Başlangıç" : "Bitiş"}</span><input type="date" value={values[key]} min={key === "kayitTo" ? values.kayitFrom || undefined : undefined} max={key === "kayitFrom" ? values.kayitTo || undefined : undefined} onChange={e => onChange({ [key]: e.target.value })} className="h-11 w-full min-w-0 rounded-xl border border-control bg-white px-2 text-[16px] text-ink md:text-[15px]" /></label>)}
        </div>
      </fieldset>
      {students && billing
        ? select(
            "Aidat durumu",
            "aidat",
            (Object.keys(PAY_STATUS) as PayStatus[]).filter((k) => k !== "inactive").map((k) => ({ value: k, label: PAY_STATUS[k].label })),
          )
        : null}
      {students && billing
        ? select("Son ödeme şekli", "yontem", [
            ...PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] })),
            { value: "yok", label: "Hiç ödemesi yok" },
          ])
        : null}
      {students && kits ? select("Forma", "forma", Object.entries(KIT_FILTER).map(([value, label]) => ({ value, label }))) : null}
      {select("Fotoğraf", "foto", [
        { value: "var", label: "Fotoğrafı var" },
        { value: "yok", label: "Fotoğrafı yok" },
      ])}
    </div>
  );
}

/* ---------------- Randevular ---------------- */

function AppointmentList({
  rows,
  groupOf,
  actionsFor,
  today,
  canEdit,
}: {
  rows: RegistrationDto[];
  groupOf: (r: RegistrationDto) => { group: AgeGroupView | null; suggested: boolean };
  actionsFor: (r: RegistrationDto) => { main: ReactNode; more: MenuItem[] };
  today: string;
  canEdit: boolean;
}) {
  const now = new Date().toISOString();
  const sections = new Map<string, RegistrationDto[]>();
  for (const r of rows) {
    const at = r.appointmentAt ?? "";
    const key = at < now && istanbulDayKey(at) !== today ? "overdue" : istanbulDayKey(at);
    sections.set(key, [...(sections.get(key) ?? []), r]);
  }
  const keys = [...sections.keys()].sort((a, b) => (a === "overdue" ? -1 : b === "overdue" ? 1 : a.localeCompare(b)));

  return (
    <div className="grid grid-cols-1 gap-5">
      {keys.map((key) => (
        <section key={key}>
          <h2 className={["mb-2 flex items-center gap-2 text-sm font-semibold", key === "overdue" ? "text-red-700" : key === today ? "text-gs-red" : "text-ink"].join(" ")}>
            {key === "overdue" ? (
              <>
                <CalendarX className="h-4 w-4" aria-hidden="true" /> Geçmiş randevular · sonucu girilmedi
              </>
            ) : key === today ? (
              `Bugün · ${formatDayLongTr(key)}`
            ) : (
              formatDayLongTr(key)
            )}
            <span className="font-normal text-muted">{sections.get(key)!.length}</span>
          </h2>
          <Panel flush>
            <ul className="divide-y divide-line">
              {sections.get(key)!.map((r) => {
                const g = groupOf(r);
                const { main, more } = actionsFor(r);
                return (
                  <li key={r.id} className="group relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 px-4 py-3 transition hover:bg-surface/70 sm:flex sm:gap-x-4 sm:px-5">
                    <span className={["flex w-14 shrink-0 flex-col items-center rounded-lg py-1.5 tabular-nums", key === "overdue" ? "bg-red-50 text-red-800" : "bg-sky-50 text-sky-900"].join(" ")}>
                      <span className="text-[15px] font-bold leading-tight">{formatTimeTr(r.appointmentAt)}</span>
                      {key === "overdue" ? <span className="text-xs">{formatDateTr(istanbulDayKey(r.appointmentAt ?? "")).slice(0, 5)}</span> : null}
                    </span>
                    <div className="min-w-0 sm:flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Link href={fileHref(r)} className="truncate text-[15px] font-semibold text-ink after:absolute after:inset-0 after:content-[''] group-hover:text-gs-red">
                          {r.studentFullName}
                        </Link>
                        <Flags r={r} />
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted">{[r.age !== null ? `${r.age} yaş` : null, g.group?.name, r.contact.fullName].filter(Boolean).join(" · ")}</p>
                      <NotePreview note={r.adminNote} className="mt-1" />
                    </div>
                    {/* Telefonda: not ve diğer işlemler adın yanında; arama ve sonuç düğmeleri alt satırda tam genişlik */}
                    <div className="relative z-[1] flex items-center gap-1 sm:order-last">
                      <NoteButton id={r.id} name={r.studentFullName} note={r.adminNote} canEdit={canEdit} />
                      <MoreMenu items={more.filter((m) => !("href" in m && (m.href.startsWith("tel:") || m.href.includes("wa.me"))))} name={r.studentFullName} />
                    </div>
                    <div className="relative z-[1] col-span-3 flex items-center gap-2">
                      {r.contact.phone ? (
                        <>
                          <a href={telLink(r.contact.phone)} aria-label={`${r.contact.fullName || "Veli"} ara`} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-control bg-white text-gs-red shadow-xs hover:bg-gray-50 pointer-coarse:h-11 pointer-coarse:w-11">
                            <Phone className="h-4 w-4" aria-hidden="true" />
                          </a>
                          <a href={whatsappLink(r.contact.phone, messageFor(r))} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-control bg-white text-emerald-700 shadow-xs hover:bg-gray-50 pointer-coarse:h-11 pointer-coarse:w-11">
                            <MessageCircle className="h-4 w-4" aria-hidden="true" />
                          </a>
                        </>
                      ) : null}
                      <div className="flex min-w-0 flex-1 gap-2 max-sm:[&>*]:flex-1 max-sm:[&_.ico]:hidden sm:flex-none">{main}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </section>
      ))}
    </div>
  );
}
