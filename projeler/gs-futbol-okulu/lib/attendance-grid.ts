import { and, eq, inArray, isNotNull, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { ageGroups, attendance, groupSchedules, registrations, trainingSessions } from "@/lib/db/schema";
import { birthYearOf } from "@/lib/age-groups";
import { listAgeGroups } from "@/lib/age-groups-db";
import type { AttendanceStatus } from "@/lib/attendance";
import { accessMap, lastPayments } from "@/lib/billing";
import { PAY_STATUS, payStatus, type PayStatus, type PaymentMethod } from "@/lib/billing-shared";
import { addDaysTo } from "@/lib/dates";
import { listOrders } from "@/lib/equipment";
import { isFormaItem } from "@/lib/equipment-shared";
import { resolveContactParent } from "@/lib/format";
import { hasPhotoConsentMap } from "@/lib/legal";
import type { DateRange } from "@/lib/date-range";
import { weekdayOf } from "@/lib/program";

/**
 * Yoklama çizelgesi (kağıttaki gibi): satırlarda öğrenciler, sütunlarda antrenman günleri. Geçmiş kağıt
 * yoklamaları buradan girilir. Sütun bir gündür; bir grubun aynı gün iki antrenmanı varsa ikinci sütun açılır.
 *
 * Bir öğrencinin o günkü antrenmanı: o gün yoklaması olan antrenman; yoksa, birleşip arşive alınmış eski grubunun
 * (doğum yılı aralığına göre) süresi içindeki günlerde o grubun antrenmanı; sonrasında şimdiki grubunun antrenmanı.
 * Grup üyeliğinin geçmişi tutulmadığı için eski grup doğum yılından bulunur.
 */

export type GridCell = number | "cancelled" | "planned";

export type GridDay = {
  key: string;
  date: string;
  /** Grup → o günkü antrenman (toplu işaretleme ve başlık için). */
  sessions: Record<number, { id: number | null; startTime: string; status: "scheduled" | "cancelled" | "planned"; reason: string | null }>;
};

export type GridKit = { size: string | null; state: "none" | "owned" | "ok" | "order" | "unpaid"; label: string };

export type GridBilling = {
  status: PayStatus;
  label: string;
  /** Hakkı varsa sonraki ödeme günü (paketi aşan ilk antrenman). */
  paidUntil: string | null;
  sessionsLeft: number | null;
  lastPayment: { paidOn: string; method: PaymentMethod; amountKurus: number } | null;
};

export type GridStudent = {
  /** Satır anahtarı: grup + öğrenci (başka gruba geçen öğrenci eski grubunda da görünebilir). */
  key: string;
  id: number;
  name: string;
  studentNo: number | null;
  photoFileId: number | null;
  birthYear: number | null;
  groupId: number | null;
  isGoalkeeper: boolean;
  /** Satırın grubunda artık değil: ayrıldı ya da başka gruba geçti. */
  away: { kind: "left" | "moved"; groupName: string | null } | null;
  contactName: string | null;
  phone: string | null;
  enrolledOn: string | null;
  kit: GridKit | null;
  billing: GridBilling | null;
  /** Gün anahtarı → antrenman (yoksa o gün antrenmanı yok). */
  cells: Record<string, GridCell>;
};

export type AttendanceGrid = {
  today: string;
  from: string;
  to: string;
  groups: { id: number; name: string }[];
  days: GridDay[];
  students: GridStudent[];
  /** `${sessionId}:${registrationId}` → durum */
  marks: Record<string, AttendanceStatus>;
};

/** Çizelgenin son günü: dönem sonu (Aralık sonu ya da Haziran sonu), en az dört hafta ileri. */
export function gridEnd(today: string): string {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const end = m >= 7 ? `${y}-12-31` : `${y}-06-30`;
  const min = addDaysTo(today, 28);
  return end > min ? end : min;
}

type SessionRow = { id: number; groupId: number; date: string; startTime: string; status: string; cancelReason: string | null };

export function loadAttendanceGrid(options: { scope: number[] | null; today: string; perms: { billing: boolean; contact: boolean }; range?: DateRange }): AttendanceGrid {
  const { scope, today, perms } = options;
  const db = getDb();
  const to = options.range?.to ?? gridEnd(today);
  const active = listAgeGroups().filter((g) => scope === null || scope.includes(g.id));
  const activeIds = active.map((g) => g.id);
  // Arşivlenen (birleşen) grupların geçmişi yalnız tüm grupları görene
  const archived = scope === null ? db.select().from(ageGroups).where(isNotNull(ageGroups.archivedAt)).all() : [];
  const allIds = [...activeIds, ...archived.map((g) => g.id)];
  const groupName = new Map([...active, ...archived].map((g) => [g.id, g.name]));
  if (!allIds.length) return { today, from: options.range?.from ?? today, to, groups: [], days: [], students: [], marks: {} };

  const sessions: SessionRow[] = db
    .select({ id: trainingSessions.id, groupId: trainingSessions.groupId, date: trainingSessions.date, startTime: trainingSessions.startTime, status: trainingSessions.status, cancelReason: trainingSessions.cancelReason })
    .from(trainingSessions)
    .where(and(inArray(trainingSessions.groupId, allIds), lte(trainingSessions.date, to)))
    .orderBy(trainingSessions.date, trainingSessions.startTime)
    .all();
  const from = options.range?.from ?? sessions[0]?.date ?? today;

  // Üretilmemiş günler (beş haftadan sonrası) haftalık programdan: yalnız görünür, işaretlenmez
  const planned: { groupId: number; date: string; startTime: string }[] = [];
  const schedules = db.select().from(groupSchedules).where(inArray(groupSchedules.groupId, activeIds.length ? activeIds : [0])).all();
  for (const gid of activeIds) {
    const last = sessions.filter((s) => s.groupId === gid).at(-1)?.date ?? addDaysTo(today, -1);
    const own = schedules.filter((s) => s.groupId === gid);
    const start = addDaysTo(last, 1) > from ? addDaysTo(last, 1) : from;
    for (let d = start; d <= to; d = addDaysTo(d, 1)) {
      const wd = weekdayOf(d);
      for (const s of own) if (s.weekday === wd && (!s.validFrom || d >= s.validFrom) && (!s.validTo || d <= s.validTo)) planned.push({ groupId: gid, date: d, startTime: s.startTime });
    }
  }
  planned.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  // Günler: her grubun o günkü sırası (0, 1) ayrı sütun
  type Slot = { groupId: number; date: string; startTime: string; id: number | null; status: "scheduled" | "cancelled" | "planned"; reason: string | null };
  const slots: Slot[] = [
    ...sessions.filter(s => s.date >= from).map((s) => ({ groupId: s.groupId, date: s.date, startTime: s.startTime, id: s.id, status: (s.status === "cancelled" ? "cancelled" : "scheduled") as Slot["status"], reason: s.cancelReason })),
    ...planned.filter(p => p.date >= from).map((p) => ({ ...p, id: null, status: "planned" as const, reason: null })),
  ];
  const dayMap = new Map<string, GridDay>();
  const order = new Map<string, number>();
  for (const s of slots) {
    const n = order.get(`${s.groupId}:${s.date}`) ?? 0;
    order.set(`${s.groupId}:${s.date}`, n + 1);
    const key = n === 0 ? s.date : `${s.date}#${n + 1}`;
    const day = dayMap.get(key) ?? { key, date: s.date, sessions: {} };
    day.sessions[s.groupId] = { id: s.id, startTime: s.startTime, status: s.status, reason: s.reason };
    dayMap.set(key, day);
  }
  const days = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key));
  const dayKeyOf = new Map<number, string>();
  for (const d of days) for (const s of Object.values(d.sessions)) if (s.id !== null) dayKeyOf.set(s.id, d.key);

  // Yoklamalar
  const sessionIds = sessions.filter(s => s.date >= from).map((s) => s.id);
  const markRows = sessionIds.length ? db.select({ s: attendance.sessionId, r: attendance.registrationId, status: attendance.status }).from(attendance).where(inArray(attendance.sessionId, sessionIds)).all() : [];
  const marks: Record<string, AttendanceStatus> = {};
  for (const m of markRows) marks[`${m.s}:${m.r}`] = m.status as AttendanceStatus;
  const sessionGroup = new Map(sessions.map((s) => [s.id, s.groupId]));

  // Öğrenciler: kayıtlı olanlar + bu antrenmanlarda yoklaması olan (ayrılan, başka gruba geçen)
  const markedIds = [...new Set(markRows.map((m) => m.r))];
  const regs = db
    .select()
    .from(registrations)
    .where(eq(registrations.status, "enrolled"))
    .all()
    .filter((r) => r.groupId !== null && activeIds.includes(r.groupId));
  const extra = markedIds.filter((id) => !regs.some((r) => r.id === id));
  if (extra.length) regs.push(...db.select().from(registrations).where(inArray(registrations.id, extra)).all());

  const ids = regs.map((r) => r.id);
  const consent = hasPhotoConsentMap(ids);
  const access = perms.billing ? accessMap(regs.filter((r) => r.status === "enrolled"), today) : new Map();
  const lastPay = new Map<number, GridBilling["lastPayment"]>();
  const kits = new Map<number, GridKit>();
  if (perms.billing && ids.length) {
    for (const [id, p] of lastPayments(ids)) lastPay.set(id, p);
    const idSet = new Set(ids);
    for (const o of listOrders()) {
      if (!idSet.has(o.registrationId) || !isFormaItem(o.itemName) || kits.has(o.registrationId)) continue;
      const state: GridKit["state"] = o.owned ? "owned" : !o.paid ? "unpaid" : o.delivery === "delivered" ? "ok" : "order";
      const label = { owned: "Kendisinde", unpaid: "Parası alınmadı", ok: "Verildi", order: o.delivery === "ordered" ? "Sipariş verildi" : o.delivery === "to_order" ? "Sipariş verilecek" : "Teslim edilmedi", none: "Yok" }[state];
      kits.set(o.registrationId, { size: o.size, state, label });
    }
  }

  // Gün → grup → antrenman kimliği (hücre bulma)
  const byGroupDay = new Map<string, Slot>();
  for (const d of days) for (const [gid, s] of Object.entries(d.sessions)) byGroupDay.set(`${gid}|${d.key}`, { groupId: Number(gid), date: d.date, ...s });
  const archivedFor = (year: number | null) => (year === null ? [] : archived.filter((g) => year >= g.minBirthYear && year <= g.maxBirthYear).map((g) => g.id));
  // Arşiv grubunun son antrenman günü: o güne kadar öğrenci o gruptaydı
  const lastOf = new Map<number, string>();
  for (const x of sessions) lastOf.set(x.groupId, x.date);

  const students: GridStudent[] = [];
  for (const r of regs) {
    const year = birthYearOf(r.birthDate);
    const ownMarks = new Map<string, number>();
    for (const m of markRows) if (m.r === r.id) ownMarks.set(dayKeyOf.get(m.s)!, m.s);
    // Satırın grupları: şimdiki grubu (kayıtlıysa) ve yoklaması olan diğer gruplar
    const rowGroups = new Set<number>();
    if (r.status === "enrolled" && r.groupId !== null && activeIds.includes(r.groupId)) rowGroups.add(r.groupId);
    for (const m of markRows) if (m.r === r.id && !rowGroups.size) rowGroups.add(sessionGroup.get(m.s)!);
    const rowGroup = [...rowGroups][0] ?? null;
    if (rowGroup === null) continue;
    const old = archivedFor(year);
    const cells: Record<string, GridCell> = {};
    for (const d of days) {
      const marked = ownMarks.get(d.key);
      if (marked !== undefined) {
        cells[d.key] = marked;
        continue;
      }
      const before = old.filter((g) => d.date <= (lastOf.get(g) ?? ""));
      const s = before.length ? before.map((g) => byGroupDay.get(`${g}|${d.key}`)).find(Boolean) : byGroupDay.get(`${rowGroup}|${d.key}`);
      if (!s) continue;
      cells[d.key] = s.status === "cancelled" ? "cancelled" : s.id === null ? "planned" : s.id;
    }
    const contact = resolveContactParent(r);
    const a = access.get(r.id);
    const status = a ? payStatus(a, today) : null;
    students.push({
      key: `${rowGroup}:${r.id}`,
      id: r.id,
      name: r.studentFullName,
      studentNo: r.studentNo,
      photoFileId: consent.get(r.id) ? r.photoFileId : null,
      birthYear: year,
      groupId: rowGroup,
      isGoalkeeper: r.isGoalkeeper,
      away: r.status !== "enrolled" ? { kind: "left", groupName: null } : r.groupId !== rowGroup ? { kind: "moved", groupName: r.groupId ? (groupName.get(r.groupId) ?? null) : null } : null,
      contactName: perms.contact ? contact.fullName || null : null,
      phone: perms.contact ? contact.phone || null : null,
      enrolledOn: r.enrolledAt ? r.enrolledAt.slice(0, 10) : null,
      kit: perms.billing ? (kits.get(r.id) ?? { size: null, state: "none", label: "Yok" }) : null,
      billing:
        perms.billing && a && status
          ? { status, label: PAY_STATUS[status].label, paidUntil: a.paidUntil, sessionsLeft: a.sessionsLeft ?? null, lastPayment: lastPay.get(r.id) ?? null }
          : null,
      cells,
    });
  }
  students.sort((a, b) => Number(Boolean(a.away)) - Number(Boolean(b.away)) || a.name.localeCompare(b.name, "tr"));

  // Görünen gruplar: etkin olanlar + satırı olan arşiv grupları
  const shown = new Set(students.map((s) => s.groupId));
  const groups = [...active.map((g) => ({ id: g.id, name: g.name })), ...archived.filter((g) => shown.has(g.id)).map((g) => ({ id: g.id, name: `${g.name} (eski)` }))];
  return { today, from, to, groups, days, students, marks };
}

/** Grup değişiminden sonra geçmişteki boş hücre de çizelgede gösterildiği seansa kaydedilebilir. */
export function isAttendanceGridCell(sessionId: number, registrationId: number, options: { scope: number[] | null; today: string }): boolean {
  const grid = loadAttendanceGrid({ ...options, perms: { billing: false, contact: false } });
  return grid.students.some((student) => student.id === registrationId && Object.values(student.cells).includes(sessionId));
}

/** Sistemdeki ilk antrenman günü (çizelge buradan başlar). */
export function earliestSessionDate(): string | null {
  const row = getDb().select({ date: trainingSessions.date }).from(trainingSessions).orderBy(trainingSessions.date).limit(1).get();
  return row?.date ?? null;
}
