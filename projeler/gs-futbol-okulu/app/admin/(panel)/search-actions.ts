"use server";

import { toRegistrationDto } from "@/lib/api";
import { listAgeGroups } from "@/lib/age-groups-db";
import { can, getCurrentAdmin } from "@/lib/auth/server";
import { formatPhone } from "@/lib/phone";
import { statusLabel } from "@/lib/registration-status";
import { listRegistrations } from "@/lib/registrations";
import { matchesSearch, normalizeForSearch } from "@/lib/search";

export type SearchHit = { id: number; name: string; status: string; statusLabel: string; meta: string; photoId: number | null };

const ORDER: Record<string, number> = { enrolled: 0, scheduled: 1, pending: 2, no_show: 3, left: 4, cancelled: 5 };

/** Üst çubuktaki genel arama: ad, veli adı, telefon, öğrenci no (TC yalnız hassas bilgi izniyle). */
export async function searchAction(raw: string): Promise<SearchHit[]> {
  const admin = await getCurrentAdmin();
  if (!admin || !can(admin, "kayit.gor") || typeof raw !== "string") return [];
  const query = raw.slice(0, 60).trim();
  if (query.length < 2) return [];
  const q = normalizeForSearch(query);
  const sensitive = can(admin, "hassas.gor");
  const groups = new Map(listAgeGroups().map((g) => [g.id, g.name]));
  const now = new Date();
  return listRegistrations()
    .map((r) => toRegistrationDto(sensitive ? r : { ...r, studentTc: null }, now))
    .filter((r) => matchesSearch(r, query))
    .map((r) => ({ r, starts: normalizeForSearch(r.studentFullName).startsWith(q) ? 0 : 1 }))
    .sort((a, b) => a.starts - b.starts || (ORDER[a.r.status] ?? 9) - (ORDER[b.r.status] ?? 9) || a.r.studentFullName.localeCompare(b.r.studentFullName, "tr"))
    .slice(0, 8)
    .map(({ r }) => ({
      id: r.id,
      name: r.studentFullName,
      status: r.status,
      statusLabel: statusLabel(r.status),
      photoId: r.photoFileId ?? null,
      meta: [r.studentNo ? `No ${r.studentNo}` : null, r.groupId ? groups.get(r.groupId) : null, r.contact.fullName || null, r.contact.phone ? formatPhone(r.contact.phone) : null].filter(Boolean).join(" · "),
    }));
}
