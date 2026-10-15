"use server";

import { headers } from "next/headers";
import { idSchema, runAdmin, type ActionResult } from "@/lib/admin-action";
import { createAuthToken, ensureGuardianForStudent, guardianChildren, GuardianError, guardianOverview, setGuardianStatus, unlinkGuardian, updateGuardianEmail } from "@/lib/guardians";
import { getSiteUrl } from "@/lib/site-url";
import { guardianInviteMessage } from "@/lib/whatsapp";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const run = (scope: string, fn: Parameters<typeof runAdmin>[2]) => runAdmin("veli.yonet", scope, fn, [GuardianError]);

export type InviteResult = ActionResult & { link?: string; message?: string; phone?: string | null };

async function inviteFor(userId: number, actorId: number, reset: boolean): Promise<{ link: string; message: string; phone: string | null }> {
  const user = getDb().select().from(users).where(eq(users.id, userId)).get();
  if (!user) throw new GuardianError("Veli hesabı bulunamadı.");
  const raw = createAuthToken(userId, "invite", actorId);
  const link = `${getSiteUrl(await headers())}/sifre/${raw}`;
  const nos = guardianChildren(userId)
    .map((r) => r.studentNo)
    .filter(Boolean)
    .join(", ");
  return { link, phone: user.phone, message: guardianInviteMessage(user.fullName ?? "", nos || "—", link, reset) };
}

/** Öğrencinin veli hesabını açar (yoksa) ve şifre belirleme bağlantısı üretir. */
export async function inviteGuardianAction(registrationId: number): Promise<InviteResult> {
  if (!idSchema.safeParse(registrationId).success) return { ok: false, error: "Geçersiz kayıt." };
  let out: { link: string; message: string; phone: string | null } | undefined;
  const res = await run("invite guardian", async (actor) => {
    const { user, created } = ensureGuardianForStudent(registrationId);
    out = await inviteFor(user.id, actor.id, Boolean(user.passwordHash));
    return { action: created ? "veli.olustur" : "veli.davet", entity: "user", entityId: user.id, summary: `${user.fullName ?? "Veli"}: ${created ? "hesap açıldı, " : ""}${user.passwordHash ? "şifre yenileme" : "davet"} bağlantısı üretildi` };
  });
  return res.ok ? { ...res, ...out } : res;
}

export async function bulkCreateGuardiansAction(): Promise<ActionResult & { created?: number }> {
  let created = 0;
  const res = await run("bulk guardians", () => {
    for (const row of guardianOverview()) {
      if (row.guardian) continue;
      try {
        if (ensureGuardianForStudent(row.registrationId).created) created++;
      } catch {
        // bilgisi eksik kayıt atlanır
      }
    }
    return { action: "veli.toplu", entity: "user", summary: `${created} veli hesabı açıldı` };
  });
  return res.ok ? { ...res, created } : res;
}

export async function setGuardianStatusAction(userId: number, active: boolean): Promise<ActionResult> {
  if (!idSchema.safeParse(userId).success) return { ok: false, error: "Geçersiz hesap." };
  return run("guardian status", () => {
    setGuardianStatus(userId, active);
    return { action: active ? "veli.etkinlestir" : "veli.pasiflestir", entity: "user", entityId: userId, summary: `Veli hesabı ${active ? "etkinleştirildi" : "pasifleştirildi"}` };
  });
}

export async function updateGuardianEmailAction(userId: number, email: string): Promise<ActionResult> {
  if (!idSchema.safeParse(userId).success || email.length > 200) return { ok: false, error: "Geçersiz istek." };
  return run("guardian email", () => {
    updateGuardianEmail(userId, email.trim() || null);
    return { action: "veli.eposta", entity: "user", entityId: userId, summary: "Veli e-postası güncellendi" };
  });
}

export async function unlinkGuardianAction(userId: number, registrationId: number): Promise<ActionResult> {
  if (!idSchema.safeParse(userId).success || !idSchema.safeParse(registrationId).success) return { ok: false, error: "Geçersiz istek." };
  return run("unlink guardian", () => {
    unlinkGuardian(userId, registrationId);
    return { action: "veli.bag-kaldir", entity: "user", entityId: userId, summary: `Öğrenci #${registrationId} bağlantısı kaldırıldı` };
  });
}
