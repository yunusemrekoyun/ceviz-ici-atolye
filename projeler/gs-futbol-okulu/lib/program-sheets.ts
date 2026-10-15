import ExcelJS from "exceljs";
import { and, eq, inArray } from "drizzle-orm";
import { formatYearRange } from "@/lib/age-groups";
import { listAgeGroups } from "@/lib/age-groups-db";
import { todayKey } from "@/lib/billing";
import { getDb } from "@/lib/db";
import { attendance, registrations } from "@/lib/db/schema";
import { directionLinks } from "@/lib/maps";
import { ensureSessions, listGroupCoaches, listSchedules, listSessions, listVenues } from "@/lib/program";
import { dateRangeLabel, type DateRange } from "@/lib/date-range";
import { BRAND_NAME } from "@/lib/constants";
import { dayLabel } from "@/lib/billing-shared";

/**
 * Çıktılar: haftalık antrenman programı (yazdır / Excel / WhatsApp) ve grup yoklama kağıdı (yazdır / Excel).
 * Yoklama kağıdı yalnız bugün ve sonrası için seans üretir; geçmiş tarihlerde mevcut seanslar kullanılır
 * (antrenman hakları seanslardan sayıldığından geçmişe seans eklenmez).
 */

export const WEEKDAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
export const WEEKDAYS_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export type ProgramSlot = { weekday: number; day: string; startTime: string; endTime: string; venue: string | null; validFrom: string | null; validTo: string | null };
export type ProgramRow = { groupId: number; group: string; years: string; slots: ProgramSlot[]; coaches: string[]; students: number };
export type ProgramVenue = { id: number; name: string; address: string | null; note: string | null; mapUrl: string };

/** Bugün geçerli ya da ileride başlayacak haftalık program; biten dönemsel satırlar gösterilmez. */
export function weeklyProgram(today: string = todayKey()): { rows: ProgramRow[]; venues: ProgramVenue[] } {
  const venues = new Map(listVenues(true).map((v) => [v.id, v]));
  const coaches = listGroupCoaches();
  const counts = new Map<number, number>();
  for (const r of getDb().select({ groupId: registrations.groupId }).from(registrations).where(eq(registrations.status, "enrolled")).all())
    if (r.groupId !== null) counts.set(r.groupId, (counts.get(r.groupId) ?? 0) + 1);
  const schedules = listSchedules().filter((s) => !s.validTo || s.validTo >= today);
  const usedVenues = new Set<number>();
  const rows = listAgeGroups().map((g) => {
    const slots = schedules
      .filter((s) => s.groupId === g.id)
      .map((s) => {
        if (s.venueId) usedVenues.add(s.venueId);
        return { weekday: s.weekday, day: WEEKDAYS[s.weekday - 1]!, startTime: s.startTime, endTime: s.endTime, venue: s.venueId ? (venues.get(s.venueId)?.name ?? null) : null, validFrom: s.validFrom, validTo: s.validTo };
      })
      .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
    return { groupId: g.id, group: g.name, years: formatYearRange(g), slots, coaches: coaches.filter((c) => c.groupId === g.id).map((c) => c.name), students: counts.get(g.id) ?? 0 };
  });
  return {
    rows,
    venues: [...usedVenues].map((id) => venues.get(id)!).filter(Boolean).map((v) => ({ id: v.id, name: v.name, address: v.address, note: v.note, mapUrl: directionLinks(v)[0]!.href })),
  };
}

export type SheetMark = "present" | "absent" | "excused";
export type AttendanceSheet = {
  groupId: number;
  group: string;
  years: string;
  coaches: string[];
  /** "Çarşamba 12:00 · Cuma 17:00" */
  slots: string;
  sessions: { id: number; date: string; startTime: string }[];
  students: { id: number; no: number | null; name: string; keeper: boolean; marks: Record<number, SheetMark> }[];
};

/** Seçilen aralığın yoklama kağıtları. `withMarks`: alınmış yoklamalar kağıda yazılır. */
export function attendanceSheets(range: DateRange, groupIds: number[] | null, withMarks: boolean, today: string = todayKey()): AttendanceSheet[] {
  const { from, to } = range;
  if (to >= today) ensureSessions(from > today ? from : today, to);
  const groups = listAgeGroups().filter((g) => !groupIds || groupIds.includes(g.id));
  if (groups.length === 0) return [];
  const ids = groups.map((g) => g.id);
  const sessions = listSessions({ from, to, groupIds: ids });
  const program = weeklyProgram(today).rows;
  const db = getDb();
  const students = db
    .select({ id: registrations.id, no: registrations.studentNo, name: registrations.studentFullName, groupId: registrations.groupId, keeper: registrations.isGoalkeeper })
    .from(registrations)
    .where(and(eq(registrations.status, "enrolled"), inArray(registrations.groupId, ids)))
    .all();
  const sessionIds = sessions.map((s) => s.id);
  const marks =
    withMarks && sessionIds.length
      ? db
          .select({ sessionId: attendance.sessionId, reg: attendance.registrationId, status: attendance.status })
          .from(attendance)
          .where(inArray(attendance.sessionId, sessionIds))
          .all()
      : [];
  return groups.map((g) => {
    const own = sessions.filter((s) => s.groupId === g.id).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    const p = program.find((r) => r.groupId === g.id);
    return {
      groupId: g.id,
      group: g.name,
      years: formatYearRange(g),
      coaches: p?.coaches ?? [],
      slots: p?.slots.map((s) => `${s.day} ${s.startTime}`).join(" · ") ?? "",
      sessions: own.map((s) => ({ id: s.id, date: s.date, startTime: s.startTime })),
      students: students
        .filter((s) => s.groupId === g.id)
        .sort((a, b) => a.name.localeCompare(b.name, "tr"))
        .map((s) => {
          const m: Record<number, SheetMark> = {};
          for (const x of marks) if (x.reg === s.id && own.some((o) => o.id === x.sessionId)) m[x.sessionId] = x.status as SheetMark;
          return { id: s.id, no: s.no, name: s.name, keeper: s.keeper, marks: m };
        }),
    };
  });
}

