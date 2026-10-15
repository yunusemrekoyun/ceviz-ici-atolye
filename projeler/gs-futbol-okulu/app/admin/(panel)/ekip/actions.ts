"use server";

import { z } from "zod";
import { idSchema, invalid, runAdmin, type ActionResult } from "@/lib/admin-action";
import { deleteUserSessions } from "@/lib/auth/sessions";
import { createStaff, deleteRole, roleSchema, saveRole, setStaffStatus, staffSchema, updateStaff } from "@/lib/team";

export type StaffFormValues = { fullName: string; username: string; email: string; phone: string; role: string; password: string };
export type RoleFormValues = { name: string; portal: string; permissions: string[] };

export async function saveStaffAction(id: number | null, values: StaffFormValues): Promise<ActionResult> {
  if (id !== null && !idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz kullanıcı." };
  const parsed = staffSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error);
  return runAdmin("ekip.yonet", "save staff", async (_actor, user) => {
    const saved = id === null ? await createStaff(parsed.data) : await updateStaff(id, parsed.data, user.id);
    return {
      action: id === null ? "ekip.ekle" : "ekip.duzenle",
      entity: "user",
      entityId: saved.id,
      summary: `${saved.fullName} (${saved.username}) ${id === null ? "eklendi" : "düzenlendi"}; rol: ${saved.role}${parsed.data.password && id !== null ? ", şifre değiştirildi" : ""}`,
    };
  });
}

export async function setStaffStatusAction(id: number, active: boolean): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz kullanıcı." };
  return runAdmin("ekip.yonet", "staff status", (_actor, user) => {
    const u = setStaffStatus(id, active, user.id);
    return { action: active ? "ekip.etkinlestir" : "ekip.pasiflestir", entity: "user", entityId: id, summary: `${u.fullName ?? u.username} ${active ? "etkinleştirildi" : "pasifleştirildi"}` };
  });
}

export async function revokeStaffSessionsAction(id: number): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz kullanıcı." };
  return runAdmin("ekip.yonet", "staff sessions", () => {
    deleteUserSessions(id);
    return { action: "ekip.oturum-kapat", entity: "user", entityId: id, summary: "Tüm oturumları kapatıldı" };
  });
}

export async function saveRoleAction(key: string | null, values: RoleFormValues): Promise<ActionResult> {
  if (key !== null && !/^[a-z0-9-]{1,50}$/.test(key)) return { ok: false, error: "Geçersiz rol." };
  const parsed = roleSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error);
  return runAdmin("ekip.yonet", "save role", () => {
    const role = saveRole(key, parsed.data);
    return { action: key ? "rol.duzenle" : "rol.ekle", entity: "role", entityId: role.key, summary: `${role.name}: ${parsed.data.permissions.length} izin`, data: parsed.data.permissions };
  });
}

export async function deleteRoleAction(key: string): Promise<ActionResult> {
  if (!z.string().regex(/^[a-z0-9-]{1,50}$/).safeParse(key).success) return { ok: false, error: "Geçersiz rol." };
  return runAdmin("ekip.yonet", "delete role", () => {
    deleteRole(key);
    return { action: "rol.sil", entity: "role", entityId: key, summary: `Rol silindi: ${key}` };
  });
}
