import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type AuthPayload, verifyToken, signToken } from "./jwt";
import { prisma } from "./prisma";

export const AUTH_COOKIE = "bf_session";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 gün
};

export async function setAuthCookie(payload: Omit<AuthPayload, "iat" | "exp">) {
  const token = await signToken(payload);
  const c = await cookies();
  c.set(AUTH_COOKIE, token, COOKIE_OPTS);
  return token;
}

export async function clearAuthCookie() {
  const c = await cookies();
  c.delete(AUTH_COOKIE);
}

export async function getCurrentUser(): Promise<AuthPayload | null> {
  const c = await cookies();
  const token = c.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireUser(): Promise<AuthPayload> {
  const u = await getCurrentUser();
  if (!u) redirect("/giris");
  return u;
}

export async function requireRole(roles: AuthPayload["role"][]): Promise<AuthPayload> {
  const u = await requireUser();
  if (!roles.includes(u.role)) redirect("/");
  return u;
}

// Admin/staff hesapları devre dışı bırakılabildiği için burada anlık
// (token'a değil DB'ye bakan) bir isActive kontrolü yapılır — böylece
// pasifleştirilen bir hesap mevcut oturumuyla panele giremez.
export async function requireAdmin(): Promise<AuthPayload> {
  const u = await requireRole(["ADMIN", "STAFF"]);
  const dbUser = await prisma.user.findUnique({ where: { id: u.sub }, select: { isActive: true } });
  // Cookie temizliği burada yapılamaz (server component render'ında cookie
  // yazılamaz); pasif hesabı /giris'e yönlendirmek panelden çıkarmaya yeter.
  if (!dbUser?.isActive) redirect("/giris");
  return u;
}

export const requireTrainer = () => requireRole(["TRAINER"]);
