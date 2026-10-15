import type { Metadata } from "next";
import { can, requireAdmin } from "@/lib/auth/server";
import { todayKey } from "@/lib/billing";
import { cashEntries } from "@/lib/cashbook";
import { resolveDateRange } from "@/lib/date-range";
import { Page, PageHeader } from "@/components/admin/kit";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { KasaView } from "./KasaView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Kasa" };

export default async function KasaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin("aidat.gor");
  const params = await searchParams;
  const today = todayKey();
  const range = resolveDateRange(params, today);

  return (
    <Page>
      <PageHeader title="Kasa" description="Hangi gün ne kadar para aldık: aidat ve forma, nakit ve havale ayrı." />
      <DateRangeFilter range={range} today={today} />
      <KasaView
        key={`${range.from}:${range.to}`}
        entries={cashEntries(range.from, range.to)}
        today={today}
        range={range}
        canCollect={can(admin, "aidat.al")}
        canOpenFile={can(admin, "kayit.gor")}
      />
    </Page>
  );
}
