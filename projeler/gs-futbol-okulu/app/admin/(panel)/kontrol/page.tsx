import type { Metadata } from "next";
import { can, requireAdmin } from "@/lib/auth/server";
import { loadPanelData } from "@/lib/panel-data";
import { DataCheckView } from "./DataCheckView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Veri kontrolü" };

export default async function DataCheckPage() {
  const admin = await requireAdmin("kayit.gor");
  const { registrations } = loadPanelData(new Date(), can(admin, "hassas.gor"));
  return <DataCheckView registrations={registrations} canEdit={can(admin, "kayit.duzenle")} />;
}
