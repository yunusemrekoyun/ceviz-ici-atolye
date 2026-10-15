import { issuesOf } from "@/lib/data-issues";
import { loadPanelData } from "@/lib/panel-data";

/** Menüdeki "Veri kontrolü" rozeti: düzeltilmesi gereken (bozuk ya da tekrar) bilgisi olan kayıt sayısı. */
export function issueCount(sensitive: boolean): number {
  const { registrations } = loadPanelData(new Date(), sensitive);
  return registrations.filter((r) => issuesOf(r).some((i) => i.severity !== "info")).length;
}
