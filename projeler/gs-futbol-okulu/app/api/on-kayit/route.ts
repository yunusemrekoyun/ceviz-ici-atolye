import type { NextRequest } from "next/server";
import { DUPLICATE_MESSAGE } from "@/lib/constants";
import { bodyTooLarge, jsonNoStore, logServerError } from "@/lib/api";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createRegistration, DuplicateStudentError, findByStudentTc } from "@/lib/registrations";
import { savePendingSubmission } from "@/lib/merge";
import { notify } from "@/lib/notifications";
import { coerceFormValues, validateRegistration } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public API: SADECE yeni kayıt oluşturur. Listeleme/okuma yoktur.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    return jsonNoStore(
      { ok: false, formError: "Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyiniz." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  if (bodyTooLarge(request.headers)) {
    return jsonNoStore({ ok: false, formError: "Gönderilen veri çok büyük." }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonNoStore({ ok: false, formError: "Geçersiz istek." }, { status: 400 });
  }

  const result = validateRegistration(coerceFormValues(payload));
  if (!result.success) {
    return jsonNoStore(
      {
        ok: false,
        errors: result.errors,
        formError: result.formError ?? "Lütfen işaretli alanları kontrol ediniz.",
      },
      { status: 422 },
    );
  }

  try {
    const created = createRegistration(result.data);
    notify({ permission: "kayit.gor", kind: "kayit.yeni", title: "Yeni ön kayıt", body: created.studentFullName, link: "/admin/on-kayitlar?durum=pending" });
    return jsonNoStore({ ok: true, id: created.id }, { status: 201 });
  } catch (err) {
    if (err instanceof DuplicateStudentError) {
      // Aynı öğrenci için yeniden gönderilen form: üzerine yazılmaz, yönetici onayına düşer.
      const existing = result.data.studentTc ? findByStudentTc(result.data.studentTc) : null;
      if (existing) {
        savePendingSubmission(existing.id, coerceFormValues(payload));
        notify({ permission: "kayit.duzenle", kind: "kayit.guncelleme", title: "Veliden güncel bilgi geldi", body: existing.studentFullName, link: `/admin/on-kayitlar?ogrenci=${existing.id}` });
        return jsonNoStore({ ok: true, id: existing.id, updated: true }, { status: 200 });
      }
      return jsonNoStore(
        { ok: false, formError: DUPLICATE_MESSAGE, errors: { studentTc: DUPLICATE_MESSAGE } },
        { status: 409 },
      );
    }
    logServerError("on-kayit POST", err);
    return jsonNoStore(
      { ok: false, formError: "Kayıt sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyiniz." },
      { status: 500 },
    );
  }
}
