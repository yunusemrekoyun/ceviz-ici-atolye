import type { NextRequest } from "next/server";
import { NO_STORE_HEADERS, jsonNoStore, logServerError } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth/server";
import { buildQrPng, QR_FILE_NAME } from "@/lib/qr";
import { getPublicFormUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * QR içeriği: SITE_URL/on-kayit. ?download=1 ile indirme, aksi halde inline gösterim.
 */
export async function GET(request: NextRequest) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;
  try {
    const png = await buildQrPng(getPublicFormUrl(request.headers));
    const download = request.nextUrl.searchParams.get("download") === "1";
    return new Response(new Uint8Array(png), {
      status: 200,
      headers: {
        ...NO_STORE_HEADERS,
        "Content-Type": "image/png",
        "Content-Length": String(png.byteLength),
        "Content-Disposition": download ? `attachment; filename="${QR_FILE_NAME}"` : `inline; filename="${QR_FILE_NAME}"`,
      },
    });
  } catch (err) {
    logServerError("qr", err);
    return jsonNoStore({ ok: false, formError: "QR kod oluşturulamadı." }, { status: 500 });
  }
}
