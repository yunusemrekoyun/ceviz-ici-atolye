import type { NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/auth/server";
import { attendanceXlsx, collectionXlsx } from "@/lib/reports";
import { defaultDateRange, validDateRange } from "@/lib/date-range";
import { todayKey } from "@/lib/billing";
import type { CashFilter } from "@/lib/cashbook-shared";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get("tur");
  const params = request.nextUrl.searchParams;
  const defaults = defaultDateRange(todayKey());
  const range = { from: params.get("from") ?? defaults.from, to: params.get("to") ?? defaults.to };
  // Kasa defteri aidat izniyle (Kasa sayfası), devam raporu rapor izniyle alınır.
  const denied = await requireAdminApi(request, kind === "tahsilat" ? "aidat.gor" : "rapor.gor");
  if (denied) return denied;
  const filterKind = params.get("odemeTuru") ?? "all";
  if (!validDateRange(range) || (kind !== "tahsilat" && kind !== "devam") || !["all", "cash", "eft", "aidat", "forma"].includes(filterKind)) return new Response("Geçersiz istek", { status: 400 });
  const filter: CashFilter = { kind: filterKind as CashFilter["kind"], query: params.get("q") ?? "", showVoided: params.get("iptal") === "1" };
  const buf = kind === "tahsilat" ? await collectionXlsx(range, filter) : await attendanceXlsx(range);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${kind === "tahsilat" ? "kasa" : kind}-${range.from}_${range.to}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
