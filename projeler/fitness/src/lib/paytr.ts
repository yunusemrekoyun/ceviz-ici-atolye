import crypto from "crypto";

export interface PaytrTokenParams {
  merchantId: string;
  merchantKey: string;
  merchantSalt: string;
  userIp: string;
  merchantOid: string; // benzersiz sipariş no — payment.id kullanıyoruz
  email: string;
  userName: string;
  userPhone?: string;
  paymentAmountKurus: number; // TL × 100, tam sayı
  userBasket: Array<{ name: string; price: string; count: number }>; // price: "150.00"
  merchantOkUrl: string;
  merchantFailUrl: string;
  notificationUrl: string;
  noInstallment?: 0 | 1;
  maxInstallment?: number;
  currency?: "TL" | "USD" | "EUR";
}

export async function createPaytrToken(p: PaytrTokenParams): Promise<string> {
  // PayTR hash sırası (döküman: dev.paytr.com/iframe-api-1-adim):
  // merchant_id + user_ip + merchant_oid + email + payment_amount +
  // user_basket + no_installment + max_installment + currency + test_mode + merchant_salt
  const testMode = process.env.NODE_ENV === "production" ? 0 : 1;

  const userBasketJson = JSON.stringify(
    p.userBasket.map((i) => [i.name, i.price, i.count])
  );
  const userBasketEncoded = Buffer.from(userBasketJson).toString("base64");

  const noInstallment  = p.noInstallment  ?? 0;
  const maxInstallment = p.maxInstallment ?? 0;
  const currency       = p.currency ?? "TL";

  const hashStr =
    p.merchantId +
    p.userIp +
    p.merchantOid +
    p.email +
    p.paymentAmountKurus +
    userBasketEncoded +
    noInstallment +
    maxInstallment +
    currency +
    testMode +
    p.merchantSalt;

  const paytrToken = crypto
    .createHmac("sha256", p.merchantKey)
    .update(hashStr)
    .digest("base64");

  const body = new URLSearchParams({
    merchant_id:          p.merchantId,
    user_ip:              p.userIp,
    merchant_oid:         p.merchantOid,
    email:                p.email,
    user_name:            p.userName,
    user_phone:           p.userPhone ?? "",
    user_address:         "Türkiye",
    payment_amount:       String(p.paymentAmountKurus),
    user_basket:          userBasketEncoded,
    no_installment:       String(noInstallment),
    max_installment:      String(maxInstallment),
    currency:             currency,
    test_mode:            String(testMode),
    merchant_ok_url:      p.merchantOkUrl,
    merchant_fail_url:    p.merchantFailUrl,
    merchant_notify_url:  p.notificationUrl,
    client_lang:          "tr",
    timeout_limit:        "30",
    debug_on:             process.env.NODE_ENV === "production" ? "0" : "1",
    paytr_token:          paytrToken,
  });

  const res = await fetch("https://www.paytr.com/odeme/api/get-token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`PayTR HTTP ${res.status}`);
  }

  const data = (await res.json()) as { status: string; token?: string; reason?: string };
  if (data.status !== "success" || !data.token) {
    throw new Error(data.reason || "PayTR token alınamadı");
  }
  return data.token;
}

// Bildirim hash doğrulaması
// PHP referans: base64_encode(hash_hmac('sha256', $merchant_oid.$merchant_salt.$status.$total_amount, $merchant_key, true))
export function verifyPaytrNotification(
  merchantOid: string,
  status: string,
  totalAmount: string,
  hash: string,
  merchantKey: string,
  merchantSalt: string
): boolean {
  const expected = crypto
    .createHmac("sha256", merchantKey)
    .update(merchantOid + merchantSalt + status + totalAmount)
    .digest("base64");
  return expected === hash;
}
