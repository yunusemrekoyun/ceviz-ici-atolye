import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentGatewayConfig } from "@/lib/paymentConfig";
import { verifyPaytrNotification } from "@/lib/paytr";
import { sendPaymentReceiptEmail, sendReferralRewardEmail } from "@/lib/email";
import { grantReferralRewardIfEligible, REFERRAL_REWARD_DAYS } from "@/lib/referral";

// PayTR bu endpoint'e sunucu-sunucu POST atar (tarayıcı değil)
// Yanıt olarak "OK" dönülmeli — aksi hâlde PayTR bildirimi tekrarlar
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);

    const merchantOid = params.get("merchant_oid") ?? "";
    const status      = params.get("status") ?? "";
    const totalAmount = params.get("total_amount") ?? "";
    const hash        = params.get("hash") ?? "";

    const gw = await getPaymentGatewayConfig();
    if (gw.mode !== "paytr") {
      return new NextResponse("OK"); // yine de OK döndür, loop'u önle
    }

    // Hash doğrulama
    const valid = verifyPaytrNotification(
      merchantOid, status, totalAmount, hash,
      gw.merchantKey, gw.merchantSalt
    );
    if (!valid) {
      console.error("[paytr-notify] Hash doğrulaması başarısız");
      return new NextResponse("INVALID_HASH", { status: 400 });
    }

    const payment = await prisma.payment.findFirst({
      where: { id: merchantOid },
    });
    if (!payment) {
      console.error("[paytr-notify] Ödeme bulunamadı:", merchantOid);
      return new NextResponse("OK"); // bulamadık ama OK döndür
    }

    if (status === "success") {
      const [, planId] = (payment.notes || "").split("|");
      const plan = planId ? await prisma.plan.findUnique({ where: { id: planId } }) : null;

      const startDate = new Date();
      const endDate   = new Date();
      endDate.setDate(endDate.getDate() + (plan?.durationDays || 30));

      let referrerId: string | null = null;

      // PENDING→PAID koşullu geçiş: PayTR bildirimi tekrar gönderse bile
      // üyelik/kupon ikinci kez işlenmez (idempotent).
      const processed = await prisma.$transaction(async (tx) => {
        const claimed = await tx.payment.updateMany({
          where: { id: payment.id, status: { not: "PAID" } },
          data: { status: "PAID", paidAt: new Date() },
        });
        if (claimed.count === 0) return false;

        if (plan) {
          await tx.membership.updateMany({
            where: { memberId: payment.memberId, isActive: true },
            data: { isActive: false },
          });
          const ms = await tx.membership.create({
            data: { memberId: payment.memberId, planId: plan.id, startDate, endDate, isActive: true },
          });
          await tx.payment.update({ where: { id: payment.id }, data: { membershipId: ms.id } });
        }

        await tx.member.update({ where: { id: payment.memberId }, data: { status: "ACTIVE" } });

        if (payment.couponCode) {
          await tx.coupon.updateMany({ where: { code: payment.couponCode }, data: { usedCount: { increment: 1 } } });
        }

        referrerId = await grantReferralRewardIfEligible(tx, payment.memberId);
        return true;
      });

      if (!processed) return new NextResponse("OK");

      const member = await prisma.member.findUnique({ where: { id: payment.memberId }, include: { user: true } });
      if (member) {
        await sendPaymentReceiptEmail(member.user.email, member.user.name, {
          invoiceNo: payment.invoiceNo,
          planName: plan?.name ?? "Üyelik",
          amount: Number(payment.amount),
          currency: payment.currency,
          paidAt: new Date(),
        }).catch(() => {});
      }

      if (referrerId) {
        const referrer = await prisma.member.findUnique({ where: { id: referrerId }, include: { user: true } });
        if (referrer) await sendReferralRewardEmail(referrer.user.email, referrer.user.name, REFERRAL_REWARD_DAYS).catch(() => {});
      }

    } else {
      // Başarılı bir ödemeyi sonradan gelen 'failed' düşürmesin
      await prisma.payment.updateMany({
        where: { id: payment.id, status: "PENDING" },
        data: { status: "FAILED" },
      });
    }

    // PayTR "OK" yanıtı bekliyor
    return new NextResponse("OK");
  } catch (e) {
    console.error("[paytr-notify]", e);
    return new NextResponse("OK"); // hata olsa bile OK döndür — loop'u önle
  }
}
