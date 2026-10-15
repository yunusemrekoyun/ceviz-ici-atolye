import { bodyTooLarge, jsonNoStore, logServerError, toRegistrationDto } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { getCurrentAdmin, getRequestMeta, requireAdminApi } from "@/lib/auth/server";
import { DUPLICATE_MESSAGE } from "@/lib/constants";
import { createRegistrationAdmin, DuplicateStudentError, listRegistrations } from "@/lib/registrations";
import { coerceFormValues, validateRegistrationAdmin } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin: tüm kayıtları listeler. */
export async function GET(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;
  try {
    const now = new Date();
    const rows = listRegistrations().map((r) => toRegistrationDto(r, now));
    return jsonNoStore({ ok: true, count: rows.length, registrations: rows });
  } catch (err) {
    logServerError("admin registrations GET", err);
    return jsonNoStore({ ok: false, formError: "Kayıtlar okunamadı." }, { status: 500 });
  }
}

/** Admin: elle yeni kayıt (eksik bilgiye izin verir). */
export async function POST(request: Request) {
  const denied = await requireAdminApi(request, "kayit.duzenle");
  if (denied) return denied;
  if (bodyTooLarge(request.headers)) return jsonNoStore({ ok: false, formError: "Gönderilen veri çok büyük." }, { status: 413 });
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonNoStore({ ok: false, formError: "Geçersiz istek." }, { status: 400 });
  }
  const result = validateRegistrationAdmin(coerceFormValues(payload));
  if (!result.success) return jsonNoStore({ ok: false, errors: result.errors, formError: result.formError }, { status: 422 });
  try {
    const created = createRegistrationAdmin(result.data);
    const admin = await getCurrentAdmin();
    if (admin)
      writeAudit(
        { id: admin.id, fullName: admin.fullName, username: admin.username, ip: (await getRequestMeta()).ip },
        { action: "kayit.elle-ekle", entity: "registration", entityId: created.id, summary: `${created.studentFullName}: panelden eklendi` },
      );
    return jsonNoStore({ ok: true, registration: toRegistrationDto(created) }, { status: 201 });
  } catch (err) {
    if (err instanceof DuplicateStudentError) return jsonNoStore({ ok: false, formError: DUPLICATE_MESSAGE, errors: { studentTc: DUPLICATE_MESSAGE } }, { status: 409 });
    logServerError("admin registration POST", err);
    return jsonNoStore({ ok: false, formError: "Kayıt eklenemedi." }, { status: 500 });
  }
}
