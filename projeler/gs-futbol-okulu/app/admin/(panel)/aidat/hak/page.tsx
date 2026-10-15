import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { can, requireAdmin } from "@/lib/auth/server";
import { listAgeGroups } from "@/lib/age-groups-db";
import { accessMap, ensurePeriodsToday, rightsInfo, todayKey } from "@/lib/billing";
import { discountedFee } from "@/lib/billing-shared";
import { getDb } from "@/lib/db";
import { registrations } from "@/lib/db/schema";
import { resolveContactParent } from "@/lib/format";
import { ensureSessionsWindow } from "@/lib/program";
import { getSettings } from "@/lib/settings";
import { upcomingSessionDates } from "@/lib/training-rights";
import { RightsEntry, type RightsStudent } from "./RightsEntry";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Hak girişi" };

/**
 * Elle hak girişi: kağıttaki listeye bakarak her öğrencinin kalan antrenman hakkı grup grup girilir.
 * Öğrenciler yoklama listesindeki gibi ada göre sıralı.
 */
export default async function RightsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin("aidat.al");
  const { grup, ogrenci } = await searchParams;
  ensurePeriodsToday();
  ensureSessionsWindow();
  const today = todayKey();
  const fee = getSettings().feeAmountKurus;
  const groups = listAgeGroups();
  const enrolled = getDb().select().from(registrations).where(eq(registrations.status, "enrolled")).all();
  const count = (id: number | null) => enrolled.filter((r) => (r.groupId ?? null) === id).length;
  // 0 = grupsuz öğrenciler
  const options = [...groups.map((g) => ({ id: g.id, name: g.name, count: count(g.id) })), ...(count(null) ? [{ id: 0, name: "Grupsuz", count: count(null) }] : [])];
  // Öğrenci dosyasından gelindiyse o öğrencinin grubu açılır
  const fromStudent = enrolled.find((r) => r.id === Number(ogrenci));
  const asked = fromStudent ? (fromStudent.groupId ?? 0) : Number(grup);
  const selected = options.find((o) => o.id === asked) ?? options.find((o) => o.count > 0) ?? options[0] ?? null;
  const groupId = selected && selected.id !== 0 ? selected.id : null;

  const list = selected ? enrolled.filter((r) => (r.groupId ?? null) === groupId).sort((a, b) => a.studentFullName.localeCompare(b.studentFullName, "tr")) : [];
  const access = accessMap(list, today);
  const info = rightsInfo(
    list.map((r) => r.id),
    today,
  );
  const students: RightsStudent[] = list.map((r) => {
    const contact = resolveContactParent(r);
    const i = info.get(r.id)!;
    return {
      id: r.id,
      name: r.studentFullName,
      studentNo: r.studentNo,
      parentName: contact.fullName,
      phone: contact.phone,
      feeKurus: discountedFee(fee, r.discountPercent),
      access: access.get(r.id)!,
      hasPaid: i.hasPaid,
      ahead: i.ahead,
      lastPaidOn: i.lastPaidOn,
    };
  });

  return (
    <RightsEntry
      key={selected?.id ?? "none"}
      today={today}
      groups={options}
      groupId={selected?.id ?? null}
      students={students}
      upcoming={selected ? upcomingSessionDates(groupId, today, 40) : []}
      canCollect={can(admin, "aidat.al")}
      canOpenFile={can(admin, "kayit.gor")}
      focusId={fromStudent?.id ?? null}
    />
  );
}
