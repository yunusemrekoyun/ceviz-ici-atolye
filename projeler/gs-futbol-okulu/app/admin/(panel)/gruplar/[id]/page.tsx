import { resolveDateRange } from "@/lib/date-range";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { can, requireAdmin } from "@/lib/auth/server";
import { birthYearOf, effectiveGroup, findGroupForBirthDate } from "@/lib/age-groups";
import { groupAgeRange } from "@/lib/export/extras";
import { weeklyProgram } from "@/lib/program-sheets";
import { listAgeGroups } from "@/lib/age-groups-db";
import { attendanceSummaries } from "@/lib/attendance";
import { accessMap, ensurePeriodsToday, todayKey } from "@/lib/billing";
import { payStatus, type PayStatus } from "@/lib/billing-shared";
import { addDaysTo } from "@/lib/dates";
import { loadPanelData } from "@/lib/panel-data";
import { ensureSessionsWindow, listGroupCoaches, listSchedules, listSessions, listVenues } from "@/lib/program";
import { listStaff } from "@/lib/team";
import { GroupDetail } from "./GroupDetail";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const id = Number((await params).id);
  return { title: listAgeGroups().find((g) => g.id === id)?.name ?? "Grup" };
}

/** Grup sayfası: kimler var, hangi gün ve saatte, nerede, kim çalıştırıyor, sıradaki antrenmanlar. */
export default async function GroupPage({ params, searchParams }: Params & { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin("program.yonet");
  const id = Number((await params).id);
  const groups = listAgeGroups();
  const group = groups.find((g) => g.id === id);
  if (!group) notFound();
  const today = todayKey();
  const range = resolveDateRange(await searchParams, today);

  const { registrations } = loadPanelData(new Date(), can(admin, "hassas.gor"));
  const students = registrations.filter((r) => r.status === "enrolled" && r.groupId === id);
  const candidates = registrations.filter((r) => (r.status === "pending" || r.status === "scheduled" || r.status === "no_show") && effectiveGroup(r, groups).group?.id === id);

  // Ödeme durumu yalnız aidat izni olana
  let pay: Record<number, PayStatus> | undefined;
  if (can(admin, "aidat.gor")) {
    ensurePeriodsToday();
    pay = {};
    for (const [sid, a] of accessMap(students, today)) pay[sid] = payStatus(a, today);
  }
  const summaries = attendanceSummaries(
    students.map((s) => s.id),
    range.from,
    range.to,
  );
  const attendance = Object.fromEntries([...summaries].map(([sid, a]) => [sid, { rate: a.rate, present: a.present, absent: a.absent }]));

  // Doğum yılı bu grubun aralığında olmayan öğrenciler (önerilen grup ile)
  const mismatch = students
    .map((r) => ({ r, year: birthYearOf(r.birthDate) }))
    .filter(({ year }) => year !== null && (year < group.minBirthYear || year > group.maxBirthYear))
    .map(({ r, year }) => ({ id: r.id, name: r.studentFullName, year: year!, suggested: findGroupForBirthDate(groups, r.birthDate)?.name ?? null }));
  const programRow = weeklyProgram(today).rows.find((x) => x.groupId === id);

  ensureSessionsWindow();
  const staff = listStaff()
    .filter((u) => u.status === "active")
    .map((u) => ({ id: u.id, name: u.fullName ?? u.username ?? `#${u.id}`, roleName: u.roleName, portal: u.portal }));

  return (
    <GroupDetail
      today={today}
      range={range}
      group={group}
      groups={groups.map(({ id: gid, name }) => ({ id: gid, name }))}
      venues={listVenues(true)}
      schedules={listSchedules().filter((s) => s.groupId === id)}
      coaches={listGroupCoaches().filter((c) => c.groupId === id)}
      staff={staff}
      sessions={listSessions({ from: today, to: addDaysTo(today, 21), groupIds: [id], includeCancelled: true })}
      students={students}
      candidates={candidates}
      pay={pay}
      attendance={attendance}
      can={{ files: can(admin, "kayit.gor"), attendance: can(admin, "yoklama.al"), exportList: can(admin, "rapor.gor") }}
      ages={groupAgeRange(group.minBirthYear, group.maxBirthYear, today)}
      mismatch={mismatch}
      programRow={programRow ? { group: programRow.group, years: programRow.years, ages: groupAgeRange(group.minBirthYear, group.maxBirthYear, today), slots: programRow.slots } : null}
    />
  );
}
