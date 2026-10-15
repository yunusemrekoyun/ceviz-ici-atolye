import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { encrypt, safeDecrypt } from "@/lib/encryption";

// Şifrelenmiş alanlar — dışarıya gönderirken maskelenir
const MASKED = "••••••••";

function maskIfSet(val: string | null | undefined): string {
  if (!val) return "";
  const dec = safeDecrypt(val);
  return dec ? MASKED : "";
}

export async function GET() {
  await requireAdmin();
  const cfg = await prisma.paymentConfig.findUnique({ where: { id: "singleton" } });

  return NextResponse.json({
    isOnlineEnabled: cfg?.isOnlineEnabled ?? false,
    provider: cfg?.provider ?? null,
    iyzico: {
      apiKey:    maskIfSet(cfg?.iyzicoApiKey),
      secretKey: maskIfSet(cfg?.iyzicoSecretKey),
      baseUrl:   cfg?.iyzicoBaseUrl ?? "https://sandbox-api.iyzipay.com",
    },
    paytr: {
      merchantId:   maskIfSet(cfg?.paytrMerchantId),
      merchantKey:  maskIfSet(cfg?.paytrMerchantKey),
      merchantSalt: maskIfSet(cfg?.paytrMerchantSalt),
    },
  });
}

export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json();
  const { isOnlineEnabled, provider, iyzico, paytr } = body;

  const existing = await prisma.paymentConfig.findUnique({ where: { id: "singleton" } });

  // Eğer değer MASKED ise mevcut şifreli değeri koru, değişmişse şifrele
  function resolveField(newVal: string | undefined, existingVal: string | null | undefined): string | null {
    if (!newVal || newVal === MASKED) return existingVal ?? null;
    return encrypt(newVal);
  }

  const data = {
    isOnlineEnabled: !!isOnlineEnabled,
    provider: provider || null,
    iyzicoApiKey:     resolveField(iyzico?.apiKey,    existing?.iyzicoApiKey),
    iyzicoSecretKey:  resolveField(iyzico?.secretKey, existing?.iyzicoSecretKey),
    iyzicoBaseUrl:    iyzico?.baseUrl || "https://sandbox-api.iyzipay.com",
    paytrMerchantId:  resolveField(paytr?.merchantId,   existing?.paytrMerchantId),
    paytrMerchantKey: resolveField(paytr?.merchantKey,  existing?.paytrMerchantKey),
    paytrMerchantSalt:resolveField(paytr?.merchantSalt, existing?.paytrMerchantSalt),
  };

  await prisma.paymentConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });

  return NextResponse.json({ ok: true });
}
