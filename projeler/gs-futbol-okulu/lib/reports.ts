import ExcelJS from "exceljs";
import { and, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { ageGroups, attendance, feePeriods, registrations, trainingSessions } from "@/lib/db/schema";
import { listPayments } from "@/lib/billing";
import { cashEntries } from "@/lib/cashbook";
import { cashTotals, filterCashEntries, groupByDay, type CashFilter } from "@/lib/cashbook-shared";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/billing-shared";
import { dateRangeLabel, type DateRange } from "@/lib/date-range";

/* ---------------- Tahsilat (AID-09) ---------------- */

export type CollectionReport = {
  range: DateRange;
  collected: number;
  byMethod: Record<string, { count: number; amount: number }>;
  expected: number;
  expectedPaid: number;
  expectedOpen: number;
  payments: ReturnType<typeof listPayments>;
};

/** Seçilen günlerdeki tahsilat ve bu aralıkta başlayan 8 antrenmanlık paketler. */
export function collectionReport(range: DateRange): CollectionReport {
  const { from, to } = range;
  const payments = listPayments({ from, to, limit: -1 });
  const valid = payments.filter((p) => !p.voidedAt);
  const byMethod: CollectionReport["byMethod"] = {};
  for (const p of valid) {
    const k = PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ?? p.method;
    byMethod[k] = { count: (byMethod[k]?.count ?? 0) + 1, amount: (byMethod[k]?.amount ?? 0) + p.amountKurus };
  }
  const periods = getDb().select().from(feePeriods).where(and(gte(feePeriods.startDate, from), lte(feePeriods.startDate, to))).all().filter((p) => p.status !== "void");
  const expected = periods.reduce((s, p) => s + p.amountKurus, 0);
  const expectedPaid = periods.filter((p) => p.status === "paid").reduce((s, p) => s + p.amountKurus, 0);
  return { range, collected: valid.reduce((s, p) => s + p.amountKurus, 0), byMethod, expected, expectedPaid, expectedOpen: expected - expectedPaid, payments };
}

/* ---------------- Devam (YOK-07) ---------------- */

export type AttendanceRow = { id: number; name: string; studentNo: number | null; group: string; present: number; absent: number; excused: number; rate: number | null };
export type GroupAttendance = { group: string; sessions: number; present: number; absent: number; rate: number | null };

export function attendanceReport(range: DateRange): { students: AttendanceRow[]; groups: GroupAttendance[] } {
  const { from, to } = range;
  const db = getDb();
  const groups = new Map(db.select().from(ageGroups).all().map((g) => [g.id, g.name]));
  const rows = db
    .select({ reg: attendance.registrationId, status: attendance.status, groupId: trainingSessions.groupId })
    .from(attendance)
    .innerJoin(trainingSessions, eq(attendance.sessionId, trainingSessions.id))
    .where(and(gte(trainingSessions.date, from), lte(trainingSessions.date, to)))
    .all();
  const sessions = db
    .select({ id: trainingSessions.id, groupId: trainingSessions.groupId })
    .from(trainingSessions)
    .where(and(gte(trainingSessions.date, from), lte(trainingSessions.date, to), eq(trainingSessions.status, "scheduled")))
    .all();
  const regs = db.select({ id: registrations.id, name: registrations.studentFullName, no: registrations.studentNo, groupId: registrations.groupId, status: registrations.status }).from(registrations).all();
  const students: AttendanceRow[] = regs
    .map((r) => {
      const mine = rows.filter((x) => x.reg === r.id);
      const present = mine.filter((x) => x.status === "present").length;
      const absent = mine.filter((x) => x.status === "absent").length;
      const excused = mine.filter((x) => x.status === "excused").length;
      return { id: r.id, name: r.name, studentNo: r.no, group: r.groupId ? (groups.get(r.groupId) ?? "") : "", present, absent, excused, rate: present + absent ? Math.round((present / (present + absent)) * 100) : null, active: r.status === "enrolled" };
    })
    .filter((r) => r.active || r.present + r.absent + r.excused > 0)
    .map(({ id, name, studentNo, group, present, absent, excused, rate }) => ({ id, name, studentNo, group, present, absent, excused, rate }))
    .sort((a, b) => a.group.localeCompare(b.group, "tr") || a.name.localeCompare(b.name, "tr"));
  const groupRows: GroupAttendance[] = [...groups.entries()].map(([gid, name]) => {
    const g = rows.filter((x) => x.groupId === gid);
    const present = g.filter((x) => x.status === "present").length;
    const absent = g.filter((x) => x.status === "absent").length;
    return { group: name, sessions: sessions.filter((s) => s.groupId === gid).length, present, absent, rate: present + absent ? Math.round((present / (present + absent)) * 100) : null };
  });
  return { students, groups: groupRows };
}

/* ---------------- Excel ---------------- */

function sheet(wb: ExcelJS.Workbook, name: string, columns: { header: string; key: string; width: number; money?: boolean }[], data: Record<string, unknown>[]) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width, style: c.money ? { numFmt: '#,##0.00 "₺"' } : {} }));
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFA90432" } };
  for (const d of data) ws.addRow(d);
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
}

