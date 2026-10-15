import { resolveDateRange } from "@/lib/date-range";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { can, requireAdmin } from "@/lib/auth/server";
import { todayKey } from "@/lib/billing";
import { studentInsights } from "@/lib/insights";
import { loadBillingView, loadPanelData } from "@/lib/panel-data";
import { RegistrationsView } from "../RegistrationsView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Öğrenciler" };

export default async function OgrencilerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin("kayit.gor");
  const params = await searchParams;
  const { ogrenci } = params;
  const range = resolveDateRange(params, todayKey());
  // Eski bağlantılar (?ogrenci=) öğrenci dosyasını açar.
  const selected = Number(ogrenci);
  if (Number.isInteger(selected) && selected > 0) redirect(`/admin/kayit/${selected}`);
  const { registrations, groups } = loadPanelData(new Date(), can(admin, "hassas.gor"));
  const billingView = loadBillingView(registrations, { view: can(admin, "aidat.gor"), collect: can(admin, "aidat.al") });
  // Hazır listeler (aidatı gelmeyen, forması eksik, az geliyor…) için öğrenci başına özet
  const insights = studentInsights(
    registrations.filter((r) => r.status === "enrolled").map((r) => r.id),
    todayKey(),
    { billing: can(admin, "aidat.gor") },
    range,
  );
  return (
    <RegistrationsView
      {...billingView}
      view="students"
      range={range}
      registrations={registrations}
      groups={groups}
      canEdit={can(admin, "kayit.duzenle")}
      insights={insights}
    />
  );
}
