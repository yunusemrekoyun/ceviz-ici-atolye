import { PageHeader } from "@/components/admin/PageHeader";
import { PaymentConfigClient } from "@/components/admin/PaymentConfigClient";
import { getRawConfig } from "@/lib/paymentConfig";
import { safeDecrypt } from "@/lib/encryption";

const MASKED = "••••••••";

function maskIfSet(val: string | null | undefined) {
  if (!val) return "";
  return safeDecrypt(val) ? MASKED : "";
}

export default async function OdemeEntegrasyonuPage() {
  const cfg = await getRawConfig();

  return (
    <div>
      <PageHeader
        title="Ödeme Entegrasyonu"
        subtitle="Online ödeme sağlayıcısını yapılandır — anahtarlar şifreli saklanır"
      />
      <PaymentConfigClient
        initial={{
          isOnlineEnabled: cfg?.isOnlineEnabled ?? false,
          provider: (cfg?.provider as "IYZICO" | "PAYTR" | null) ?? null,
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
        }}
      />
    </div>
  );
}
