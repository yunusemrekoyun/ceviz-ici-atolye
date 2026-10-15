"use client";

import { DateRangeFilter } from "@/components/DateRangeFilter";
import { withDateRange, type DateRange } from "@/lib/date-range";
import Link from "next/link";
import { CalendarRange, ChevronRight, ClipboardList, FileDown, FileSpreadsheet, MessageCircle, Printer } from "lucide-react";
import { EmptyState, Page, PageHeader, Panel } from "@/components/admin/kit";
import { SectionTabs } from "@/components/admin/SectionTabs";
import type { AgeGroupView } from "@/lib/age-groups";
import { dayLabel } from "@/lib/billing-shared";
import { addDaysTo } from "@/lib/dates";
import type { GroupCard, SessionCard } from "@/lib/groups-overview";
import { programMessage, trainingReminderMessage, whatsappShareLink } from "@/lib/whatsapp";
import { GroupsManager } from "./GroupsManager";

export type HubView = "groups" | "calendar" | "edit";

const WEEKDAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
/** Takvimde her grubun kendi rengi (sırayla). */
const TINTS = [
  "bg-red-50 ring-red-200 text-red-950",
  "bg-amber-50 ring-amber-200 text-amber-950",
  "bg-emerald-50 ring-emerald-200 text-emerald-950",
  "bg-sky-50 ring-sky-200 text-sky-950",
  "bg-violet-50 ring-violet-200 text-violet-950",
  "bg-stone-100 ring-stone-300 text-stone-900",
];
const weekdayOf = (day: string) => (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7;
const btnBase = "inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold shadow-xs transition active:scale-[0.97] pointer-coarse:min-h-11";
const btn = `${btnBase} border-control bg-white text-ink hover:bg-gray-50`;
const btnPrimary = `${btnBase} border-gs-red bg-gs-red text-white hover:bg-gs-red-dark`;

type Props = {
  today: string;
  range: DateRange;
  view: HubView;
  overview: { groups: GroupCard[]; todaySessions: SessionCard[]; tomorrowSessions: SessionCard[] };
  billing: boolean;
  canAttendance: boolean;
  canLists: boolean;
  manager: {
    groups: AgeGroupView[];
    stats: Record<number, { students: number; keepers: number; candidates: number }>;
    schedule: Record<number, string>;
    uncovered: { year: number; count: number }[];
  };
};

export function GroupsHub({ today, range, view, overview, billing, canAttendance, canLists, manager }: Props) {
  const { groups } = overview;
  const tomorrow = addDaysTo(today, 1);
  const programText = programMessage(
    groups.map((g) => ({ group: g.name, years: g.years, ages: g.ages, slots: g.slots })),
    dayLabel(today),
  );
  const tabs = [
    { href: "/admin/gruplar", label: "Gruplar" },
    { href: "/admin/gruplar?gorunum=takvim", label: "Haftalık takvim" },
    { href: "/admin/gruplar?gorunum=duzenle", label: "Grupları düzenle" },
  ].map(t => ({ ...t, href: withDateRange(t.href, range) }));
  const active = view === "calendar" ? tabs[1]!.href : view === "edit" ? tabs[2]!.href : tabs[0]!.href;

  return (
    <Page>
      <PageHeader
        title="Gruplar ve program"
        description="Hangi grup hangi yaşta, hangi gün ve saatte, nerede; kimler var. Bir gruba dokunun, listesi ve programı açılsın."
        actions={
          <>
            {canLists ? (
              <a href="/api/admin/cikti?tur=yoklama-listesi" className={btnPrimary}>
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Yoklama listeleri (Excel)
              </a>
            ) : null}
            <Link href={withDateRange("/admin/gruplar/cikti", range)} className={btn}>
              <FileDown className="h-4 w-4 text-muted" aria-hidden="true" /> Çıktı al (PDF / Excel)
            </Link>
            <a href={whatsappShareLink(programText)} target="_blank" rel="noopener noreferrer" className={btn}>
              <MessageCircle className="h-4 w-4 text-emerald-600" aria-hidden="true" /> Programı gönder
            </a>
            <Link href="/admin/program" className={btn}>
              <CalendarRange className="h-4 w-4 text-muted" aria-hidden="true" /> Programı düzenle
            </Link>
          </>
        }
      />

      {view === "groups" ? <DateRangeFilter range={range} today={today} label="Devam tarih aralığı" /> : null}
      <SectionTabs label="Görünüm" active={active} items={tabs} />

      {view === "calendar" ? (
        <WeekCalendar groups={groups} range={range} />
      ) : view === "edit" ? (
        <GroupsManager {...manager} />
      ) : (
        <>
          {/* Bugün ve yarın: sahaya hazırlık */}
          <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
            <DaySessions title={`Bugün · ${WEEKDAYS[weekdayOf(today)]} ${dayLabel(today, false)}`} day={today} when="bugün" sessions={overview.todaySessions} isToday canAttendance={canAttendance} canLists={canLists} billing={billing} />
            <DaySessions title={`Yarın · ${WEEKDAYS[weekdayOf(tomorrow)]} ${dayLabel(tomorrow, false)}`} day={tomorrow} when="yarın" sessions={overview.tomorrowSessions} canAttendance={canAttendance} canLists={canLists} billing={billing} />
          </div>
          <GroupGrid groups={groups} today={today} range={range} billing={billing} />
        </>
      )}
    </Page>
  );
}

/* ---------------- Bugün / yarın ---------------- */

function DaySessions({
  title,
  day,
  when,
  sessions,
  isToday,
  canAttendance,
  canLists,
  billing,
}: {
  title: string;
  day: string;
  when: string;
  sessions: SessionCard[];
  isToday?: boolean;
  canAttendance: boolean;
  canLists: boolean;
  billing: boolean;
}) {
  return (
    <Panel
      title={title}
      description={sessions.length ? `${sessions.length} antrenman · ${sessions.reduce((n, s) => n + s.students, 0)} öğrenci` : undefined}
      actions={
        sessions.length > 1 && (canAttendance || canLists) ? (
          <a href={`/api/admin/cikti?tur=yoklama&from=${day}&to=${day}&grup=${isToday ? "bugun" : "yarin"}`} target="_blank" rel="noopener" className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-gs-red hover:bg-gs-red-soft pointer-coarse:min-h-11">
            <Printer className="h-4 w-4" aria-hidden="true" /> Hepsinin yoklama kağıdı
          </a>
        ) : null
      }
      flush
    >
      {sessions.length === 0 ? (
        <p className="px-4 pb-4 text-[15px] text-muted sm:px-5">{isToday ? "Bugün antrenman yok." : "Yarın antrenman yok."}</p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {sessions.map((s) => (
            <li key={s.id} className="px-4 py-3 sm:px-5">
              <div className="flex items-start gap-3">
                <div className="w-16 shrink-0 rounded-xl bg-gs-red-soft py-1.5 text-center">
                  <p className="text-[17px] font-bold tabular-nums text-gs-red">{s.startTime}</p>
                  <p className="text-xs tabular-nums text-gs-red/80">{s.endTime}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <Link href={`/admin/gruplar/${s.groupId}`} className="text-[16px] font-bold text-ink hover:text-gs-red">
                      {s.group}
                    </Link>
                    <span className="text-sm text-muted">{s.ages} yaş</span>
                  </p>
                  <p className="text-sm text-muted">
                    {s.venue ?? "Saha seçilmedi"}
                    {s.coaches.length ? ` · ${s.coaches.join(", ")}` : ""}
                  </p>
                  <p className="mt-0.5 text-sm text-ink">
                    <span className="font-semibold">{s.students}</span> öğrenci
                    {s.keepers ? ` · ${s.keepers} kaleci` : ""}
                    {billing && s.late ? <span className="font-medium text-red-700"> · {s.late} kişinin aidatı gecikti</span> : null}
                  </p>
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {isToday && canAttendance ? (
                  <Link href={`/admin/yoklama?seans=${s.id}`} className={btnPrimary}>
                    <ClipboardList className="h-4 w-4" aria-hidden="true" /> Yoklama al
                  </Link>
                ) : null}
                {canAttendance || canLists ? (
                  <a href={`/api/admin/cikti?tur=yoklama&from=${day}&to=${day}&grup=${s.groupId}`} target="_blank" rel="noopener" className={btn}>
                    <Printer className="h-4 w-4 text-muted" aria-hidden="true" /> Yoklama kağıdı
                  </a>
                ) : null}
                {canLists ? (
                  <a href={`/api/admin/cikti?tur=liste&liste=antrenor&grup=${s.groupId}`} target="_blank" rel="noopener" className={btn}>
                    <FileDown className="h-4 w-4 text-muted" aria-hidden="true" /> Liste
                  </a>
                ) : null}
                <a
                  href={whatsappShareLink(trainingReminderMessage({ group: s.group, when: `${when} (${WEEKDAYS[weekdayOf(s.date)]})`, time: `${s.startTime}–${s.endTime}`, venue: s.venue, mapUrl: s.mapUrl }))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={btn}
                >
                  <MessageCircle className="h-4 w-4 text-emerald-600" aria-hidden="true" /> Velilere hatırlat
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---------------- Grup kartları ---------------- */

function nextText(next: GroupCard["next"], today: string): string | null {
  if (!next) return null;
  const when = next.date === today ? "Bugün" : next.date === addDaysTo(today, 1) ? "Yarın" : `${dayLabel(next.date, false)} ${WEEKDAYS[weekdayOf(next.date)]}`;
  return `${when} ${next.startTime}`;
}

function GroupGrid({ groups, today, billing, range }: { groups: GroupCard[]; today: string; billing: boolean; range: DateRange }) {
  if (groups.length === 0)
    return (
      <Panel>
        <EmptyState title="Henüz grup yok">“Grupları düzenle” sekmesinden doğum yılı aralığıyla grup ekleyin.</EmptyState>
      </Panel>
    );
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {groups.map((g) => {
        const next = nextText(g.next, today);
        return (
          <li key={g.id}>
            <Link href={withDateRange(`/admin/gruplar/${g.id}`, range)} className="group block h-full rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgb(28_23_21/0.04)] transition hover:border-stone-300 hover:shadow-md active:scale-[0.99] sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-bold text-ink group-hover:text-gs-red">{g.name}</p>
                  <p className="text-sm text-muted">
                    {g.years} doğumlu · <span className="font-semibold text-ink">{g.ages} yaş</span>
                  </p>
                </div>
                <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-muted" aria-hidden="true" />
              </div>

              {g.slots.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {g.slots.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-surface px-2 py-1 text-sm font-semibold text-ink">
                      {SHORT[s.weekday - 1]} <span className="font-normal tabular-nums text-muted">{s.startTime}–{s.endTime}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm font-medium text-amber-800">Antrenman günü girilmedi.</p>
              )}
              <p className="mt-2 text-sm text-muted">
                {g.venues.join(", ") || "Saha seçilmedi"} · Antrenör: {g.coaches.join(", ") || "atanmadı"}
              </p>

              <dl className="mt-3 grid grid-cols-4 gap-2 border-t border-line pt-3 text-center">
                <Mini label="Öğrenci" value={String(g.students)} />
                <Mini label="Kaleci" value={String(g.keepers)} />
                {billing && g.unpaid !== null ? <Mini label="Aidat bekl." value={String(g.unpaid)} tone={g.late ? "bad" : g.unpaid ? "warn" : undefined} /> : <Mini label="Aday" value={String(g.candidates)} />}
                <Mini label="Devam" value={g.attendanceRate !== null ? `%${g.attendanceRate}` : "—"} tone={g.attendanceRate !== null && g.attendanceRate < 60 ? "bad" : undefined} />
              </dl>
              {next ? <p className="mt-3 text-sm text-ink">Sıradaki antrenman: <span className="font-semibold">{next}</span></p> : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "bad" | "warn" }) {
  return (
    <div className="min-w-0">
      <dd className={["text-lg font-bold tabular-nums", tone === "bad" ? "text-red-700" : tone === "warn" ? "text-amber-700" : "text-ink"].join(" ")}>{value}</dd>
      <dt className="truncate text-xs text-muted">{label}</dt>
    </div>
  );
}

/* ---------------- Haftalık takvim ---------------- */

function WeekCalendar({ groups, range }: { groups: GroupCard[]; range: DateRange }) {
  const tint = new Map(groups.map((g, i) => [g.id, TINTS[i % TINTS.length]!]));
  const days = WEEKDAYS.map((name, i) => ({
    name,
    blocks: groups
      .flatMap((g) => g.slots.filter((s) => s.weekday === i + 1).map((s) => ({ g, s })))
      .sort((a, b) => a.s.startTime.localeCompare(b.s.startTime)),
  }));
  if (days.every((d) => d.blocks.length === 0))
    return (
      <Panel>
        <EmptyState title="Program girilmedi" action={<Link href="/admin/program" className={btn}>Programı düzenle</Link>}>
          Grupların antrenman günleri ve saatleri girilince haftalık takvim burada görünür.
        </EmptyState>
      </Panel>
    );
  return (
    <>
      {/* Masaüstü: 7 sütun */}
      <div className="hidden grid-cols-7 gap-2 lg:grid">
        {days.map((d) => (
          <section key={d.name} className="min-w-0 rounded-2xl border border-line bg-white p-2">
            <h3 className="px-1 pb-2 text-center text-sm font-semibold text-ink">{d.name}</h3>
            {d.blocks.length === 0 ? <p className="py-6 text-center text-xs text-stone-400">Antrenman yok</p> : null}
            <ul className="grid gap-2">
              {d.blocks.map(({ g, s }, i) => (
                <li key={i}>
                  <Link href={withDateRange(`/admin/gruplar/${g.id}`, range)} className={`block rounded-xl px-2 py-1.5 ring-1 ring-inset transition hover:brightness-95 ${tint.get(g.id)}`}>
                    <span className="block text-xs font-semibold tabular-nums">
                      {s.startTime}–{s.endTime}
                    </span>
                    <span className="block text-sm font-bold">{g.name}</span>
                    <span className="block truncate text-xs opacity-80">
                      {g.ages} yaş · {g.students} öğr.
                    </span>
                    {s.venue ? <span className="block truncate text-xs opacity-70">{s.venue}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {/* Telefon: yalnız antrenmanı olan günler */}
      <div className="grid grid-cols-1 gap-4 lg:hidden">
        {days
          .filter((d) => d.blocks.length)
          .map((d) => (
            <section key={d.name}>
              <h3 className="mb-2 text-[15px] font-semibold text-ink">{d.name}</h3>
              <ul className="grid gap-2">
                {d.blocks.map(({ g, s }, i) => (
                  <li key={i}>
                    <Link href={withDateRange(`/admin/gruplar/${g.id}`, range)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 ring-inset ${tint.get(g.id)}`}>
                      <span className="w-24 shrink-0 text-sm font-semibold tabular-nums">
                        {s.startTime}–{s.endTime}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{g.name}</span>
                        <span className="block truncate text-sm opacity-80">
                          {g.ages} yaş · {g.students} öğrenci{s.venue ? ` · ${s.venue}` : ""}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        {days.some((d) => !d.blocks.length) ? <p className="text-sm text-muted">Antrenman olmayan günler: {days.filter((d) => !d.blocks.length).map((d) => d.name).join(", ")}.</p> : null}
      </div>
    </>
  );
}
