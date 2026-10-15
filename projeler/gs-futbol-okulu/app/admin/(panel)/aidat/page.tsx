import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { can, requireAdmin } from "@/lib/auth/server";
import { accessMap, ensurePeriodsToday, listClaims, listPayments, todayKey } from "@/lib/billing";
import { getDb } from "@/lib/db";
import { registrations } from "@/lib/db/schema";
import { listAgeGroups } from "@/lib/age-groups-db";
import { resolveContactParent } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { discountedFee } from "@/lib/billing-shared";
import { ensureSessionsWindow, sessionsOn } from "@/lib/program";
import { resolveDateRange, withDateRange } from "@/lib/date-range";
import { AidatView, type AidatStudent } from "./AidatView";


export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Aidat" };

export default async function AidatPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin("aidat.gor");
  const params = await searchParams;
  // Ödemeler artık gün gün Kasa sayfasında.
  if (params.sekme === "odemeler") redirect(withDateRange("/admin/kasa", resolveDateRange(params, todayKey())));
  ensurePeriodsToday();
  const today = todayKey();
  const settings = getSettings();
  const groupList = listAgeGroups();
  const groups = new Map(groupList.map((g) => [g.id, g.name]));
  ensureSessionsWindow();
  const todayGroupIds = [...new Set(sessionsOn(today).map((x) => x.groupId))].filter((id): id is number => typeof id === "number");
  const enrolled = getDb().select().from(registrations).where(eq(registrations.status, "enrolled")).all();
  const access = accessMap(enrolled, today);
  const students: AidatStudent[] = enrolled
    .map((r) => {
      const contact = resolveContactParent(r);
      return {
        id: r.id,
        name: r.studentFullName,
        studentNo: r.studentNo,
        groupId: r.groupId,
        group: r.groupId ? (groups.get(r.groupId) ?? null) : null,
        parentName: contact.fullName,
        phone: contact.phone,
        billingDay: r.billingDay,
        feeKurus: discountedFee(settings.feeAmountKurus, r.discountPercent),
        discount: r.discountName && r.discountPercent ? `${r.discountName} %${r.discountPercent}` : null,
        access: access.get(r.id)!,
        note: r.adminNote,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const range = resolveDateRange(params, today);
  const collectedInRange = listPayments({ ...range, limit: -1 })
    .filter((p) => !p.voidedAt)
    .reduce((s, p) => s + p.amountKurus, 0);
  const initial = Number(typeof params.ogrenci === "string" ? params.ogrenci : NaN);
  // Eski bağlantılar (?ogrenci=) artık öğrenci dosyasının aidat bölümünü açar.
  if (Number.isInteger(initial) && initial > 0 && can(admin, "kayit.gor")) redirect(`/admin/kayit/${initial}#aidat`);
  return (
    <AidatView
      today={today}
      feeKurus={settings.feeAmountKurus}
      graceDays={settings.graceDays}
      students={students}
      claims={listClaims("pending")}
      range={range}
      collectedInRange={collectedInRange}
      canCollect={can(admin, "aidat.al")}
      canOverride={can(admin, "erisim.ac")}
      canSettings={can(admin, "ayar.yonet")}
      canOpenFile={can(admin, "kayit.gor")}
      canNote={can(admin, "kayit.duzenle")}
      initialStudentId={Number.isInteger(initial) && initial > 0 ? initial : null}
      initialTab={params.sekme === "onay" ? "claims" : "students"}
      focusSearch={params.ara === "1"}
      groups={groupList.map((g) => ({ id: g.id, name: g.name }))}
      todayGroupIds={todayGroupIds}
    />
  );
}
