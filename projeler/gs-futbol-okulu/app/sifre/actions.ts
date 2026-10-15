"use server";

import { redirect } from "next/navigation";
import { logServerError } from "@/lib/api";
import { getRequestMeta } from "@/lib/auth/server";
import { GuardianError, redeemAuthToken } from "@/lib/guardians";
import { checkRateLimit } from "@/lib/rate-limit";

export type SetPasswordState = { error?: string };

export async function setPasswordAction(_prev: SetPasswordState, form: FormData): Promise<SetPasswordState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const repeat = String(form.get("repeat") ?? "");
  if (password !== repeat) return { error: "Şifreler aynı değil." };
  const meta = await getRequestMeta();
  if (!checkRateLimit(`set-password:${meta.ip ?? "unknown"}`, Date.now(), { max: 15, windowMs: 15 * 60_000 }).allowed) return { error: "Çok fazla deneme. Biraz sonra tekrar deneyin." };
  try {
    await redeemAuthToken(token, password);
  } catch (err) {
    if (err instanceof GuardianError) return { error: err.message };
    logServerError("set password", err);
    return { error: "Beklenmeyen bir hata oluştu." };
  }
  redirect("/giris?sifre=tamam");
}
