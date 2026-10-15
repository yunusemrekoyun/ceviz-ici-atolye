import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentGatewayConfig } from "@/lib/paymentConfig";
import { iyzipayClientFromConfig, promisify, IyziResult } from "@/lib/iyzipay";
import { sendPaymentReceiptEmail, sendReferralRewardEmail } from "@/lib/email";
import { grantReferralRewardIfEligible, REFERRAL_REWARD_DAYS } from "@/lib/referral";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// 303 See Other: tarayıcı POST→GET'e dönüştürür, middleware session sorununu önler
function redirect(path: string) {
  return NextResponse.redirect(`${APP_URL}${path}`, { status: 303 });
}

async function handleCallback(token: string | null, conversationId: string | null) {
  if (!token) return redirect("/panel/odeme-basarisiz?reason=no-token");

  const gw = await getPaymentGatewayConfig();
  if (gw.mode !== "iyzico") return redirect("/panel/odeme-basarisiz?reason=config");

  const client = iyzipayClientFromConfig(gw.apiKey, gw.secretKey, gw.baseUrl);
  const result: IyziResult = await promisify(
    client.checkoutForm.retrieve.bind(client.checkoutForm),
    { locale: "tr", conversationId: conversationId || "", token }
  );

  const paymentId = result.conversationId || conversationId || null;

  // conversationId boş gelebilir (iyzico bazı senaryolarda döndürmez)
  // token her zaman gelir ve init sırasında externalId olarak kaydedildi
  const payment = await prisma.payment.findFirst({
    where: {
      OR: [
        ...(paymentId ? [{ id: paymentId }] : []),
        { externalId: token },
      ],
    },
  });
  if (!payment) return redirect("/panel/odeme-basarisiz?reason=not-found");

  // fraudStatus: 1 = temiz, 0 = incelemede, -1 = fraud
  // Sandbox testlerinde 0 dönebilir — sadece -1 reddet
  const isSuccess =
    result.status === "success" &&
    result.paymentStatus === "SUCCESS" &&
    result.fraudStatus !== -1;

  if (isSuccess) {
    const [, planId] = (payment.notes || "").split("|");
    const plan = planId ? await prisma.plan.findUnique({ where: { id: planId } }) : null;

    const startDate = new Date();
    const endDate   = new Date();
    endDate.setDate(endDate.getDate() + (plan?.durationDays || 30));

    let referrerId: string | null = null;

    // PENDING→PAID geçişini koşullu yap: tekrar teslim edilen callback'te
    // ikinci kez üyelik/kupon işlenmesin (idempotent).
    const processed = await prisma.$transaction(async (tx) => {
      const claimed = await tx.payment.updateMany({
        where: { id: payment.id, status: { not: "PAID" } },
        data: { status: "PAID", paidAt: new Date(), externalId: token },
      });
      if (claimed.count === 0) return false;

      if (plan) {
        await tx.membership.updateMany({ where: { memberId: payment.memberId, isActive: true }, data: { isActive: false } });
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

    // Zaten işlenmişse (mükerrer callback) yan etki tekrarlamadan başarıya yönlendir
    if (!processed) return redirect(`/panel/odeme-basarili?payment=${payment.id}`);

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

    return redirect(`/panel/odeme-basarili?payment=${payment.id}`);
  }

  // Başarılı bir ödeme sonradan gelen bir 'failed' ile düşürülmesin
  await prisma.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "FAILED" } });
  return redirect("/panel/odeme-basarisiz?reason=failed");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    return await handleCallback(params.get("token"), params.get("conversationId"));
  } catch (e) {
    console.error("[checkout/callback POST]", e);
    return redirect("/panel/odeme-basarisiz?reason=error");
  }
}

// iyzico bazı senaryolarda GET ile yönlendirebilir
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    return await handleCallback(sp.get("token"), sp.get("conversationId"));
  } catch (e) {
    console.error("[checkout/callback GET]", e);
    return redirect("/panel/odeme-basarisiz?reason=error");
  }
}
