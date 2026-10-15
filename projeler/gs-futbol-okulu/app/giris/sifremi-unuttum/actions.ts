"use server";

import { headers } from "next/headers";
import { logServerError } from "@/lib/api";
import { findPortalUser } from "@/lib/auth/portal-login";
import { getRequestMeta } from "@/lib/auth/server";
import { normalizeIdentifier } from "@/lib/auth/users";
import { createAuthToken } from "@/lib/guardians";
import { mailTemplates, sendMail } from "@/lib/mail";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/site-url";

export type ForgotState = { done?: boolean; error?: string };

/** Hesap var mı yok mu belli etmeden aynı yanıtı verir; e-postası olan hesaba sıfırlama bağlantısı gider. */
export async function forgotPasswordAction(_prev: ForgotState, form: FormData): Promise<ForgotState> {
  const identifier = normalizeIdentifier(String(form.get("identifier") ?? "").slice(0, 120));
  if (!identifier) return { error: "Öğrenci numarası ya da e-posta yazın." };
  const meta = await getRequestMeta();
  const ipOk = checkRateLimit(`forgot-ip:${meta.ip ?? "unknown"}`, Date.now(), { max: 10, windowMs: 60 * 60_000 }).allowed;
  const idOk = checkRateLimit(`forgot-id:${identifier}`, Date.now(), { max: 3, windowMs: 60 * 60_000 }).allowed;
  if (!ipOk || !idOk) return { done: true };
  try {
    const user = findPortalUser(identifier);
    if (user && user.email && user.status !== "disabled" && user.role !== "admin") {
      const raw = createAuthToken(user.id, "reset", null);
      const link = `${getSiteUrl(await headers())}/sifre/${raw}`;
      await sendMail(mailTemplates.passwordReset(user.email, user.fullName ?? "", link));
    }
  } catch (err) {
    logServerError("forgot password", err);
  }
  return { done: true };
}
