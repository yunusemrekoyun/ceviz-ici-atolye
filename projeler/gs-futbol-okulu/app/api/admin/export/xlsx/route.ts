import type { NextRequest } from "next/server";
import { NO_STORE_HEADERS, jsonNoStore, logServerError } from "@/lib/api";
import { can, getCurrentAdmin, requireAdminApi } from "@/lib/auth/server";
import { validExportDates } from "@/lib/export/filter";
import { prepareExport } from "@/lib/export/request";
import { buildRegistrationsXlsx, buildXlsxFileName } from "@/lib/export/xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Excel export: dosya diske yazılmaz, bellekte üretilip doğrudan yanıt olarak döner.
 * Opsiyonel filtreler: ?status=pending,scheduled&group=1,none&from=YYYY-MM-DD&to=YYYY-MM-DD&cols=studentFullName,age
 * &split=grup (her grup ayrı sayfa) &sira=grup. Aidat / forma sütunları yalnız aidat izni olana.
 */
export async function GET(request: NextRequest) {
  const denied = await requireAdminApi(request, "rapor.gor");
  if (denied) return denied;
  if (!validExportDates(request.nextUrl.searchParams)) return jsonNoStore({ ok: false, formError: "Geçerli bir başlangıç ve bitiş tarihi seçin." }, { status: 400 });
  try {
    const admin = await getCurrentAdmin();
    const { rows, groups, columns, extras, splitByGroup } = prepareExport(request.nextUrl.searchParams, can(admin, "aidat.gor"));
    const buffer = await buildRegistrationsXlsx(rows, groups, columns, { extras, splitByGroup });
    const fileName = buildXlsxFileName();
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        ...NO_STORE_HEADERS,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (err) {
    logServerError("export xlsx", err);
    return jsonNoStore({ ok: false, formError: "Excel dosyası oluşturulamadı." }, { status: 500 });
  }
}
