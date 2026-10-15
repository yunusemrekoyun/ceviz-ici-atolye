import type { NextRequest } from "next/server";
import { NO_STORE_HEADERS, jsonNoStore, logServerError } from "@/lib/api";
import { can, getCurrentAdmin, requireAdminApi } from "@/lib/auth/server";
import { todayKey } from "@/lib/billing";
import { validExportDates } from "@/lib/export/filter";
import { prepareExport } from "@/lib/export/request";
import { listPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TITLES = { forma: "Forma listesi", ogrenci: "Öğrenci listesi", kayit: "Kayıt listesi" } as const;

/**
 * "Dışa aktar"ın PDF'i: Excel ile aynı süzgeç ve sütunlar (?status, group, from, to, cols, split | sira) + &baslik=forma|ogrenci|kayit.
 * Tarayıcıda açılır; telefonda Paylaş → WhatsApp.
 */
export async function GET(request: NextRequest) {
  const denied = await requireAdminApi(request, "rapor.gor");
  if (denied) return denied;
  if (!validExportDates(request.nextUrl.searchParams)) return jsonNoStore({ ok: false, formError: "Geçerli bir başlangıç ve bitiş tarihi seçin." }, { status: 400 });
  try {
    const params = request.nextUrl.searchParams;
    const admin = await getCurrentAdmin();
    const data = prepareExport(params, can(admin, "aidat.gor"));
    const key = params.get("baslik");
    const title = key && key in TITLES ? TITLES[key as keyof typeof TITLES] : TITLES.kayit;
    const today = todayKey();
    const buffer = await listPdf(data, title, today);
    const fileName = `${key && key in TITLES ? key : "kayit"}-listesi-${today}.pdf`;
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        ...NO_STORE_HEADERS,
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (err) {
    logServerError("export pdf", err);
    return jsonNoStore({ ok: false, formError: "PDF oluşturulamadı." }, { status: 500 });
  }
}