/** Kağıtta işaret: geldi +, gelmedi –, izinli İ (PDF yazı tipinde ✓ / ✗ yok). */
export const MARK_SYMBOL: Record<SheetMark, string> = { present: "+", absent: "–", excused: "İ" };
export const MARK_LEGEND = "+ geldi   – gelmedi   İ izinli   K kaleci";

/** Seans sütun başlığı: "02.10 Çar". */
export function sessionHeader(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return `${date.slice(8, 10)}.${date.slice(5, 7)} ${WEEKDAYS_SHORT[(d.getUTCDay() + 6) % 7]}`;
}

const HEADER_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFA90432" } };
const THIN = { style: "thin" as const, color: { argb: "FF9CA3AF" } };
const BOX = { top: THIN, left: THIN, bottom: THIN, right: THIN };

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = HEADER_FILL;
  row.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
}

export async function programXlsx(today: string = todayKey()): Promise<Buffer> {
  const { rows, venues } = weeklyProgram(today);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Antrenman programı", { pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  ws.addRow([`${BRAND_NAME} · Haftalık antrenman programı (${dayLabel(today)})`]).font = { bold: true, size: 13 };
  ws.addRow([]);
  const head = ws.addRow(["Grup", "Doğum yılı", "Günler ve saatler", "Saha", "Antrenör", "Öğrenci"]);
  styleHeader(head);
  for (const r of rows) {
    const row = ws.addRow([
      r.group,
      r.years,
      r.slots.length ? r.slots.map((s) => `${s.day} ${s.startTime}–${s.endTime}${s.validFrom && s.validFrom > today ? ` (${dayLabel(s.validFrom, false)}'den)` : ""}`).join("\n") : "Program girilmedi",
      [...new Set(r.slots.map((s) => s.venue ?? "Saha seçilmedi"))].join("\n"),
      r.coaches.join(", "),
      r.students,
    ]);
    row.alignment = { vertical: "top", wrapText: true };
    row.eachCell((c) => (c.border = BOX));
  }
  ws.columns = [{ width: 12 }, { width: 12 }, { width: 34 }, { width: 26 }, { width: 22 }, { width: 9 }];
  if (venues.length) {
    ws.addRow([]);
    ws.addRow(["Sahalar"]).font = { bold: true };
    for (const v of venues) ws.addRow([v.name, [v.address, v.note].filter(Boolean).join(" · "), v.mapUrl]);
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function attendanceSheetsXlsx(range: DateRange, groupIds: number[] | null, withMarks: boolean): Promise<Buffer> {
  const sheets = attendanceSheets(range, groupIds, withMarks);
  const wb = new ExcelJS.Workbook();
  for (const sh of sheets) {
    const ws = wb.addWorksheet(sh.group.slice(0, 31), { pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } } });
    ws.addRow([`${sh.group} (${sh.years}) · Yoklama · ${dateRangeLabel(range)}`]).font = { bold: true, size: 13 };
    ws.addRow([[sh.slots, sh.coaches.length ? `Antrenör: ${sh.coaches.join(", ")}` : null].filter(Boolean).join(" · ")]);
    ws.addRow([]);
    const head = ws.addRow(["#", "No", "Ad Soyad", "K", ...sh.sessions.map((s) => sessionHeader(s.date)), "Geldi"]);
    styleHeader(head);
    head.height = 30;
    const blanks = 3;
    const all = [...sh.students.map((s) => ({ ...s, blank: false })), ...Array.from({ length: blanks }, (_, i) => ({ id: -i, no: null, name: "", keeper: false, marks: {} as Record<number, SheetMark>, blank: true }))];
    all.forEach((s, i) => {
      const present = sh.sessions.filter((x) => s.marks[x.id] === "present").length;
      const counted = withMarks && !s.blank && sh.sessions.some((x) => x.date <= todayKey());
      const row = ws.addRow([i + 1, s.no ?? "", s.name, s.keeper ? "K" : "", ...sh.sessions.map((x) => (s.marks[x.id] ? MARK_SYMBOL[s.marks[x.id]!] : "")), counted ? present : ""]);
      row.height = 20;
      row.eachCell({ includeEmpty: true }, (c, col) => {
        c.border = BOX;
        if (col !== 3) c.alignment = { horizontal: "center", vertical: "middle" };
        else c.alignment = { vertical: "middle" };
      });
    });
    ws.columns = [{ width: 4 }, { width: 7 }, { width: 26 }, { width: 3 }, ...sh.sessions.map(() => ({ width: 7 })), { width: 7 }];
    ws.addRow([]);
    ws.addRow(["", "", MARK_LEGEND]);
    ws.addRow(["", "", "Antrenör imzası:"]);
  }
  if (sheets.length === 0) wb.addWorksheet("Yoklama").addRow(["Seçilen grupta öğrenci ya da antrenman yok."]);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
