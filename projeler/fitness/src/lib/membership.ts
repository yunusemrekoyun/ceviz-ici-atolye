import { prisma } from "@/lib/prisma";

const TRIAL_DAYS = 7;

// Panel erişimine açık sayfalar — üyelik/deneme gerekmez
export const PANEL_OPEN_PATHS = [
  "/panel/satin-al",
  "/panel/odeme-basarili",
  "/panel/odeme-basarisiz",
  "/panel/profil",
  "/panel/odemeler",
  "/panel/uyeligim",
];

export type AccessResult =
  | { ok: true; reason: "membership" | "trial"; trialEnd?: Date }
  | { ok: false; reason: "no_member" | "expired"; trialEnd?: Date };

export async function checkPanelAccess(userId: string): Promise<AccessResult> {
  const member = await prisma.member.findUnique({
    where: { userId },
    select: {
      createdAt: true,
      memberships: {
        where: { isActive: true, endDate: { gt: new Date() } },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!member) return { ok: false, reason: "no_member" };

  if (member.memberships.length > 0) return { ok: true, reason: "membership" };

  const trialEnd = new Date(member.createdAt);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

  if (new Date() < trialEnd) return { ok: true, reason: "trial", trialEnd };

  return { ok: false, reason: "expired", trialEnd };
}
