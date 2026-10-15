import { resolveDateRange } from "@/lib/date-range";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { can, requireAdmin } from "@/lib/auth/server";
import { todayKey } from "@/lib/billing";
import { dayLabel } from "@/lib/billing-shared";
import { addDaysTo } from "@/lib/dates";
import { groupsOverview } from "@/lib/groups-overview";
import { loadPanelData } from "@/lib/panel-data";
import { OutputCenter } from "./OutputCenter";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Çıktı al" };

/** Grup listeleri, yoklama kağıdı, haftalık program: PDF (telefonda paylaşılır) ya da Excel. */
export default async function OutputPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin();
  const canLists = can(admin, "kayit.gor");
  const canSheets = can(admin, "yoklama.al") || canLists;
  if (!canLists && !canSheets && !can(admin, "program.yonet")) redirect("/admin/yetkisiz");
  const params = await searchParams;
  const { grup } = params;
  const today = todayKey();
  const billing = can(admin, "aidat.gor");
  const overview = groupsOverview({ billing, today });
  const canExcel = can(admin, "rapor.gor");
  const { registrations, groups } = canExcel ? loadPanelData() : { registrations: [], groups: [] };
  const initial = typeof grup === "string" && /^\d+$/.test(grup) ? [Number(grup)] : grup === "bugun" || grup === "yarin" ? grup : "all";

  return (
    <OutputCenter
      initialRange={resolveDateRange(params, today)}
      today={today}
      todayLabel={dayLabel(today)}
      tomorrow={addDaysTo(today, 1)}
      groups={overview.groups.map((g) => ({ id: g.id, name: g.name, ages: g.ages, students: g.students }))}
      todayGroupIds={[...new Set(overview.todaySessions.map((s) => s.groupId))]}
      tomorrowGroupIds={[...new Set(overview.tomorrowSessions.map((s) => s.groupId))]}
      programRows={overview.groups.map((g) => ({ group: g.name, years: g.years, ages: g.ages, slots: g.slots }))}
      initial={initial}
      can={{ lists: canLists, sheets: canSheets, excel: canExcel, billing }}
      registrations={registrations}
      ageGroups={groups}
    />
  );
}