/** Kasa defteri: seçilen aralığın ve ödeme süzgecinin özeti, günlük toplamları ve kayıtları. */
export async function collectionXlsx(range: DateRange, filter: CashFilter = {}): Promise<Buffer> {
  const r = collectionReport(range);
  const entries = filterCashEntries(cashEntries(range.from, range.to), filter);
  const book = { ...cashTotals(entries), days: groupByDay(entries) };
  const wb = new ExcelJS.Workbook();
  sheet(
    wb,
    "Özet",
    [
      { header: "Kalem", key: "k", width: 38 },
      { header: "Tutar", key: "v", width: 16, money: true },
    ],
    [
      { k: `${dateRangeLabel(range)} (${book.count} ödeme)`, v: book.total / 100 },
      { k: "  Nakit", v: book.cash / 100 },
      { k: "  Havale / EFT", v: book.eft / 100 },
      { k: "  Aidat", v: book.aidat / 100 },
      { k: "  Forma ve malzeme", v: book.forma / 100 },
      ...((!filter.kind || filter.kind === "all") && !filter.query ? [
        { k: "Aralıkta başlayan aidat paketleri (beklenen)", v: r.expected / 100 },
        { k: "  ödendi", v: r.expectedPaid / 100 },
        { k: "  ödenmedi", v: r.expectedOpen / 100 },
      ] : []),
    ],
  );
  sheet(
    wb,
    "Günlük",
    [
      { header: "Tarih", key: "d", width: 12 },
      { header: "Nakit", key: "c", width: 14, money: true },
      { header: "Havale / EFT", key: "e", width: 14, money: true },
      { header: "Aidat", key: "a", width: 14, money: true },
      { header: "Forma", key: "f", width: 14, money: true },
      { header: "Toplam", key: "t", width: 14, money: true },
      { header: "Ödeme sayısı", key: "n", width: 13 },
    ],
    [...book.days].reverse().map((d) => ({ d: d.day, c: d.cash / 100, e: d.eft / 100, a: d.aidat / 100, f: d.forma / 100, t: d.total / 100, n: d.count })),
  );
  sheet(
    wb,
    "Ödemeler",
    [
      { header: "Tarih", key: "d", width: 12 },
      { header: "Tür", key: "k", width: 8 },
      { header: "Makbuz", key: "r", width: 12 },
      { header: "Öğrenci", key: "n", width: 28 },
      { header: "Öğrenci no", key: "no", width: 11 },
      { header: "Ne", key: "w", width: 22 },
      { header: "Şekil", key: "m", width: 14 },
      { header: "Alan", key: "b", width: 18 },
      { header: "Tutar", key: "a", width: 14, money: true },
      { header: "Durum", key: "s", width: 24 },
      { header: "Not", key: "note", width: 30 },
    ],
    book.days
      .flatMap((d) => d.entries)
      .reverse()
      .map((e) => ({
        d: e.day,
        k: e.kind === "aidat" ? "Aidat" : "Forma",
        r: e.receiptNo ?? "",
        n: e.studentName,
        no: e.studentNo,
        w: e.what,
        m: PAYMENT_METHOD_LABELS[e.method] ?? e.method,
        b: e.takenBy ?? "",
        a: e.amountKurus / 100,
        s: e.voided ? `İptal: ${e.voidReason ?? ""}` : e.atEnrollment ? "Kayıtta alındı" : "Geçerli",
        note: e.note ?? "",
      })),
  );
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function attendanceXlsx(range: DateRange): Promise<Buffer> {
  const r = attendanceReport(range);
  const wb = new ExcelJS.Workbook();
  sheet(
    wb,
    "Gruplar",
    [
      { header: "Grup", key: "group", width: 20 },
      { header: "Seans", key: "sessions", width: 8 },
      { header: "Geldi", key: "present", width: 8 },
      { header: "Gelmedi", key: "absent", width: 9 },
      { header: "Devam %", key: "rate", width: 9 },
    ],
    r.groups,
  );
  sheet(
    wb,
    "Öğrenciler",
    [
      { header: "Grup", key: "group", width: 16 },
      { header: "Öğrenci", key: "name", width: 28 },
      { header: "No", key: "studentNo", width: 8 },
      { header: "Geldi", key: "present", width: 8 },
      { header: "Gelmedi", key: "absent", width: 9 },
      { header: "İzinli", key: "excused", width: 8 },
      { header: "Devam %", key: "rate", width: 9 },
    ],
    r.students,
  );
  return Buffer.from(await wb.xlsx.writeBuffer());
}
