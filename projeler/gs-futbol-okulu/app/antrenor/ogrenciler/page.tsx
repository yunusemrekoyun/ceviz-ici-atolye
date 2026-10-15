import { DateRangeFilter } from "@/components/DateRangeFilter";
import { resolveDateRange, withDateRange } from "@/lib/date-range";
import { todayKey } from "@/lib/billing";
import type { Metadata } from "next";
import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { requirePortal } from "@/lib/auth/server";
import { listAgeGroups } from "@/lib/age-groups-db";
import { accessMap } from "@/lib/billing";
import { ACCESS_BADGE, ACCESS_LABELS } from "@/lib/billing-shared";
import { getDb } from "@/lib/db";
import { registrations } from "@/lib/db/schema";
import { groupScope } from "@/lib/scan";
import { KeeperBadge } from "@/components/admin/kit";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Öğrenciler" };

export default async function CoachStudents({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const today = todayKey();
  const range = resolveDateRange(await searchParams, today);
  const user = await requirePortal("coach");
  const scope = groupScope(user);
  const groups = listAgeGroups().filter((g) => scope === null || scope.includes(g.id));
  const students =
    groups.length === 0
      ? []
      : getDb()
          .select({ id: registrations.id, name: registrations.studentFullName, studentNo: registrations.studentNo, groupId: registrations.groupId, status: registrations.status, isGoalkeeper: registrations.isGoalkeeper })
          .from(registrations)
          .where(and(eq(registrations.status, "enrolled"), inArray(registrations.groupId, groups.map((g) => g.id))))
          .all();
  const access = accessMap(students);
  const canAttendance = user.permissions.includes("yoklama.al");
  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-black text-ink">Öğrenciler</h1>
      {canAttendance ? <DateRangeFilter range={range} today={today} label="Yoklama kağıdı tarih aralığı" /> : null}
      {groups.length === 0 ? <p className="rounded-2xl bg-white p-4 text-muted">Size atanmış grup yok.</p> : null}
      {groups.map((g) => {
        const list = students.filter((s) => s.groupId === g.id).sort((a, b) => a.name.localeCompare(b.name, "tr"));
        return (
          <section key={g.id}>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
              {g.name} · {list.length}
              {list.some((s) => s.isGoalkeeper) ? ` · ${list.filter((s) => s.isGoalkeeper).length} kaleci` : ""}
            </h2>
            {list.length ? (
              <div className="mb-2 grid grid-cols-2 gap-2">
                {canAttendance ? (
                  <a href={withDateRange(`/api/antrenor/cikti?tur=yoklama&grup=${g.id}`, range)} target="_blank" rel="noopener" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-3 text-center text-sm font-semibold text-ink active:scale-[0.98]">
                    Yoklama kağıdı (PDF)
                  </a>
                ) : null}
                <a href={`/api/antrenor/cikti?tur=liste&grup=${g.id}`} className={["inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-3 text-center text-sm font-semibold text-ink active:scale-[0.98]", canAttendance ? "" : "col-span-2"].join(" ")}>
                  Liste (Excel)
                </a>
              </div>
            ) : null}
            <ul className="overflow-hidden rounded-2xl border border-line bg-white">
              {list.map((s) => {
                const a = access.get(s.id)!;
                return (
                  <li key={s.id} className="border-b border-line last:border-0">
                    <Link href={`/antrenor/ogrenciler/${s.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2 transition hover:bg-surface">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-ink">{s.name}</span>
                        <span className="text-xs text-muted">
                          No {s.studentNo ?? "—"}
                          {s.isGoalkeeper ? <KeeperBadge className="ml-1.5" /> : null}
                        </span>
                      </span>
                      {!a.allowed ? <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${ACCESS_BADGE[a.state]}`}>{ACCESS_LABELS[a.state]}</span> : null}
                    </Link>
                  </li>
                );
              })}
              {list.length === 0 ? <li className="p-4 text-sm text-muted">Öğrenci yok.</li> : null}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
