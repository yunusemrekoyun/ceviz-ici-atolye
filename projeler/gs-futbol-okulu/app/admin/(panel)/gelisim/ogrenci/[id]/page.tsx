import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/server";
import { listAgeGroups } from "@/lib/age-groups-db";
import { studentAttendance, summarize } from "@/lib/attendance";
import { todayKey } from "@/lib/billing";
import { dayLabel } from "@/lib/billing-shared";
import { BRAND_NAME } from "@/lib/constants";
import { progressOf } from "@/lib/development";
import { getRegistration } from "@/lib/registrations";
import { groupScope, inScope } from "@/lib/scan";
import { getSettings } from "@/lib/settings";
import { ProgressView } from "@/components/development/ProgressView";
import { PrintButton } from "../../../qr-afis/PrintButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gelişim raporu" };

/** Dönemsel gelişim raporu (GEL-06): ekranda ve yazdırıldığında aynı. */
export default async function StudentProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin("gelisim.gir");
  const id = Number((await params).id);
  const reg = Number.isInteger(id) && id > 0 ? getRegistration(id) : null;
  if (!reg || !inScope(groupScope(user), reg.groupId)) notFound();
  const sum = summarize(studentAttendance(reg.id, 500));
  const group = listAgeGroups().find((g) => g.id === reg.groupId);
  return (
    <main className="panel-rise mx-auto w-full max-w-3xl px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <div className="no-print mb-4 flex justify-end">
        <PrintButton />
      </div>
      <header className="mb-5 border-b-2 border-ink pb-3">
        <p className="text-xs font-black uppercase tracking-widest text-gs-red">{BRAND_NAME} · Gelişim raporu</p>
        <h1 className="mt-1 text-2xl font-black text-ink">{reg.studentFullName}</h1>
        <p className="text-muted">
          No {reg.studentNo ?? "—"} · {group?.name ?? "Grupsuz"} · {dayLabel(todayKey())}
        </p>
        <p className="mt-2 text-ink">
          Devam: <span className="font-bold">{sum.present}</span> antrenman{sum.rate !== null ? ` · %${sum.rate}` : ""}
        </p>
      </header>
      <ProgressView progress={progressOf(reg.id)} criteria={getSettings().evaluationCriteria} />
    </main>
  );
}
