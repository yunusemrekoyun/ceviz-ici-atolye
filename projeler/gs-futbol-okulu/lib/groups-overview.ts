import { defaultDateRange, type DateRange } from "@/lib/date-range";
import { effectiveGroup } from "@/lib/age-groups";
import { listAgeGroups } from "@/lib/age-groups-db";
import { attendanceSummaries } from "@/lib/attendance";
import { accessMap, ensurePeriodsToday, todayKey } from "@/lib/billing";
import { payStatus, type PayStatus } from "@/lib/billing-shared";
import { addDaysTo } from "@/lib/dates";
import { groupAgeRange } from "@/lib/export/extras";
import { directionLinks } from "@/lib/maps";
import { ensureSessionsWindow, listSessions, listVenues } from "@/lib/program";
import { weeklyProgram, type ProgramSlot } from "@/lib/program-sheets";
import { listRegistrations } from "@/lib/registrations";

/**
 * Gruplar ekranı: her grubun yaş aralığı, günleri ve saatleri, sahası, antrenörü, kimler var (sayılar), aidat ve devam
 * özeti, sıradaki antrenmanı; bugün ve yarın antrenmanı olan gruplar (yoklama kağıdı, veli hatırlatması için).
 */

const UNPAID: PayStatus[] = ["late", "due", "first", "promise"];

export type GroupCard = {
  id: number;
  name: string;
  years: string;
  ages: string;
  slots: ProgramSlot[];
  coaches: string[];
  venues: string[];
  students: number;
  keepers: number;
  candidates: number;
  /** Aidat izni yoksa null. */
  unpaid: number | null;
  late: number | null;
  attendanceRate: number | null;
  next: { date: string; startTime: string; endTime: string } | null;
};

export type SessionCard = {
  id: number;
  groupId: number;
  group: string;
  ages: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string | null;
  mapUrl: string | null;
  coaches: string[];
  students: number;
  keepers: number;
  /** Aidatı geciktiği için antrenmana giremeyecekler (aidat izni yoksa null). */
  late: number | null;
};

export function groupsOverview(opts: { billing: boolean; today?: string; range?: DateRange }): { groups: GroupCard[]; todaySessions: SessionCard[]; tomorrowSessions: SessionCard[] } {
  const today = opts.today ?? todayKey();
  const range = opts.range ?? defaultDateRange(today);
  const tomorrow = addDaysTo(today, 1);
  ensureSessionsWindow();
  const ageGroups = listAgeGroups();
  const program = new Map(weeklyProgram(today).rows.map((r) => [r.groupId, r]));
  const regs = listRegistrations();
  const enrolled = regs.filter((r) => r.status === "enrolled");

  let status = new Map<number, PayStatus>();
  if (opts.billing && enrolled.length) {
    ensurePeriodsToday();
    status = new Map([...accessMap(enrolled, today)].map(([id, a]) => [id, payStatus(a, today)]));
  }
  const att = attendanceSummaries(
    enrolled.map((r) => r.id),
    range.from,
    range.to,
  );
  const sessions = listSessions({ from: today, to: addDaysTo(today, 14) });
  const venues = new Map(listVenues(true).map((v) => [v.id, v]));

  const groups: GroupCard[] = ageGroups.map((g) => {
    const members = enrolled.filter((r) => r.groupId === g.id);
    let present = 0;
    let absent = 0;
    for (const m of members) {
      const a = att.get(m.id);
      if (a) {
        present += a.present;
        absent += a.absent;
      }
    }
    const p = program.get(g.id);
    const next = sessions.find((s) => s.groupId === g.id && (s.date > today || s.date === today));
    return {
      id: g.id,
      name: g.name,
      years: p?.years ?? `${g.minBirthYear}–${g.maxBirthYear}`,
      ages: groupAgeRange(g.minBirthYear, g.maxBirthYear, today),
      slots: p?.slots ?? [],
      coaches: p?.coaches ?? [],
      venues: [...new Set((p?.slots ?? []).map((s) => s.venue).filter((v): v is string => Boolean(v)))],
      students: members.length,
      keepers: members.filter((m) => m.isGoalkeeper).length,
      candidates: regs.filter((r) => (r.status === "pending" || r.status === "scheduled" || r.status === "no_show") && effectiveGroup(r, ageGroups).group?.id === g.id).length,
      unpaid: opts.billing ? members.filter((m) => UNPAID.includes(status.get(m.id) ?? "paid")).length : null,
      late: opts.billing ? members.filter((m) => status.get(m.id) === "late").length : null,
      attendanceRate: present + absent ? Math.round((present / (present + absent)) * 100) : null,
      next: next ? { date: next.date, startTime: next.startTime, endTime: next.endTime } : null,
    };
  });

  const card = (s: (typeof sessions)[number]): SessionCard => {
    const g = groups.find((x) => x.id === s.groupId);
    const members = enrolled.filter((r) => r.groupId === s.groupId);
    const v = s.venueId ? venues.get(s.venueId) : null;
    return {
      id: s.id,
      groupId: s.groupId,
      group: s.groupName,
      ages: g?.ages ?? "",
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      venue: s.venueName,
      mapUrl: v ? directionLinks(v)[0]!.href : null,
      coaches: g?.coaches ?? [],
      students: members.length,
      keepers: members.filter((m) => m.isGoalkeeper).length,
      late: opts.billing ? members.filter((m) => status.get(m.id) === "late").length : null,
    };
  };
  const byTime = (a: SessionCard, b: SessionCard) => a.startTime.localeCompare(b.startTime) || a.group.localeCompare(b.group, "tr");
  return {
    groups,
    todaySessions: sessions.filter((s) => s.date === today).map(card).sort(byTime),
    tomorrowSessions: sessions.filter((s) => s.date === tomorrow).map(card).sort(byTime),
  };
}
