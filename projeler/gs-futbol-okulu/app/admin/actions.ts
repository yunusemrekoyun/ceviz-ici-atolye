"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logServerError } from "@/lib/api";
import { authenticate, markLoggedIn, normalizeIdentifier } from "@/lib/auth/users";
import { LOGIN_PATH, SESSION_COOKIE, safeNextPath, sessionCookieOptions } from "@/lib/auth/cookie";
import { recordLoginEvent } from "@/lib/auth/login-events";
import { getRequestMeta } from "@/lib/auth/server";
import { createSession, deleteSession, purgeExpiredSessions } from "@/lib/auth/sessions";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

export type LoginState = { error?: string; username?: string };

const WINDOW_MS = 15 * 60 * 1000;
/** IP başına toplam deneme ve kullanıcı adı başına deneme (farklı IP'lerden tahmine karşı). */
const IP_LIMIT = { max: 20, windowMs: WINDOW_MS };
const USER_LIMIT = { max: 8, windowMs: WINDOW_MS };

function tooManyAttempts(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Çok fazla hatalı deneme yapıldı. Lütfen ${minutes} dakika sonra tekrar deneyin.`;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!(formData instanceof FormData)) return { error: "Geçersiz istek." };
  const username = String(formData.get("username") ?? "").trim().slice(0, 64);
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  if (!username || !password) {
    return { username, error: "Kullanıcı adı ve şifre giriniz." };
  }

  const meta = await getRequestMeta();
  const userKey = `login-user:${normalizeIdentifier(username)}`;
  const ipLimit = checkRateLimit(`login-ip:${meta.ip ?? "unknown"}`, Date.now(), IP_LIMIT);
  const userLimit = ipLimit.allowed ? checkRateLimit(userKey, Date.now(), USER_LIMIT) : ipLimit;
  if (!userLimit.allowed) {
    safeRecord(username, null, "rate_limited", meta);
    return { username, error: tooManyAttempts(userLimit.retryAfterSeconds) };
  }

  try {
    // Bu giriş kapısı yalnız yöneticiler içindir; antrenör ve veli kendi kapılarından girer.
    const admin = await authenticate(username, password, ["admin"]);
    if (!admin) {
      safeRecord(username, null, "wrong_password", meta);
      return { username, error: "Kullanıcı adı veya şifre hatalı." };
    }

    resetRateLimit(userKey);
    purgeExpiredSessions();
    const token = createSession(admin.id, new Date(), meta);
    markLoggedIn(admin.id);
    safeRecord(username, admin.id, "success", meta);
    (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
  } catch (err) {
    logServerError("admin login", err);
    return { username, error: "Giriş sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin." };
  }
  redirect(next);
}

/** Güvenlik kaydı girişi engellememeli: yazılamazsa yalnızca loglanır. */
function safeRecord(identifier: string, userId: number | null, outcome: Parameters<typeof recordLoginEvent>[2], meta: Awaited<ReturnType<typeof getRequestMeta>>) {
  try {
    recordLoginEvent(normalizeIdentifier(identifier) || "-", userId, outcome, meta);
  } catch (err) {
    logServerError("login event", err);
  }
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  try {
    deleteSession(store.get(SESSION_COOKIE)?.value);
  } catch (err) {
    logServerError("admin logout", err);
  }
  store.delete({ name: SESSION_COOKIE, path: "/" });
  redirect(LOGIN_PATH);
}
