import { defaultDateRange, validDateRange } from "@/lib/date-range";
import type { NextRequest } from "next/server";
import { jsonNoStore, logServerError, NO_STORE_HEADERS } from "@/lib/api";
import { can, getCurrentAdmin } from "@/lib/auth/server";
import { todayKey } from "@/lib/billing";
import { addDaysTo } from "@/lib/dates";
import { ROSTER_PRESETS, type RosterPreset } from "@/lib/output-options";
import { attendanceSheetPdf, kitSheetPdf, programPdf, rosterPdf } from "@/lib/pdf";
import { kitSheetXlsx } from "@/lib/export/kit-sheet";
import { ensureSessionsWindow, sessionsOn } from "@/lib/program";
import { attendanceSheetsXlsx, programXlsx } from "@/lib/program-sheets";
import { listRegistrations } from "@/lib/registrations";
import { listAgeGroups } from "@/lib/age-groups-db";
import { attendanceListXlsx } from "@/lib/export/attendance-list";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Çıktılar (PDF ya da Excel):
 *   ?tur=program&bicim=pdf|xlsx                         haftalık antrenman programı (her personel)
 *   ?tur=liste&liste=antrenor|iletisim|aidat|tam&grup=…  grup listeleri, PDF (öğrenci görme izni)
 *   ?tur=yoklama&from=YYYY-MM-DD&to=YYYY-MM-DD&grup=…&isaret=1&bicim=…      yoklama kağıdı (yoklama ya da öğrenci görme izni)
 *   ?tur=yoklama-listesi&grup=…                          okulun yoklama listesi şablonu, Excel (öğrenci görme izni)
 *   ?tur=forma&asama=siparis|teslim|tumu&grup=…&bicim=…  forma sipariş / beden listesi, tek grup ya da hepsi (aidat görme izni)
 * grup: "all" | "bugun" | "yarin" | virgülle kimlikler. PDF tarayıcıda açılır (telefonda paylaş → WhatsApp).
 */
export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return jsonNoStore({ ok: false, formError: "Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın." }, { status: 401 });
  const p = request.nextUrl.searchParams;
  const tur = p.get("tur");
  const xlsx = p.get("bicim") === "xlsx";
  const today = todayKey();
  const deny = () => jsonNoStore({ ok: false, formError: "Bu çıktı için yetkiniz yok." }, { status: 403 });
  try {
    if (tur === "program") return file(xlsx ? await programXlsx(today) : await programPdf(today), `antrenman-programi-${today}`, xlsx);

    if (tur === "forma") {
      if (!can(admin, "aidat.gor")) return deny();
      const asama = p.get("asama");
      const stage = asama === "teslim" ? "open" : asama === "tumu" ? "all" : "to_order";
      const groupId = Number(p.get("grup"));
      const group = Number.isInteger(groupId) && groupId > 0 ? (listAgeGroups().find((g) => g.id === groupId) ?? null) : null;
      const name = `${{ to_order: "forma-siparis", open: "forma-teslim-edilmeyen", all: "forma-bedenleri" }[stage]}${group ? `-${slug(group.name)}` : ""}`;
      return file(xlsx ? await kitSheetXlsx(stage, today, group?.id ?? null) : await kitSheetPdf(stage, today, group?.id ?? null), `${name}-${today}`, xlsx);
    }

    const groupIds = resolveGroups(p.get("grup"), today);
    if (tur === "liste") {
      if (!can(admin, "kayit.gor")) return deny();
      const raw = p.get("liste");
      const preset: RosterPreset = ROSTER_PRESETS.some((x) => x.key === raw) ? (raw as RosterPreset) : "antrenor";
      return file(await rosterPdf(listRegistrations(), { groupIds, preset, billing: can(admin, "aidat.gor"), today }), `grup-listesi-${today}`, false);
    }
    if (tur === "yoklama-listesi") {
      // Okulun kendi yoklama listesi şablonu (Excel), her grup ayrı sayfa
      if (!can(admin, "kayit.gor")) return deny();
      const single = groupIds?.length === 1 ? listAgeGroups().find((g) => g.id === groupIds[0])?.name : null;
      return file(await attendanceListXlsx(groupIds, today), `yoklama-listesi-${single ? slug(single) : today}`, true);
    }
    if (tur === "yoklama") {
      if (!can(admin, "yoklama.al") && !can(admin, "kayit.gor")) return deny();
      const defaults = defaultDateRange(today);
      const range = { from: p.get("from") ?? defaults.from, to: p.get("to") ?? defaults.to };
      if (!validDateRange(range)) return jsonNoStore({ ok: false, formError: "Geçerli bir başlangıç ve bitiş tarihi seçin." }, { status: 400 });
      const marks = p.get("isaret") !== "0";
      return file(xlsx ? await attendanceSheetsXlsx(range, groupIds, marks) : await attendanceSheetPdf(range, groupIds, marks, today), `yoklama-${range.from}_${range.to}`, xlsx);
    }
    return jsonNoStore({ ok: false, formError: "Geçersiz istek." }, { status: 400 });
  } catch (err) {
    logServerError("cikti", err);
    return jsonNoStore({ ok: false, formError: "Çıktı oluşturulamadı." }, { status: 500 });
  }
}

/** "all" → null (tüm gruplar); "bugun" / "yarin" → o gün antrenmanı olan gruplar. */
function resolveGroups(raw: string | null, today: string): number[] | null {
  if (!raw || raw === "all") return null;
  if (raw === "bugun" || raw === "yarin") {
    ensureSessionsWindow();
    return [...new Set(sessionsOn(raw === "bugun" ? today : addDaysTo(today, 1)).map((s) => s.groupId))];
  }
  const ids = raw
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  return ids.length ? ids : null;
}

function file(buffer: Buffer, name: string, xlsx: boolean): Response {
  const fileName = `${name}.${xlsx ? "xlsx" : "pdf"}`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      ...NO_STORE_HEADERS,
      "Content-Type": xlsx ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf",
      // PDF tarayıcıda açılır (yazdır / paylaş); Excel iner
      "Content-Disposition": `${xlsx ? "attachment" : "inline"}; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Content-Length": String(buffer.byteLength),
    },
  });
}

/** Dosya adı için: "19-22" → "19-22", "1. Grup" → "1-grup". */
function slug(name: string): string {
  return (
    name
      .toLocaleLowerCase("tr-TR")
      .replace(/ı/g, "i")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "grup"
  );
}
