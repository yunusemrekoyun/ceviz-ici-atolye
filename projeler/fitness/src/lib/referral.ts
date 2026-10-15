import type { Prisma } from "@prisma/client";

export const REFERRAL_REWARD_DAYS = 7;

type Tx = Prisma.TransactionClient;

// Bir üyenin ilk başarılı ödemesinden sonra çağrılır. Uygunsa referans eden
// üyenin aktif üyeliğine REFERRAL_REWARD_DAYS gün ekler.
// Döndürdüğü id, bildirim e-postası göndermek için kullanılır (tx dışında).
export async function grantReferralRewardIfEligible(tx: Tx, memberId: string): Promise<string | null> {
  const member = await tx.member.findUnique({
    where: { id: memberId },
    select: { referredById: true, referralRewarded: true },
  });
  if (!member?.referredById || member.referralRewarded) return null;

  const paidCount = await tx.payment.count({ where: { memberId, status: "PAID" } });
  if (paidCount !== 1) return null;

  await tx.member.update({ where: { id: memberId }, data: { referralRewarded: true } });

  const referrerMembership = await tx.membership.findFirst({
    where: { memberId: member.referredById, isActive: true },
  });
  if (!referrerMembership) return null;

  const newEndDate = new Date(referrerMembership.endDate.getTime() + REFERRAL_REWARD_DAYS * 24 * 60 * 60 * 1000);
  await tx.membership.update({ where: { id: referrerMembership.id }, data: { endDate: newEndDate } });

  return member.referredById;
}
