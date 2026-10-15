import type { SessionUser } from "@/lib/auth/sessions";
import type { StoredFile } from "@/lib/db/schema";
import { getRegistration } from "@/lib/registrations";
import { groupScope, inScope } from "@/lib/scan";
import { guardianCanSee } from "@/lib/guardians";

/**
 * Dosyayı kim görebilir: yönetimde izne göre; antrenör yalnız kendi gruplarındaki öğrencinin fotoğrafını,
 * veli yalnız kendi çocuğunun fotoğrafını ve kendi yüklediği dekontu.
 */
export function canViewFile(user: SessionUser, file: StoredFile): boolean {
  const has = (p: string) => user.permissions.includes(p as never);
  if (user.portal === "admin") return file.kind === "receipt" ? has("aidat.gor") : has("kayit.gor") || has("yoklama.al");
  if (!file.registrationId) return false;
  if (user.portal === "coach") {
    if (file.kind !== "photo") return false;
    const reg = getRegistration(file.registrationId);
    return Boolean(reg && inScope(groupScope(user), reg.groupId));
  }
  if (user.portal === "guardian") {
    if (file.kind === "receipt") return file.createdBy === user.id;
    return guardianCanSee(user.id, file.registrationId);
  }
  return false;
}
