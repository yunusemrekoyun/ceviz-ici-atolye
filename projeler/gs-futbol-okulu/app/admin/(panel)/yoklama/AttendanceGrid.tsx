"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ATTENDANCE_START } from "@/lib/date-range";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { CalendarPlus, Check, Search, X } from "lucide-react";
import { fillRestAction, markAction } from "@/app/staff-actions";
import type { AttendanceStatus } from "@/lib/attendance";
import type { AttendanceGrid as Grid, GridDay, GridStudent } from "@/lib/attendance-grid";
import { dayLabel, formatMoney, PAY_STATUS, PAYMENT_METHOD_LABELS } from "@/lib/billing-shared";
import { shirtLabel } from "@/lib/equipment-shared";
import { formatPhone } from "@/lib/phone";
import { useRememberList, useUrlFilters } from "@/lib/use-url-filters";
import { Avatar, FilterTabs, KeeperBadge } from "@/components/admin/kit";
import { Menu } from "@/components/admin/Menu";
import { useToast } from "@/components/admin/Toast";
import { Button } from "@/components/ui";
import { extendGridStartAction } from "./actions";

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const WEEKDAY_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

/** Kutuya her dokunuş: boş → Geldi → Gelmedi → İzinli → boş */
const NEXT: Record<AttendanceStatus | "none", AttendanceStatus | null> = { none: "present", present: "absent", absent: "excused", excused: null };
const MARK: Record<AttendanceStatus, { sign: string; label: string; cls: string }> = {
  present: { sign: "✓", label: "Geldi", cls: "bg-emerald-600 text-white border-emerald-600" },
  absent: { sign: "✕", label: "Gelmedi", cls: "bg-red-600 text-white border-red-600" },
  excused: { sign: "İ", label: "İzinli", cls: "bg-sky-600 text-white border-sky-600" },
};

/** Öğrenci → (antrenman → durum). Satırlar yalnız kendi öğrencisinin nesnesi değişince yeniden çizilir. */
type Marks = Record<number, Record<number, AttendanceStatus>>;

function toMarks(flat: Grid["marks"]): Marks {
  const out: Marks = {};
  for (const [k, v] of Object.entries(flat)) {
    const [s, r] = k.split(":").map(Number) as [number, number];
    (out[r] ??= {})[s] = v;
  }
  return out;
}

function weekdayShort(day: string): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return WEEKDAY_SHORT[(js + 6) % 7]!;
}

type Perms = { profile: boolean; billing: boolean; extend: boolean };

