import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logServerError } from "@/lib/api";
import { writeAudit, type Actor, type AuditInput } from "@/lib/audit";
import { getRequestMeta, requireAdmin } from "@/lib/auth/server";
import type { Permission } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/sessions";

export type ActionResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Kullanıcıya gösterilecek, beklenen iş kuralı hataları (mesajı olduğu gibi döner). */
export class UserError extends Error {}

export const idSchema = z.number().int().positive();

export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0] ?? "form")] ??= issue.message;
  return out;
}

export function invalid(error: z.ZodError): ActionResult {
  const fieldErrors = fieldErrorsOf(error);
  return { ok: false, error: Object.values(fieldErrors)[0] ?? "Lütfen alanları kontrol edin.", fieldErrors };
}

/**
 * Yönetim paneli işlemi: oturum + izin → işlem → (varsa) işlem geçmişi → sayfaların tazelenmesi.
 * `fn` bir işlem geçmişi kaydı döndürürse yalnız işlem başarılı olursa yazılır.
 */
export async function runAdmin(
  permission: Permission | null,
  scope: string,
  fn: (actor: Actor, user: SessionUser) => AuditInput | void | Promise<AuditInput | void>,
  knownErrors: (new (...args: never[]) => Error)[] = [],
): Promise<ActionResult> {
  const user = await requireAdmin(permission ?? undefined);
  const actor: Actor = { id: user.id, fullName: user.fullName, username: user.username, ip: (await getRequestMeta()).ip };
  try {
    const entry = await fn(actor, user);
    if (entry) writeAudit(actor, entry);
  } catch (err) {
    if (err instanceof UserError || knownErrors.some((E) => err instanceof E)) return { ok: false, error: (err as Error).message };
    logServerError(scope, err);
    return { ok: false, error: "İşlem sırasında beklenmeyen bir hata oluştu." };
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}
