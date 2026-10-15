import { defaultDateRange, validDateRange } from "@/lib/date-range";
import type { NextRequest } from "next/server";
import { jsonNoStore, logServerError, NO_STORE_HEADERS } from "@/lib/api";
import { can, getCurrentUser } from "@/lib/auth/server";
import { listAgeGroups } from "@/lib/age-groups-db";
import { todayKey } from "@/lib/billing";
import { attendanceListXlsx } from "@/lib/export/attendance-list";
import { attendanceSheetPdf, programPdf } from "@/lib/pdf";
import { groupScope } from "@/lib/scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Antrenörün çıktıları, yalnız kendi grupları:
 *   ?tur=yoklama&grup=ID&from=YYYY-MM-DD&to=YYYY-MM-DD   yoklama kağıdı (PDF, tarayıcıda açılır; yazdır ya da WhatsApp'la paylaş)
 *   ?tur=liste&grup=ID                okulun yoklama listesi şablonu (Excel)
 *   ?tur=program                      haftalık antrenman programı (PDF)
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.portal !== "coach") return jsonNoStore({ ok: false, formError: "Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın." }, { status: 401 });
  const p = request.nextUrl.searchParams;
  const today = todayKey();
  const scope = groupScope(user);
  const deny = () => jsonNoStore({ ok: false, formError: "Bu grup size atanmamış." }, { status: 403 });
  try {
    const tur = p.get("tur");
    if (tur === "program") return file(await programPdf(today), `antrenman-programi-${today}`, false);
    const groupId = Number(p.get("grup"));
    const group = listAgeGroups().find((g) => g.id === groupId);
    if (!group) return jsonNoStore({ ok: false, formError: "Grup bulunamadı." }, { status: 404 });
    if (scope !== null && !scope.includes(group.id)) return deny();
    if (tur === "yoklama") {
      if (!can(user, "yoklama.al")) return deny();
      const defaults = defaultDateRange(today);
      const range = { from: p.get("from") ?? defaults.from, to: p.get("to") ?? defaults.to };
      if (!validDateRange(range)) return jsonNoStore({ ok: false, formError: "Geçerli bir başlangıç ve bitiş tarihi seçin." }, { status: 400 });
      return file(await attendanceSheetPdf(range, [group.id], true, today), `yoklama-${range.from}_${range.to}`, false);
    }
    if (tur === "liste") return file(await attendanceListXlsx([group.id], today), `yoklama-listesi-${today}`, true);
    return jsonNoStore({ ok: false, formError: "Geçersiz istek." }, { status: 400 });
  } catch (err) {
    logServerError("antrenor-cikti", err);
    return jsonNoStore({ ok: false, formError: "Çıktı oluşturulamadı." }, { status: 500 });
  }
}

function file(buffer: Buffer, name: string, xlsx: boolean): Response {
  const fileName = `${name}.${xlsx ? "xlsx" : "pdf"}`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      ...NO_STORE_HEADERS,
      "Content-Type": xlsx ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf",
      "Content-Disposition": `${xlsx ? "attachment" : "inline"}; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Content-Length": String(buffer.byteLength),
    },
  });
}
