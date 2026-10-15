"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logServerError } from "@/lib/api";
import { PORTAL_LOGIN_PATH, SESSION_COOKIE, safePortalNext, sessionCookieOptions } from "@/lib/auth/cookie";
import { recordLoginEvent } from "@/lib/auth/login-events";
import { findPortalUser } from "@/lib/auth/portal-login";
import { getRequestMeta } from "@/lib/auth/server";
import { createSession, deleteSession, purgeExpiredSessions } from "@/lib/auth/sessions";
import { authenticate, markLoggedIn, normalizeIdentifier, portalOf } from "@/lib/auth/users";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

export type PortalLoginState = { error?: string; identifier?: string };

const WINDOW_MS = 15 * 60 * 1000;
const IP_LIMIT = { max: 20, windowMs: WINDOW_MS };
const USER_LIMIT = { max: 8, windowMs: WINDOW_MS };
const HOME = { coach: "/antrenor", guardian: "/veli", admin: "/admin" } as const;

function safeRecord(identifier: string, userId: number | null, outcome: Parameters<typeof recordLoginEvent>[2], meta: Awaited<ReturnType<typeof getRequestMeta>>) {
  try {
    recordLoginEvent(normalizeIdentifier(identifier) || "-", userId, outcome, meta);
  } catch (err) {
    logServerError("login event", err);
  }
}

export async function portalLoginAction(_prev: PortalLoginState, formData: FormData): Promise<PortalLoginState> {
  if (!(formData instanceof FormData)) return { error: "Geçersiz istek." };
  const identifier = String(formData.get("identifier") ?? "").trim().slice(0, 120);
  const password = String(formData.get("password") ?? "");
  if (!identifier || !password) return { identifier, error: "Bilgilerinizi ve şifrenizi yazın." };

  const meta = await getRequestMeta();
  const userKey = `login-user:${normalizeIdentifier(identifier)}`;
  const ipLimit = checkRateLimit(`login-ip:${meta.ip ?? "unknown"}`, Date.now(), IP_LIMIT);
  const userLimit = ipLimit.allowed ? checkRateLimit(userKey, Date.now(), USER_LIMIT) : ipLimit;
  if (!userLimit.allowed) {
    safeRecord(identifier, null, "rate_limited", meta);
    return { identifier, error: `Çok fazla hatalı deneme yapıldı. ${Math.max(1, Math.ceil(userLimit.retryAfterSeconds / 60))} dakika sonra tekrar deneyin.` };
  }

  let target: string;
  try {
    const user = await authenticate(identifier, password, ["coach", "guardian", "admin"], findPortalUser);
    if (!user) {
      safeRecord(identifier, null, "wrong_password", meta);
      return { identifier, error: "Bilgiler ya da şifre hatalı." };
    }
    const portal = portalOf(user.role) ?? "guardian";
    resetRateLimit(userKey);
    purgeExpiredSessions();
    const token = createSession(user.id, new Date(), meta);
    markLoggedIn(user.id);
    safeRecord(identifier, user.id, "success", meta);
    (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
    target = safePortalNext(formData.get("next"), HOME[portal]);
  } catch (err) {
    logServerError("portal login", err);
    return { identifier, error: "Giriş sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin." };
  }
  redirect(target);
}

export async function portalLogoutAction(): Promise<void> {
  const store = await cookies();
  try {
    deleteSession(store.get(SESSION_COOKIE)?.value);
  } catch (err) {
    logServerError("portal logout", err);
  }
  store.delete({ name: SESSION_COOKIE, path: "/" });
  redirect(PORTAL_LOGIN_PATH);
}
