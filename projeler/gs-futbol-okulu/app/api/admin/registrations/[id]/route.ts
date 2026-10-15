import type { NextRequest } from "next/server";
import { DUPLICATE_MESSAGE } from "@/lib/constants";
import { bodyTooLarge, jsonNoStore, logServerError, parseIdParam, toRegistrationDto } from "@/lib/api";
import {
  deleteRegistration,
  DuplicateStudentError,
  getRegistration,
  keepSensitiveFields,
  RegistrationNotFoundError,
  RegistrationStateError,
  updateRegistrationAdmin,
} from "@/lib/registrations";
import { can, getCurrentAdmin, getRequestMeta, requireAdminApi } from "@/lib/auth/server";
import { writeAudit } from "@/lib/audit";
import { coerceFormValues, validateRegistrationAdmin } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/admin/registrations/[id]">;

const notFound = () => jsonNoStore({ ok: false, formError: "Kayıt bulunamadı." }, { status: 404 });

export async function GET(request: NextRequest, ctx: Ctx) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;
  const id = parseIdParam((await ctx.params).id);
  if (id === null) return notFound();
  const reg = getRegistration(id);
  if (!reg) return notFound();
  return jsonNoStore({ ok: true, registration: toRegistrationDto(reg) });
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const denied = await requireAdminApi(request, "kayit.duzenle");
  if (denied) return denied;
  const id = parseIdParam((await ctx.params).id);
  if (id === null) return notFound();

  if (bodyTooLarge(request.headers)) {
    return jsonNoStore({ ok: false, formError: "Gönderilen veri çok büyük." }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonNoStore({ ok: false, formError: "Geçersiz istek." }, { status: 400 });
  }

  // Panelden düzenlemede eksik bilgi kaydı engellemez; doldurulan alanlar biçim kontrolünden geçer.
  const result = validateRegistrationAdmin(coerceFormValues(payload));
  if (!result.success) {
    return jsonNoStore(
      { ok: false, errors: result.errors, formError: result.formError ?? "Lütfen işaretli alanları kontrol ediniz." },
      { status: 422 },
    );
  }

  try {
    const admin = await getCurrentAdmin();
    const data = can(admin, "hassas.gor") ? result.data : keepSensitiveFields(result.data, getRegistration(id));
    const updated = updateRegistrationAdmin(id, data);
    if (admin) {
      writeAudit(
        { id: admin.id, fullName: admin.fullName, username: admin.username, ip: (await getRequestMeta()).ip },
        { action: "kayit.duzenle", entity: "registration", entityId: id, summary: `${updated.studentFullName}: bilgiler düzenlendi` },
      );
    }
    return jsonNoStore({ ok: true, registration: toRegistrationDto(updated) });
  } catch (err) {
    if (err instanceof RegistrationNotFoundError) return notFound();
    if (err instanceof DuplicateStudentError) {
      return jsonNoStore(
        { ok: false, formError: DUPLICATE_MESSAGE, errors: { studentTc: DUPLICATE_MESSAGE } },
        { status: 409 },
      );
    }
    logServerError("admin registration PATCH", err);
    return jsonNoStore({ ok: false, formError: "Kayıt güncellenemedi." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const denied = await requireAdminApi(request, "kayit.sil");
  if (denied) return denied;
  const id = parseIdParam((await ctx.params).id);
  if (id === null) return notFound();
  try {
    const before = getRegistration(id);
    const deleted = deleteRegistration(id);
    if (!deleted) return notFound();
    const admin = await getCurrentAdmin();
    if (admin) {
      writeAudit(
        { id: admin.id, fullName: admin.fullName, username: admin.username, ip: (await getRequestMeta()).ip },
        { action: "kayit.sil", entity: "registration", entityId: id, summary: `${before?.studentFullName ?? "#" + id} kaydı silindi` },
      );
    }
    return jsonNoStore({ ok: true });
  } catch (err) {
    if (err instanceof RegistrationStateError) return jsonNoStore({ ok: false, formError: err.message }, { status: 409 });
    if ((err as { code?: string })?.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
      return jsonNoStore({ ok: false, formError: "Bu öğrencinin ödeme kaydı var; silinemez. Okuldan ayrıldıysa “Okuldan Ayrıldı” olarak işaretleyin." }, { status: 409 });
    }
    logServerError("admin registration DELETE", err);
    return jsonNoStore({ ok: false, formError: "Kayıt silinemedi." }, { status: 500 });
  }
}
