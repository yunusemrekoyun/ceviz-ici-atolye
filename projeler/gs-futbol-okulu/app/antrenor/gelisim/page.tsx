import type { Metadata } from "next";
import { requirePortal } from "@/lib/auth/server";
import { listAgeGroups } from "@/lib/age-groups-db";
import { todayKey } from "@/lib/billing";
import { groupScope } from "@/lib/scan";
import { DevelopmentEntry } from "@/components/staff/DevelopmentEntry";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gelişim" };

export default async function CoachDevelopment() {
  const user = await requirePortal("coach", "gelisim.gir");
  const scope = groupScope(user);
  const groups = listAgeGroups()
    .filter((g) => scope === null || scope.includes(g.id))
    .map(({ id, name }) => ({ id, name }));
  return (
    <div>
      <h1 className="mb-1 text-2xl font-black text-ink">Gelişim girişi</h1>
      <p className="mb-4 text-muted">Ölçüm, test ve değerlendirme. Veliler grafiğini görür.</p>
      <DevelopmentEntry groups={groups} today={todayKey()} />
    </div>
  );
}
