import { resolveDateRange } from "@/lib/date-range";
import type { Metadata } from "next";
import { birthYearOf, effectiveGroup, findGroupForBirthDate } from "@/lib/age-groups";
import { can, requireAdmin } from "@/lib/auth/server";
import { todayKey } from "@/lib/billing";
import { groupsOverview } from "@/lib/groups-overview";
import { loadPanelData } from "@/lib/panel-data";
import { listSchedules } from "@/lib/program";
import { GroupsHub, type HubView } from "./GroupsHub";

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gruplar" };

export default async function GroupsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin("program.yonet");
  const params = await searchParams;
  const { gorunum } = params;
  const { registrations, groups } = loadPanelData();
  const today = todayKey();
  const range = resolveDateRange(params, today);
  const overview = groupsOverview({ billing: can(admin, "aidat.gor"), today, range });

  // "Grupları düzenle" görünümü için (yaş aralıkları, silerken taşıma)
  const stats = Object.fromEntries(
    groups.map((g) => [
      g.id,
      {
        students: registrations.filter((r) => r.status === "enrolled" && r.groupId === g.id).length,
        keepers: registrations.filter((r) => r.status === "enrolled" && r.groupId === g.id && r.isGoalkeeper).length,
        candidates: registrations.filter((r) => r.status !== "enrolled" && r.status !== "cancelled" && effectiveGroup(r, groups).group?.id === g.id).length,
      },
    ]),
  );
  const schedule: Record<number, string> = {};
  for (const sc of listSchedules()) schedule[sc.groupId] = [schedule[sc.groupId], `${DAYS[sc.weekday - 1]} ${sc.startTime}`].filter(Boolean).join(", ");
  // Kayıtlarda geçen ama hiçbir gruba düşmeyen doğum yılları.
  const uncovered = new Map<number, number>();
  for (const r of registrations) {
    if (r.status === "cancelled") continue;
    const year = birthYearOf(r.birthDate);
    if (year !== null && !findGroupForBirthDate(groups, r.birthDate)) uncovered.set(year, (uncovered.get(year) ?? 0) + 1);
  }

  const view: HubView = gorunum === "takvim" ? "calendar" : gorunum === "duzenle" ? "edit" : "groups";
  return (
    <GroupsHub
      today={today}
      range={range}
      view={view}
      overview={overview}
      billing={can(admin, "aidat.gor")}
      canAttendance={can(admin, "yoklama.al")}
      canLists={can(admin, "kayit.gor")}
      manager={{ groups, stats, schedule, uncovered: [...uncovered.entries()].sort((a, b) => b[0] - a[0]).map(([year, count]) => ({ year, count })) }}
    />
  );
}
