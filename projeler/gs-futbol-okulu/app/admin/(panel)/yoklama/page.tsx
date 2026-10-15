import { DateRangeFilter } from "@/components/DateRangeFilter";
import { ATTENDANCE_START, resolveDateRange, withDateRange, type DateRange } from "@/lib/date-range";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { can, requireAdmin } from "@/lib/auth/server";
import { sessionCounts, sessionRoster } from "@/lib/attendance";
import { todayKey } from "@/lib/billing";
import { dayLabel } from "@/lib/billing-shared";
import { ensureSessionsWindow, getSession, listSessions } from "@/lib/program";
import { groupScope, inScope } from "@/lib/scan";
import { AttendanceSheet } from "@/components/staff/AttendanceSheet";
import { listDrills, sessionDrillIds } from "@/lib/development";
import { DayNav } from "@/components/staff/DayNav";
import { ScanPanel } from "@/components/staff/ScanPanel";
import { SessionList } from "@/components/staff/SessionList";
import { SessionStatusBox } from "./SessionStatusBox";
import { AttendanceGrid } from "./AttendanceGrid";
import { earliestSessionDate, loadAttendanceGrid } from "@/lib/attendance-grid";
import { getSetting } from "@/lib/settings";
import { Page, PageHeader } from "@/components/admin/kit";
import { BackLink, RememberList } from "@/components/admin/BackLink";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Yoklama" };

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function AttendancePage({ searchParams }: { searchParams: Search }) {
  const user = await requireAdmin("yoklama.al");
  ensureSessionsWindow();
  const params = await searchParams;
  const today = todayKey();
  const selected = resolveDateRange(params, today);
  const range = { from: selected.from < ATTENDANCE_START ? ATTENDANCE_START : selected.from, to: selected.to < ATTENDANCE_START ? ATTENDANCE_START : selected.to };
  const scope = groupScope(user);
  const cardScan = getSetting("cardAttendance");
  const sessionId = Number(params.seans);
  if (params.seans !== undefined) {
    const s = Number.isInteger(sessionId) && sessionId > 0 ? getSession(sessionId) : null;
    if (!s || !inScope(scope, s.groupId)) notFound();
    const { rows } = sessionRoster(s.id);
    return (
      <main className="panel-rise mx-auto w-full max-w-3xl px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">
        <BackLink path="/admin/yoklama" label="Yoklama" />
        <h1 className="mt-2 text-2xl font-bold text-ink">{s.groupName}</h1>
        <p className="mt-1 max-w-2xl text-[15px] text-muted">
          {dayLabel(s.date)} · {s.startTime}–{s.endTime}
          {s.venueName ? ` · ${s.venueName}` : ""}
          {s.status === "cancelled" ? " · İPTAL" : ""}
        </p>
        <div className="mt-5">
          {can(user, "program.yonet") && s.date <= today ? (
            <SessionStatusBox
              session={{ id: s.id, groupName: s.groupName, date: s.date, startTime: s.startTime, status: s.status, cancelReason: s.cancelReason }}
              today={today}
              marked={rows.filter((r) => r.status).length}
            />
          ) : null}
          <AttendanceSheet
            session={{ id: s.id, groupName: s.groupName, date: s.date, startTime: s.startTime, endTime: s.endTime, venueName: s.venueName, logText: s.logText, editable: s.status === "scheduled" && s.date <= today }}
            initialRows={rows}
            canLog={can(user, "gelisim.gir")}
            cardScan={cardScan}
            drills={listDrills().map(({ id, name, category }) => ({ id, name, category }))}
            initialDrills={sessionDrillIds(s.id)}
          />
        </div>
      </main>
    );
  }
  // Varsayılan: kağıttaki gibi tablo. "Gün gün": günün antrenmanları listesi (eski görünüm).
  if (params.gorunum !== "gun") {
    const grid = loadAttendanceGrid({ scope, today, range, perms: { billing: can(user, "aidat.gor"), contact: can(user, "kayit.gor") } });
    return (
      <Page width="wide">
        <PageHeader
          title="Yoklama"
          description="Öğrenciler satırda, antrenman günleri sütunda. Kağıtta alınan geçmiş yoklamaları da buradan girin."
          actions={
            <Link href={withDateRange("/admin/gruplar/cikti", range)} className="inline-flex min-h-10 items-center rounded-xl border border-control bg-white px-3.5 text-[15px] font-semibold text-ink shadow-xs transition hover:bg-gray-50 pointer-coarse:min-h-11">
              Kağıt yoklama PDF
            </Link>
          }
        >
          <ViewTabs active="tablo" range={range} />
        </PageHeader>
        <DateRangeFilter range={range} today={today} min={ATTENDANCE_START} />
        <AttendanceGrid key={`${range.from}:${range.to}`} grid={grid} perms={{ profile: can(user, "kayit.gor"), billing: can(user, "aidat.gor"), extend: can(user, "program.yonet") }} earliest={earliestSessionDate()} />
      </Page>
    );
  }
  const day = typeof params.gun === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.gun) ? params.gun : today;
  const sessions = listSessions({ from: day, to: day, groupIds: scope, includeCancelled: true });
  return (
    <main className="panel-rise mx-auto w-full max-w-3xl px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <h1 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-ink sm:text-[26px]">Yoklama</h1>
      <p className="mt-1 max-w-2xl text-[15px] text-muted">Günün antrenmanını seçip listeden işaretleyin.{cardScan ? " Kart da okutabilirsiniz." : ""}</p>
      <ViewTabs active="gun" range={range} />
      <RememberList />
      <p className="mt-2 text-[15px]">
        <Link href={withDateRange("/admin/gruplar/cikti", range)} className="font-semibold text-gs-red hover:underline">
          Kağıda yoklama için: yoklama kağıdını PDF olarak al
        </Link>
      </p>
      <div className="mt-5 grid gap-5">
        {cardScan && day === today ? <ScanPanel /> : null}
        <DayNav day={day} today={today} base="/admin/yoklama?gorunum=gun" />
        <SessionList sessions={sessions} counts={sessionCounts(sessions.map((s) => s.id))} hrefFor={(s) => `/admin/yoklama?seans=${s.id}`} />
      </div>
    </main>
  );
}

function ViewTabs({ active, range }: { active: "tablo" | "gun"; range: DateRange }) {
  const cls = (on: boolean) => ["flex min-h-9 items-center rounded-lg px-3 text-sm font-semibold transition pointer-coarse:min-h-10", on ? "bg-ink text-white" : "text-muted hover:bg-stone-200/60 hover:text-ink"].join(" ");
  return (
    <nav aria-label="Görünüm" className="mt-3 flex gap-1">
      <Link href={withDateRange("/admin/yoklama", range)} aria-current={active === "tablo" ? "page" : undefined} className={cls(active === "tablo")}>
        Tablo
      </Link>
      <Link href={withDateRange("/admin/yoklama?gorunum=gun", range)} aria-current={active === "gun" ? "page" : undefined} className={cls(active === "gun")}>
        Gün gün
      </Link>
    </nav>
  );
}
