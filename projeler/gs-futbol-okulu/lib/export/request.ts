import { resolveDateRange, dateRangeLabel } from "@/lib/date-range";
import { todayKey } from "@/lib/billing";
import { listAgeGroups } from "@/lib/age-groups-db";
import type { AgeGroup, Registration } from "@/lib/db/schema";
import { allowedColumns, resolveColumns, type ExportColumn } from "@/lib/export/columns";
import { extraRecords, type ExtraRecord } from "@/lib/export/extras";
import { filterRegistrations, parseExportFilter } from "@/lib/export/filter";
import { listRegistrations } from "@/lib/registrations";

export type PreparedExport = { rows: Registration[]; groups: AgeGroup[]; columns: ExportColumn[]; extras?: Map<number, ExtraRecord>; splitByGroup: boolean };

/**
 * "Dışa aktar" isteği (Excel ve PDF ortak): ?status=…&group=…&from=…&to=…&cols=…&split=grup | sira=grup.
 * Aidat / forma sütunları yalnız aidat izni olana.
 */
export function prepareExport(params: URLSearchParams, billing: boolean): PreparedExport {
  const groups = listAgeGroups();
  const rows = filterRegistrations(listRegistrations(), groups, parseExportFilter(params));
  const columns = allowedColumns(resolveColumns(params.get("cols")?.split(",")), billing).map(c => ({ ...c }));
  const splitByGroup = params.get("split") === "grup";
  // Grup listelerinde (ayrı sayfa ya da ?sira=grup) önce grup sırası, sonra ad
  if (splitByGroup || params.get("sira") === "grup") {
    const rank = new Map(groups.map((g, i) => [g.id, i]));
    rows.sort((a, b) => (rank.get(a.groupId ?? -1) ?? 999) - (rank.get(b.groupId ?? -1) ?? 999) || a.studentFullName.localeCompare(b.studentFullName, "tr"));
  }
  const range = resolveDateRange({ from: params.get("devamFrom") ?? params.get("from"), to: params.get("devamTo") ?? params.get("to") }, todayKey());
  for (const c of columns) if (["attendanceRate", "attended", "missed", "paidTotal"].includes(c.key)) c.header = `${c.header} · ${dateRangeLabel(range)}`;
  const extras = columns.some((c) => c.computed) ? extraRecords(rows, { billing, range }) : undefined;
  return { rows, groups, columns, extras, splitByGroup };
}
