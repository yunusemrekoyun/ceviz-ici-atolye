import { redirect } from "next/navigation";
import { requirePortal } from "@/lib/auth/server";
import type { SessionUser } from "@/lib/auth/sessions";
import type { Registration } from "@/lib/db/schema";
import { guardianChildren } from "@/lib/guardians";
import { missingRequiredConsents } from "@/lib/legal";
import { accessMap } from "@/lib/billing";
import { infoProblems, pendingInfoAt, type InfoProblem } from "@/lib/guardian-info";

export type GuardianContext = { user: SessionUser; children: Registration[]; child: Registration | null };

/**
 * Veli sayfalarının girişi: oturum, çocuklar, seçili çocuk (?ogrenci=).
 * Zorunlu onayı eksik olan veli önce onay ekranına gider (VEL-12).
 */
export async function loadGuardian(selected?: string | string[] | undefined, options: { skipConsents?: boolean; requireAccess?: boolean } = {}): Promise<GuardianContext> {
  const user = await requirePortal("guardian");
  const children = guardianChildren(user.id);
  if (!options.skipConsents && missingRequiredConsents(children.map((c) => c.id)).length > 0) redirect("/veli/onay");
  const id = Number(typeof selected === "string" ? selected : NaN);
  const child = children.find((c) => c.id === id) ?? children[0] ?? null;
  if (options.requireAccess) {
    // K-03: kilitli çocuğun sayfalarında yalnız "Ödeme bekleniyor" ekranı görünür.
    const access = accessMap(children);
    if (child && !access.get(child.id)?.allowed) redirect(`/veli?ogrenci=${child.id}`);
    const open = children.filter((c) => access.get(c.id)?.allowed);
    return { user, children: open, child };
  }
  return { user, children, child };
}

/**
 * Veli paneli şimdilik sade: profil, antrenman takibi, dijital kart. Aidat, gelişim, duyurular, program
 * sayfaları açılmaz (adres yazılırsa profile döner). Hepsini açmak için false.
 */
export const SIMPLE_PANEL = true;

/** Seçili çocuğun eksik/hatalı bilgileri ve onay bekleyen gönderimi (her sayfadaki uyarı için). */
export function childInfoState(child: Registration): { problems: InfoProblem[]; pendingAt: string | null; href: string; firstName: string } {
  return { problems: infoProblems(child), pendingAt: pendingInfoAt(child.id), href: `/veli/bilgiler?ogrenci=${child.id}`, firstName: child.studentFullName.split(" ")[0] ?? child.studentFullName };
}
