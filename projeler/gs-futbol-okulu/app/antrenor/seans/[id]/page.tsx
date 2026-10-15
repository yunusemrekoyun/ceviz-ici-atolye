import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePortal } from "@/lib/auth/server";
import { sessionRoster } from "@/lib/attendance";
import { todayKey } from "@/lib/billing";
import { dayLabel } from "@/lib/billing-shared";
import { getSession } from "@/lib/program";
import { groupScope, inScope } from "@/lib/scan";
import { AttendanceSheet } from "@/components/staff/AttendanceSheet";
import { getSetting } from "@/lib/settings";
import { listDrills, sessionDrillIds } from "@/lib/development";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Yoklama" };

export default async function CoachSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePortal("coach", "yoklama.al");
  const id = Number((await params).id);
  const s = Number.isInteger(id) && id > 0 ? getSession(id) : null;
  if (!s || !inScope(groupScope(user), s.groupId)) notFound();
  const today = todayKey();
  const { rows } = sessionRoster(s.id);
  return (
    <div>
      <Link href="/antrenor" className="text-sm font-semibold text-gs-red">
        ← Bugün
      </Link>
      <h1 className="mt-2 text-2xl font-black text-ink">{s.groupName}</h1>
      <p className="mb-4 text-muted">
        {s.date === today ? "Bugün" : dayLabel(s.date)} · {s.startTime}–{s.endTime}
        {s.venueName ? ` · ${s.venueName}` : ""}
      </p>
      <AttendanceSheet
        session={{ id: s.id, groupName: s.groupName, date: s.date, startTime: s.startTime, endTime: s.endTime, venueName: s.venueName, logText: s.logText, editable: s.status === "scheduled" && s.date <= today }}
        initialRows={rows}
        canLog={user.permissions.includes("gelisim.gir")}
        cardScan={getSetting("cardAttendance")}
        drills={listDrills().map(({ id, name, category }) => ({ id, name, category }))}
        initialDrills={sessionDrillIds(s.id)}
      />
    </div>
  );
}
