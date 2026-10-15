import type { Metadata } from "next";
import { headers } from "next/headers";
import { getPublicFormUrl } from "@/lib/site-url";
import { can, requireAdmin } from "@/lib/auth/server";
import { loadBillingView, loadPanelData } from "@/lib/panel-data";
import { RegistrationsView } from "../RegistrationsView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Başvurular" };

export default async function OnKayitlarPage() {
  const admin = await requireAdmin("kayit.gor");
  const { registrations, groups } = loadPanelData(new Date(), can(admin, "hassas.gor"));
  const publicFormUrl = getPublicFormUrl(await headers());
  const billingView = loadBillingView(registrations, { view: can(admin, "aidat.gor"), collect: can(admin, "aidat.al") });
  return <RegistrationsView {...billingView} view="registrations" registrations={registrations} groups={groups} canEdit={can(admin, "kayit.duzenle")} publicFormUrl={publicFormUrl} />;
}
