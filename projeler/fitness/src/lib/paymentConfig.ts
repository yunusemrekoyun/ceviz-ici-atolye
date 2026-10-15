import { prisma } from "@/lib/prisma";
import { safeDecrypt } from "@/lib/encryption";

export type PaymentProvider = "IYZICO" | "PAYTR";

export type PaymentGatewayConfig =
  | { mode: "offline" }
  | { mode: "iyzico"; apiKey: string; secretKey: string; baseUrl: string }
  | { mode: "paytr"; merchantId: string; merchantKey: string; merchantSalt: string };

export async function getPaymentGatewayConfig(): Promise<PaymentGatewayConfig> {
  const cfg = await prisma.paymentConfig.findUnique({ where: { id: "singleton" } });

  if (!cfg || !cfg.isOnlineEnabled || !cfg.provider) return { mode: "offline" };

  if (cfg.provider === "IYZICO") {
    const apiKey = safeDecrypt(cfg.iyzicoApiKey);
    const secretKey = safeDecrypt(cfg.iyzicoSecretKey);
    const baseUrl = cfg.iyzicoBaseUrl || "https://api.iyzipay.com";
    if (!apiKey || !secretKey) return { mode: "offline" };
    return { mode: "iyzico", apiKey, secretKey, baseUrl };
  }

  if (cfg.provider === "PAYTR") {
    const merchantId = safeDecrypt(cfg.paytrMerchantId);
    const merchantKey = safeDecrypt(cfg.paytrMerchantKey);
    const merchantSalt = safeDecrypt(cfg.paytrMerchantSalt);
    if (!merchantId || !merchantKey || !merchantSalt) return { mode: "offline" };
    return { mode: "paytr", merchantId, merchantKey, merchantSalt };
  }

  return { mode: "offline" };
}

export async function getRawConfig() {
  return prisma.paymentConfig.findUnique({ where: { id: "singleton" } });
}
