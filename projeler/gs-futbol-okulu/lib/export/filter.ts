import { isDateKey } from "@/lib/date-range";
import type { Registration } from "@/lib/db/schema";
import { effectiveGroup, type AgeGroupView } from "@/lib/age-groups";
import { istanbulDayKey } from "@/lib/format";
import { isRegistrationStatus } from "@/lib/registration-status";

export type ExportFilter = {
  statuses: string[] | null;
  /** Grup id'leri; "none" = grup dışı/grupsuz. */
  groups: string[] | null;
  /** Başvuru / okula kayıt tarihi aralığı (İstanbul günü, dahil). */
  from: string | null;
  to: string | null;
  dateField?: "created" | "enrolled" | "none";
  /** Belirli kayıtlar (ör. öğrenci listesinde süzülenler). */
  ids: number[] | null;
};

function list(value: string | null): string[] | null {
  const items = (value ?? "").split(",").map((v) => v.trim()).filter(Boolean);
  return items.length > 0 ? items : null;
}

export function parseExportFilter(params: URLSearchParams): ExportFilter {
  const from = params.get("from");
  const to = params.get("to");
  return {
    statuses: list(params.get("status"))?.filter(isRegistrationStatus) ?? null,
    groups: list(params.get("group"))?.filter((g) => g === "none" || /^\d+$/.test(g)) ?? null,
    from: isDateKey(from) ? from : null,
    to: isDateKey(to) ? to : null,
    dateField: params.get("dateField") === "enrolled" ? "enrolled" : params.get("dateField") === "none" ? "none" : "created",
    ids:
      list(params.get("ids"))
        ?.map(Number)
        .filter((n) => Number.isInteger(n) && n > 0) ?? null,
  };
}

/** İki tarih filtresi de isteğe bağlıdır; doluysa gerçek gün ve sıralı aralık gerekir. */
export function validExportDates(params: URLSearchParams): boolean {
  return [["from", "to"], ["devamFrom", "devamTo"]].every(([start, end]) => {
    const from = params.get(start!);
    const to = params.get(end!);
    return (!from || isDateKey(from)) && (!to || isDateKey(to)) && (!from || !to || from <= to);
  });
}

/** Panelle aynı kural: öğrencide atanmış grup, diğerlerinde doğum yılına göre önerilen grup. */
export function filterRegistrations<T extends Registration>(rows: T[], groups: AgeGroupView[], f: ExportFilter): T[] {
  const ids = f.ids ? new Set(f.ids) : null;
  return rows.filter((r) => {
    if (ids && !ids.has(r.id)) return false;
    if (f.statuses && !f.statuses.includes(r.status)) return false;
    if (f.groups) {
      const groupId = effectiveGroup(r, groups).group?.id ?? null;
      if (!f.groups.includes(groupId === null ? "none" : String(groupId))) return false;
    }
    if (f.dateField !== "none" && (f.from || f.to)) {
      const at = f.dateField === "enrolled" ? r.enrolledAt : r.createdAt;
      if (!at) return false;
      const day = istanbulDayKey(at);
      if (f.from && day < f.from) return false;
      if (f.to && day > f.to) return false;
    }
    return true;
  });
}
