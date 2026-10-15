import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/server";
import { listAgeGroups } from "@/lib/age-groups-db";
import { todayKey } from "@/lib/billing";
import { addDaysTo } from "@/lib/dates";
import { ensureSessionsWindow, listGroupCoaches, listSchedules, listSessions, listVenues } from "@/lib/program";
import { listStaff } from "@/lib/team";
import { ProgramManager } from "./ProgramManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Program ve Sahalar" };

export default async function ProgramPage() {
  await requireAdmin("program.yonet");
  ensureSessionsWindow();
  const today = todayKey();
  const staff = listStaff()
    .filter((u) => u.status === "active")
    .map((u) => ({ id: u.id, name: u.fullName ?? u.username ?? `#${u.id}`, roleName: u.roleName, portal: u.portal }));
  return (
    <main className="panel-rise mx-auto w-full max-w-6xl px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-ink sm:text-[26px]">Program ve Sahalar</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/gruplar?gorunum=takvim" className="inline-flex min-h-10 items-center rounded-xl border border-control bg-white px-3.5 text-sm font-semibold text-ink shadow-xs hover:bg-gray-50 pointer-coarse:min-h-11">
            Haftalık takvim
          </Link>
          <Link href="/admin/gruplar/cikti" className="inline-flex min-h-10 items-center rounded-xl border border-control bg-white px-3.5 text-sm font-semibold text-ink shadow-xs hover:bg-gray-50 pointer-coarse:min-h-11">
            Programı PDF / Excel al
          </Link>
        </div>
      </div>
      <p className="mt-1 max-w-2xl text-[15px] text-muted">Grupların haftalık antrenman günleri, saatleri ve sahaları. Takvimdeki seanslar bu programdan üretilir; tek bir antrenmanı iptal edebilir ya da taşıyabilirsiniz.</p>
      <ProgramManager
        today={today}
        groups={listAgeGroups().map(({ id, name }) => ({ id, name }))}
        venues={listVenues(true)}
        schedules={listSchedules()}
        coaches={listGroupCoaches()}
        staff={staff}
        sessions={listSessions({ from: today, to: addDaysTo(today, 21), includeCancelled: true })}
      />
    </main>
  );
}
