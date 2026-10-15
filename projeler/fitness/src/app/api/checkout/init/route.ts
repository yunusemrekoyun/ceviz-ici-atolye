import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getPaymentGatewayConfig } from "@/lib/paymentConfig";
import { iyzipayClientFromConfig, promisify, formatPrice, IyziResult } from "@/lib/iyzipay";
import { createPaytrToken } from "@/lib/paytr";
import { evaluateCoupon } from "@/lib/coupon";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { planId, couponCode } = await req.json();

    if (!planId) return NextResponse.json({ error: "Plan seçimi zorunlu" }, { status: 400 });

    const [plan, member, gw] = await Promise.all([
      prisma.plan.findUnique({ where: { id: planId, isActive: true } }),
      prisma.member.findUnique({
        where: { userId: user.sub },
        include: { user: { select: { name: true, email: true, phone: true, emailVerified: true } } },
      }),
      getPaymentGatewayConfig(),
    ]);

    if (!plan)   return NextResponse.json({ error: "Plan bulunamadı" }, { status: 404 });
    if (!member) return NextResponse.json({ error: "Üye kaydı bulunamadı" }, { status: 404 });
    if (!member.user.emailVerified) {
      return NextResponse.json({ error: "Ödeme yapabilmek için önce e-posta adresini doğrulaman gerekiyor." }, { status: 403 });
    }

    // Kupon uygula — indirimli tutar hem geçide hem Payment kaydına aynı gider
    let chargeAmount = Number(plan.price);
    let discountAmount: number | null = null;
    let appliedCoupon: string | null = null;
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: String(couponCode).trim().toUpperCase() } });
      if (!coupon) return NextResponse.json({ error: "Kupon bulunamadı" }, { status: 404 });
      const r = evaluateCoupon(coupon, Number(plan.price), plan.id);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      chargeAmount = r.finalAmount;
      discountAmount = r.discount;
      appliedCoupon = r.couponCode;
    }

    // Online ödeme kapalı veya yapılandırılmamış → offline modu döndür
    if (gw.mode === "offline") {
      return NextResponse.json({ mode: "offline", planName: plan.name, price: chargeAmount, discount: discountAmount, couponCode: appliedCoupon });
    }

    // iyzico
    if (gw.mode === "iyzico") {
      const invoiceNo = `INV-${Date.now()}`;
      const payment = await prisma.payment.create({
        data: {
          memberId: member.id,
          amount: chargeAmount,
          currency: "TRY",
          status: "PENDING",
          method: "IYZICO",
          invoiceNo,
          notes: `${plan.name}|${plan.id}`,
          couponCode: appliedCoupon,
          discountAmount: discountAmount,
        },
      });

      const nameParts = (member.user.name || "Ad Soyad").split(" ");
      const firstName = nameParts[0] ?? "Ad";
      const lastName  = nameParts.slice(1).join(" ") || "Soyad";
      const appUrl    = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const ip        = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";

      const client = iyzipayClientFromConfig(gw.apiKey, gw.secretKey, gw.baseUrl);
      const result: IyziResult = await promisify(
        client.checkoutFormInitialize.create.bind(client.checkoutFormInitialize),
        {
          locale: "tr",
          conversationId: payment.id,
          price: formatPrice(chargeAmount),
          paidPrice: formatPrice(chargeAmount),
          currency: "TRY",
          basketId: payment.id,
          paymentGroup: "SUBSCRIPTION",
          callbackUrl: `${appUrl}/api/checkout/callback`,
          enabledInstallments: [1, 2, 3, 6, 9, 12],
          buyer: {
            id: member.id,
            name: firstName,
            surname: lastName,
            gsmNumber: member.user.phone || "+905000000000",
            email: member.user.email,
            identityNumber: "11111111111",
            lastLoginDate: new Date().toISOString().replace("T", " ").slice(0, 19),
            registrationDate: new Date().toISOString().replace("T", " ").slice(0, 19),
            registrationAddress: "Türkiye",
            ip,
            city: "İstanbul",
            country: "Turkey",
          },
          shippingAddress: { contactName: `${firstName} ${lastName}`, city: "İstanbul", country: "Turkey", address: "Türkiye" },
          billingAddress:  { contactName: `${firstName} ${lastName}`, city: "İstanbul", country: "Turkey", address: "Türkiye" },
          basketItems: [{ id: plan.id, name: plan.name, category1: "Spor Salonu Üyeliği", itemType: "VIRTUAL", price: formatPrice(chargeAmount) }],
        }
      );

      if (result.status !== "success") {
        await prisma.payment.delete({ where: { id: payment.id } });
        return NextResponse.json({ error: result.errorMessage || "Ödeme başlatılamadı" }, { status: 400 });
      }

      await prisma.payment.update({ where: { id: payment.id }, data: { externalId: result.token } });
      return NextResponse.json({ mode: "iyzico", token: result.token, formContent: result.checkoutFormContent, paymentId: payment.id });
    }

    // PayTR
    if (gw.mode === "paytr") {
      const invoiceNo = `INV-${Date.now()}`;
      const payment = await prisma.payment.create({
        data: {
          memberId: member.id,
          amount: chargeAmount,
          currency: "TRY",
          status: "PENDING",
          method: "PAYTR",
          invoiceNo,
          notes: `${plan.name}|${plan.id}`,
          couponCode: appliedCoupon,
          discountAmount: discountAmount,
        },
      });

      const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const paytrToken = await createPaytrToken({
        merchantId:         gw.merchantId,
        merchantKey:        gw.merchantKey,
        merchantSalt:       gw.merchantSalt,
        userIp:             ip,
        merchantOid:        payment.id,
        email:              member.user.email,
        userName:           member.user.name || "Ad Soyad",
        userPhone:          member.user.phone ?? undefined,
        paymentAmountKurus: Math.round(chargeAmount * 100),
        userBasket:         [{ name: plan.name, price: chargeAmount.toFixed(2), count: 1 }],
        merchantOkUrl:      `${appUrl}/panel/odeme-basarili?payment=${payment.id}`,
        merchantFailUrl:    `${appUrl}/panel/odeme-basarisiz?reason=failed`,
        notificationUrl:    `${appUrl}/api/checkout/paytr-notify`,
        noInstallment:      0,
        maxInstallment:     12,
        currency:           "TL",
      });

      return NextResponse.json({ mode: "paytr", token: paytrToken, paymentId: payment.id });
    }
  } catch (e) {
    console.error("[checkout/init]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
