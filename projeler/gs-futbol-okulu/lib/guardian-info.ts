import { and, desc, eq } from "drizzle-orm";
import { toRegistrationDto } from "@/lib/api";
import { issuesOf } from "@/lib/data-issues";
import { getDb } from "@/lib/db";
import { registrationSubmissions, type Registration } from "@/lib/db/schema";

/**
 * Veli panelinde "bilgileriniz eksik ya da hatalı" uyarısı: asıl kayıt için eksik alanlar ve bozuk görünen
 * bilgiler (T.C., telefon, doğum tarihi). Grubu olmaması, olası tekrar gibi okulun kendi işleri veliye gösterilmez.
 */
export type InfoProblem = { key: string; label: string };

const PARENT_TYPES = new Set(["tc", "phone", "noPhone", "birth"]);

export function infoProblems(reg: Registration): InfoProblem[] {
  const dto = toRegistrationDto(reg);
  const out: InfoProblem[] = dto.missing.map((m) => ({ key: `missing:${m}`, label: `${m} eksik` }));
  for (const i of issuesOf(dto)) {
    if (!PARENT_TYPES.has(i.type)) continue;
    out.push({ key: i.key, label: i.label.replace("geçersiz", "hatalı görünüyor").replace("şüpheli", "hatalı görünüyor") });
  }
  return out;
}

/** Velinin gönderdiği, okulun onayını bekleyen bilgi güncellemesinin zamanı (yoksa null). */
export function pendingInfoAt(registrationId: number): string | null {
  return (
    getDb()
      .select({ at: registrationSubmissions.createdAt })
      .from(registrationSubmissions)
      .where(and(eq(registrationSubmissions.registrationId, registrationId), eq(registrationSubmissions.status, "pending")))
      .orderBy(desc(registrationSubmissions.id))
      .limit(1)
      .get()?.at ?? null
  );
}
