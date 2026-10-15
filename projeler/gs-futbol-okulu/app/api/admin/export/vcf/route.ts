import { NO_STORE_HEADERS, jsonNoStore, logServerError } from "@/lib/api";
import { buildRegistrationsVcf, VCF_FILE_NAME } from "@/lib/export/vcf";
import { requireAdminApi } from "@/lib/auth/server";
import { listRegistrations } from "@/lib/registrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Apple Contacts uyumlu vCard 3.0 export (UTF-8), bellekte üretilir. */
export async function GET(request: Request) {
  const denied = await requireAdminApi(request, "rapor.gor");
  if (denied) return denied;
  try {
    const vcf = buildRegistrationsVcf(listRegistrations());
    const bytes = new TextEncoder().encode(vcf);
    return new Response(bytes, {
      status: 200,
      headers: {
        ...NO_STORE_HEADERS,
        "Content-Type": "text/vcard; charset=utf-8",
        "Content-Disposition": `attachment; filename="${VCF_FILE_NAME}"`,
        "Content-Length": String(bytes.byteLength),
      },
    });
  } catch (err) {
    logServerError("export vcf", err);
    return jsonNoStore({ ok: false, formError: "VCF dosyası oluşturulamadı." }, { status: 500 });
  }
}
