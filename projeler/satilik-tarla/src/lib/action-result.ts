import type { ZodError } from 'zod';

/** Server action'ların useActionState ile uyumlu ortak dönüş tipi. */
export type ActionResult = {
  ok: boolean;
  /** Form geneli hata mesajı (alan bazlı değilse) */
  error?: string;
  /** Alan bazlı hatalar — input altında gösterilir */
  fieldErrors?: Record<string, string[]>;
};

export const actionOk: ActionResult = { ok: true };

export function actionError(error: string): ActionResult {
  return { ok: false, error };
}

export function zodToActionResult(err: ZodError): ActionResult {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? '_');
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, fieldErrors };
}
