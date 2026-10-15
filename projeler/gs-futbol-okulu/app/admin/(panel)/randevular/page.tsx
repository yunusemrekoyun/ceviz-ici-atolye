import type { Metadata } from "next";
import { can, requireAdmin } from "@/lib/auth/server";
import { loadBillingView, loadPanelData } from "@/lib/panel-data";
import { RegistrationsView } from "../RegistrationsView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Randevular" };

export default async function RandevularPage() {
  const admin = await requireAdmin("kayit.gor");
  const { registrations, groups } = loadPanelData(new Date(), can(admin, "hassas.gor"));
  const billingView = loadBillingView(registrations, { view: can(admin, "aidat.gor"), collect: can(admin, "aidat.al") });
  return <RegistrationsView {...billingView} view="appointments" registrations={registrations} groups={groups} canEdit={can(admin, "kayit.duzenle")} />;
}
