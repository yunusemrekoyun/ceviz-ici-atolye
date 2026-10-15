import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { can, requireAdmin } from "@/lib/auth/server";
import { listAgeGroups } from "@/lib/age-groups-db";
import { getDb } from "@/lib/db";
import { registrations } from "@/lib/db/schema";
import { listItems, listOrders } from "@/lib/equipment";
import { loadPanelData } from "@/lib/panel-data";
import { EquipmentManager } from "./EquipmentManager";
import { FormaExport } from "./FormaExport";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Forma ve Malzeme" };

/** Dışa aktar penceresi için kayıtlı öğrenciler (sayı ve grup seçimi pencerede hesaplanır). */
function exportData(sensitive: boolean) {
  const { registrations, groups } = loadPanelData(new Date(), sensitive);
  return { registrations: registrations.filter((r) => r.status === "enrolled"), groups };
}

export default async function EquipmentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin("aidat.gor");
  const params = await searchParams;
  // ?durum=, ?sekme=bedenler (eski adres ?sekme=siparis) istemcide okunur · ?asama=teslim|tumu
  const initialStage = params.asama === "teslim" ? "open" : params.asama === "tumu" ? "all" : "to_order";
  const groupList = listAgeGroups();
  const groups = new Map(groupList.map((g) => [g.id, g.name]));
  const students = getDb()
    .select({ id: registrations.id, name: registrations.studentFullName, studentNo: registrations.studentNo, groupId: registrations.groupId, isGoalkeeper: registrations.isGoalkeeper })
    .from(registrations)
    .where(eq(registrations.status, "enrolled"))
    .all()
    .map((s) => ({ id: s.id, name: s.name, studentNo: s.studentNo, groupId: s.groupId, group: s.groupId ? (groups.get(s.groupId) ?? null) : null, isGoalkeeper: s.isGoalkeeper }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  return (
    <main className="panel-rise mx-auto w-full max-w-5xl px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-ink sm:text-[26px]">Forma ve Malzeme</h1>
          <p className="mt-1 max-w-2xl text-[15px] text-muted">Forma (forma, şort, tozluk) zorunlu, eşofman isteğe bağlı. Beden, parası ve teslimi buradan izlenir; tozluk formadan ayrı teslim edilir.</p>
        </div>
        {can(admin, "rapor.gor") ? <FormaExport {...exportData(can(admin, "hassas.gor"))} /> : null}
      </div>
      <EquipmentManager
        students={students}
        orders={listOrders()}
        items={listItems(true)}
        groups={groupList.map((g) => ({ id: g.id, name: g.name }))}
        canEdit={can(admin, "aidat.al")}
        initialStage={initialStage}
      />
    </main>
  );
}