export function AttendanceGrid({ grid, perms, earliest }: { grid: Grid; perms: Perms; earliest: string | null }) {
  useRememberList();
  const toast = useToast();
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const { values: f, set, reset, changed } = useUrlFilters({ grup: "all", q: "", bilgi: "acik" }, { typed: ["q"] });
  const [marks, setMarks] = useState<Marks>(() => toMarks(grid.marks));
  const marksRef = useRef(marks);
  useEffect(() => {
    marksRef.current = toMarks(grid.marks);
    setMarks(marksRef.current);
  }, [grid.marks]);
  // Aynı kutuya art arda dokunuşlar sırayla kaydedilir (son dokunuş kazanır)
  const queue = useRef(new Map<string, Promise<unknown>>());

  const groupId = f.grup === "all" ? null : Number(f.grup);
  const showInfo = f.bilgi !== "kapali";
  const today = grid.today;

  const rows = useMemo(() => {
    const q = f.q.trim().toLocaleLowerCase("tr-TR");
    const digits = q.replace(/\D/g, "");
    return grid.students.filter(
      (s) =>
        (groupId === null || s.groupId === groupId) &&
        (!q || s.name.toLocaleLowerCase("tr-TR").includes(q) || (digits.length > 0 && (String(s.studentNo ?? "") === digits || (s.phone ?? "").includes(digits)))),
    );
  }, [grid.students, groupId, f.q]);

  const days = useMemo(
    () =>
      grid.days.filter((d) => (groupId === null || groupId in d.sessions || rows.some((r) => d.key in r.cells))),
    [grid.days, groupId, rows],
  );
  const monthSpans = useMemo(() => {
    const out: { month: string; span: number }[] = [];
    for (const d of days) {
      const m = d.date.slice(0, 7);
      if (out.at(-1)?.month === m) out.at(-1)!.span++;
      else out.push({ month: m, span: 1 });
    }
    return out;
  }, [days]);

  const sections = useMemo(() => {
    if (groupId !== null) return [{ id: groupId, name: null as string | null, rows }];
    return grid.groups.map((g) => ({ id: g.id, name: g.name as string | null, rows: rows.filter((r) => r.groupId === g.id) })).filter((s) => s.rows.length);
  }, [grid.groups, groupId, rows]);

  // Açılışta bugünün (yoksa son geçmiş günün) sütunu görünsün
  const scroller = useRef<HTMLDivElement>(null);
  const focusKey = useMemo(() => [...days].reverse().find((d) => d.date <= today)?.key ?? days[0]?.key, [days, today]);
  useLayoutEffect(() => {
    const box = scroller.current;
    const cell = box?.querySelector<HTMLElement>(`[data-day="${focusKey}"]`);
    if (!box || !cell) return;
    // Sığıyorsa hiç kaydırma (bilgi sütunları görünür kalsın); sığmıyorsa bugünü sağ kenarın biraz içine al
    const right = cell.offsetLeft + cell.offsetWidth;
    box.scrollLeft = right > box.clientWidth ? right + cell.offsetWidth - box.clientWidth : 0;
    // Yalnız grup / tarih aralığı değişince; her işaretlemede değil
  }, [focusKey, groupId]);

  const mark = useCallback(
    (student: GridStudent, sessionId: number) => {
      const current = marksRef.current[student.id]?.[sessionId] ?? "none";
      const next = NEXT[current];
      const apply = (value: AttendanceStatus | null) => {
        const m = marksRef.current;
        const own = { ...(m[student.id] ?? {}) };
        if (value) own[sessionId] = value;
        else delete own[sessionId];
        marksRef.current = { ...m, [student.id]: own };
        setMarks(marksRef.current);
      };
      apply(next);
      const key = `${sessionId}:${student.id}`;
      const run = (queue.current.get(key) ?? Promise.resolve()).then(() =>
        markAction(sessionId, student.id, next, true).then((res) => {
          if (res.ok) return;
          // Kaydedilemedi: kutu sunucudaki son hâline döner
          if ((marksRef.current[student.id]?.[sessionId] ?? null) === next) apply(current === "none" ? null : current);
          toast({ kind: "error", text: `${student.name}: ${res.error}` });
        }),
      );
      queue.current.set(key, run);
    },
    [toast],
  );

  const fill = (day: GridDay, status: "present" | "absent") => {
    const s = groupId !== null ? day.sessions[groupId] : null;
    if (!s?.id) return;
    startTransition(async () => {
      const res = await fillRestAction(s.id!, status);
      if (!res.ok) return toast({ kind: "error", text: res.error });
      toast({ text: res.count ? `${dayLabel(day.date, false)}: ${res.count} öğrenci ${status === "present" ? "geldi" : "gelmedi"} olarak işaretlendi.` : "İşaretlenmemiş öğrenci yok." });
      router.refresh();
    });
  };

  const filtersOn = changed(["bilgi"]) > 0;
  const groupOptions = [{ value: "all", label: "Tüm gruplar", count: grid.students.filter((s) => !s.away).length }, ...grid.groups.map((g) => ({ value: String(g.id), label: g.name, count: grid.students.filter((s) => s.groupId === g.id && !s.away).length }))];

  return (
    <div className="grid gap-4">
      <div className="grid gap-3">
        <FilterTabs value={f.grup} onChange={(v) => set({ grup: v })} label="Grup" options={groupOptions} />
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <label className="relative md:max-w-xs md:flex-1">
            <span className="sr-only">Öğrenci ara</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="search"
              value={f.q}
              onChange={(e) => set({ q: e.target.value })}
              placeholder="Ad, numara ya da telefon"
              autoComplete="off"
              className="h-11 w-full rounded-xl border border-control bg-white pl-9 pr-3 text-[16px] shadow-xs outline-none placeholder:text-stone-500 focus:border-gs-red/50 focus:ring-4 focus:ring-gs-red/10 md:h-10 md:text-[15px]"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={showInfo}
              onClick={() => set({ bilgi: showInfo ? "kapali" : "acik" })}
              className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-control bg-white px-3.5 text-[15px] font-semibold text-ink shadow-xs transition hover:bg-gray-50 md:min-h-10"
            >
              <span className={["flex h-4 w-4 items-center justify-center rounded border", showInfo ? "border-ink bg-ink text-white" : "border-control"].join(" ")}>{showInfo ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" /> : null}</span>
              <span className="md:hidden">Bilgiler</span>
              <span className="max-md:hidden">Forma, aidat, irtibat</span>
            </button>
          </div>
          {filtersOn ? (
            <button type="button" onClick={() => reset(["bilgi"])} className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 self-start rounded-xl px-3 text-[15px] font-semibold text-gs-red hover:bg-gs-red-soft md:min-h-10 md:self-auto">
              <X className="h-4 w-4" aria-hidden="true" /> Filtreleri sıfırla
            </button>
          ) : null}
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted sm:gap-x-4 sm:text-sm">
          <span>Kutuya dokunun: bir kez</span>
          <Legend status="present" />
          <Legend status="absent" />
          <Legend status="excused" />
          <span>dördüncüde boşalır.</span>
          {groupId === null ? <span>Bir günü toplu işaretlemek için önce grubu seçin.</span> : <span>Tarihe dokunarak işaretlenmemişleri toplu işaretleyin.</span>}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-center text-muted">{grid.students.length ? "Bu süzgeçle eşleşen öğrenci yok." : "Henüz kayıtlı öğrenci yok."}</p>
      ) : (
        <div ref={scroller} className="max-h-[calc(100dvh-13rem)] overflow-auto rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgb(28_23_21/0.04)] [overscroll-behavior-x:contain]">
          <table className="border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-20">
              <tr>
                <th rowSpan={2} data-sticky-head className="sticky left-0 z-30 min-w-36 border-b border-r border-line bg-stone-50 px-3 py-2 text-left text-xs font-semibold text-muted sm:min-w-56">
                  Öğrenci · {rows.filter((r) => !r.away).length}
                </th>
                {showInfo ? (
                  <th colSpan={perms.billing ? 3 : 1} className="border-b border-r border-line bg-stone-50 px-3 py-1 text-left text-xs font-semibold text-muted">
                    Bilgiler
                  </th>
                ) : null}
                <th rowSpan={2} className="border-b border-r border-line bg-stone-50 px-2 py-2 text-center text-xs font-semibold text-muted">
                  Devam
                </th>
                {monthSpans.map((m) => (
                  <th key={m.month} colSpan={m.span} className="border-b border-r border-line bg-stone-50 px-2 py-1 text-left text-xs font-semibold text-ink">
                    {MONTHS[Number(m.month.slice(5, 7)) - 1]}
                  </th>
                ))}
              </tr>
              <tr>
                {showInfo ? (
                  <>
                    <th className="border-b border-r border-line bg-stone-50 px-3 py-1.5 text-left text-xs font-semibold text-muted">İrtibat</th>
                    {perms.billing ? (
                      <>
                        <th className="border-b border-r border-line bg-stone-50 px-3 py-1.5 text-left text-xs font-semibold text-muted">Forma</th>
                        <th className="border-b border-r border-line bg-stone-50 px-3 py-1.5 text-left text-xs font-semibold text-muted">Aidat</th>
                      </>
                    ) : null}
                  </>
                ) : null}
                {days.map((d) => (
                  <DayHead key={d.key} day={d} groupId={groupId} today={today} busy={busy} onFill={fill} />
                ))}
              </tr>
            </thead>
            <tbody>
              {sections.map((sec) => (
                <Section key={sec.id} name={sec.name} rows={sec.rows} days={days} marks={marks} today={today} showInfo={showInfo} perms={perms} onMark={mark} />
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 z-20">
              <tr>
                <td className="sticky left-0 z-30 border-t border-r border-line bg-stone-50 px-3 py-1.5 text-xs font-semibold text-muted">Gelen</td>
                {showInfo ? <td colSpan={perms.billing ? 3 : 1} className="border-t border-r border-line bg-stone-50" /> : null}
                <td className="border-t border-r border-line bg-stone-50" />
                {days.map((d) => {
                  let n = 0;
                  for (const r of rows) {
                    const c = r.cells[d.key];
                    if (typeof c === "number" && marks[r.id]?.[c] === "present") n++;
                  }
                  return (
                    <td key={d.key} className="border-t border-r border-line bg-stone-50 px-1 py-1.5 text-center text-xs font-semibold tabular-nums text-ink">
                      {d.date <= today ? n : ""}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="text-sm text-muted">Yoklama defteri {dayLabel(ATTENDANCE_START)} tarihinden başlar.</p>
      {perms.extend && (!earliest || earliest > ATTENDANCE_START) ? <ExtendStart first={earliest} /> : null}
    </div>
  );
}

function Legend({ status }: { status: AttendanceStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-flex h-5 w-5 items-center justify-center rounded border text-xs font-bold ${MARK[status].cls}`}>{MARK[status].sign}</span>
      {MARK[status].label}
    </span>
  );
}

function DayHead({ day, groupId, today, busy, onFill }: { day: GridDay; groupId: number | null; today: string; busy: boolean; onFill: (d: GridDay, s: "present" | "absent") => void }) {
  const s = groupId !== null ? day.sessions[groupId] : undefined;
  const all = Object.values(day.sessions);
  const cancelled = groupId !== null ? s?.status === "cancelled" : all.length > 0 && all.every((x) => x.status === "cancelled");
  const future = day.date > today;
  const label = (
    <span className="flex flex-col items-center leading-tight">
      <span className="text-[11px] font-medium">{weekdayShort(day.date)}</span>
      <span className="text-[13px] font-bold tabular-nums">{Number(day.date.slice(8, 10))}</span>
      {cancelled ? <span className="text-[10px] font-semibold uppercase text-red-700">İptal</span> : s && day.key.includes("#") ? <span className="text-[10px] tabular-nums">{s.startTime}</span> : null}
    </span>
  );
  const cls = ["border-b border-r border-line px-0.5 py-1 text-center", day.date === today ? "bg-gs-yellow-soft text-ink" : future ? "bg-stone-50 text-stone-400" : "bg-stone-50 text-ink"].join(" ");
  const canFill = !future && s?.id && s.status === "scheduled";
  return (
    <th data-day={day.key} scope="col" className={cls} title={s?.reason ? `İptal: ${s.reason}` : `${dayLabel(day.date)}${s ? ` · ${s.startTime}` : ""}`}>
      {canFill ? (
        <Menu
          label={`${dayLabel(day.date, false)} için işlemler`}
          align="start"
          items={[
            { label: "İşaretlenmemişler geldi", onSelect: () => onFill(day, "present"), disabled: busy },
            { label: "İşaretlenmemişler gelmedi", onSelect: () => onFill(day, "absent"), disabled: busy },
            { divider: true },
            { label: "Antrenman sayfası", href: `/admin/yoklama?seans=${s!.id}`, hint: "Günlük, iptal" },
          ]}
          trigger={(p) => (
            <button type="button" {...p} className="mx-auto flex min-h-11 w-11 cursor-pointer items-center justify-center rounded-lg hover:bg-stone-200/70">
              {label}
            </button>
          )}
        />
      ) : (
        <span className="mx-auto flex min-h-11 w-11 items-center justify-center">{label}</span>
      )}
    </th>
  );
}

function Section({
  name,
  rows,
  days,
  marks,
  today,
  showInfo,
  perms,
  onMark,
}: {
  name: string | null;
  rows: GridStudent[];
  days: GridDay[];
  marks: Marks;
  today: string;
  showInfo: boolean;
  perms: Perms;
  onMark: (s: GridStudent, sessionId: number) => void;
}) {
  return (
    <>
      {name ? (
        <tr>
          <th scope="rowgroup" className="sticky left-0 z-10 border-b border-r border-line bg-surface px-3 py-1.5 text-left text-[13px] font-bold text-ink">
            {name} <span className="font-normal text-muted">· {rows.filter((r) => !r.away).length}</span>
          </th>
          <td colSpan={days.length + (showInfo ? (perms.billing ? 3 : 1) : 0) + 1} className="border-b border-line bg-surface" />
        </tr>
      ) : null}
      {rows.map((r) => (
        <Row key={r.key} r={r} days={days} own={marks[r.id]} today={today} showInfo={showInfo} perms={perms} onMark={onMark} />
      ))}
    </>
  );
}

const Row = memo(function Row({
  r,
  days,
  own,
  today,
  showInfo,
  perms,
  onMark,
}: {
  r: GridStudent;
  days: GridDay[];
  own: Record<number, AttendanceStatus> | undefined;
  today: string;
  showInfo: boolean;
  perms: Perms;
  onMark: (s: GridStudent, sessionId: number) => void;
}) {
  let present = 0;
  let counted = 0;
  for (const c of Object.values(r.cells)) {
    if (typeof c !== "number") continue;
    const m = own?.[c];
    if (m === "present") present++;
    if (m === "present" || m === "absent") counted++;
  }
  const href = `/admin/kayit/${r.id}`;
  const nameBlock = (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar name={r.name} photoId={r.photoFileId} className="max-sm:hidden" />
      <span className="min-w-0">
        <span className="block truncate font-semibold text-ink group-hover:text-gs-red">{r.name}</span>
        <span className="flex items-center gap-1 truncate text-xs text-muted">
          {[r.studentNo ? `No ${r.studentNo}` : null, r.birthYear ? `${r.birthYear}` : null].filter(Boolean).join(" · ")}
          {r.isGoalkeeper ? <KeeperBadge className="ml-0.5" /> : null}
        </span>
        {r.away ? <span className="block truncate text-xs font-semibold text-amber-800">{r.away.kind === "left" ? "Okuldan ayrıldı" : `Şimdi: ${r.away.groupName ?? "başka grup"}`}</span> : null}
      </span>
    </span>
  );
  return (
    <tr className={r.away ? "opacity-70" : undefined}>
      <th scope="row" className="sticky left-0 z-10 max-w-40 border-b border-r border-line bg-white px-2 py-1.5 text-left font-normal sm:max-w-56 sm:px-3">
        {perms.profile ? (
          <Link href={href} className="group -mx-1 block rounded-lg px-1 py-0.5 hover:bg-surface">
            {nameBlock}
          </Link>
        ) : (
          nameBlock
        )}
      </th>
      {showInfo ? (
        <>
          <td className="min-w-40 border-b border-r border-line px-3 py-1.5 align-middle">
            {r.phone || r.contactName ? (
              perms.profile ? (
                <Link href={href} className="block rounded-lg px-1 py-0.5 hover:bg-surface">
                  <span className="block truncate text-ink">{r.contactName ?? "—"}</span>
                  <span className="block text-xs tabular-nums text-muted">{r.phone ? formatPhone(r.phone) : ""}</span>
                </Link>
              ) : (
                <>
                  <span className="block truncate text-ink">{r.contactName ?? "—"}</span>
                  <span className="block text-xs tabular-nums text-muted">{r.phone ? formatPhone(r.phone) : ""}</span>
                </>
              )
            ) : (
              <span className="text-muted">—</span>
            )}
          </td>
          {perms.billing ? (
            <>
              <td className="min-w-32 border-b border-r border-line px-3 py-1.5 align-middle">
                {r.kit ? (
                  <>
                    <span className="block font-semibold text-ink">{r.kit.size ? shirtLabel(r.kit.size) : r.kit.state === "none" ? "—" : "Beden yok"}</span>
                    <span className={["mt-0.5 inline-flex rounded px-1 text-xs font-semibold", r.kit.state === "ok" || r.kit.state === "owned" ? "bg-emerald-50 text-emerald-800" : r.kit.state === "order" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700"].join(" ")}>
                      {r.kit.state === "none" ? "Forma kaydı yok" : r.kit.label}
                    </span>
                  </>
                ) : null}
              </td>
              <td className="min-w-48 border-b border-r border-line px-3 py-1.5 align-middle">
                {r.billing ? (
                  <>
                    <span className={`inline-flex rounded px-1 text-xs font-semibold ${PAY_STATUS[r.billing.status].badge}`}>{r.billing.label}</span>
                    {r.billing.sessionsLeft !== null && r.billing.paidUntil ? (
                      <span className="ml-1 text-xs text-muted">
                        {r.billing.sessionsLeft} hak · {dayLabel(r.billing.paidUntil, false)}
                      </span>
                    ) : null}
                    <span className="block text-xs text-muted">
                      {r.billing.lastPayment ? `Son ödeme ${dayLabel(r.billing.lastPayment.paidOn, false)} · ${PAYMENT_METHOD_LABELS[r.billing.lastPayment.method] ?? r.billing.lastPayment.method} · ${formatMoney(r.billing.lastPayment.amountKurus)}` : "Ödeme yok"}
                    </span>
                  </>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
            </>
          ) : null}
        </>
      ) : null}
      <td className="border-b border-r border-line px-2 py-1.5 text-center text-xs tabular-nums text-ink">
        {counted ? (
          <>
            <span className="font-semibold">
              {present}/{counted}
            </span>
            <span className="block text-muted">%{Math.round((present / counted) * 100)}</span>
          </>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      {days.map((d) => {
        const c = r.cells[d.key];
        const base = "border-b border-r border-line p-0.5 text-center";
        if (c === undefined) return <td key={d.key} className={`${base} bg-stone-100/70`} aria-label="Antrenman yok" />;
        if (c === "cancelled")
          return (
            <td key={d.key} className={`${base} bg-[repeating-linear-gradient(135deg,transparent_0_5px,rgb(0_0_0/0.06)_5px_7px)] text-xs text-muted`} title="Antrenman iptal">
              –
            </td>
          );
        if (c === "planned" || d.date > today)
          return (
            <td key={d.key} className={`${base} bg-stone-50`}>
              <span className="mx-auto block h-1.5 w-1.5 rounded-full bg-stone-300" aria-hidden="true" />
            </td>
          );
        const m = own?.[c];
        return (
          <td key={d.key} className={`${base} ${d.date === today ? "bg-gs-yellow-soft/50" : ""}`}>
            <button
              type="button"
              onClick={() => onMark(r, c)}
              aria-label={`${r.name}, ${dayLabel(d.date, false)}: ${m ? MARK[m].label : "işaretsiz"}`}
              className={[
                "mx-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border-2 text-base font-bold transition-[transform,background-color] duration-100 active:scale-[0.94] pointer-coarse:h-11 pointer-coarse:w-11",
                m ? MARK[m].cls : "border-line bg-white text-transparent hover:border-stone-400",
              ].join(" ")}
            >
              {m ? MARK[m].sign : "·"}
            </button>
          </td>
        );
      })}
    </tr>
  );
});

function ExtendStart({ first }: { first: string | null }) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState("");
  const [busy, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <div className="rounded-2xl border border-line bg-white p-4 text-sm">
      <p className="text-muted">
        Tablo sistemdeki ilk antrenmandan başlıyor{first ? ` (${dayLabel(first)})` : ""}.{" "}
        {!open ? (
          <button type="button" onClick={() => setOpen(true)} className="cursor-pointer font-semibold text-gs-red hover:underline">
            Kağıtta daha önceki antrenmanlar var
          </button>
        ) : null}
      </p>
      {open ? (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-ink">İlk antrenman günü</span>
            <input type="date" value={day} min={ATTENDANCE_START} max={first ?? undefined} onChange={(e) => setDay(e.target.value)} className="h-11 rounded-xl border border-control bg-white px-3 text-[16px] shadow-xs" />
          </label>
          <Button
            type="button"
            size="md"
            disabled={!day || day < ATTENDANCE_START || busy}
            onClick={() =>
              startTransition(async () => {
                const res = await extendGridStartAction(day);
                if (!res.ok) return toast({ kind: "error", text: res.error });
                toast({ text: "Önceki antrenmanlar programdan eklendi." });
                setOpen(false);
                router.refresh();
              })
            }
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Antrenmanları ekle
          </Button>
          <p className="basis-full text-xs text-muted">O günden itibaren grupların haftalık programına göre antrenmanlar eklenir. Kağıtta yapılmamış görünen günü boş bırakın.</p>
        </div>
      ) : null}
    </div>
  );
}
