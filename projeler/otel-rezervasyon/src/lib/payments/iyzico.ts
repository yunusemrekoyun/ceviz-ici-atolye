import { createHmac, randomBytes } from 'node:crypto';

type IyzicoRequestPayload = Record<string, unknown>;

export interface IyzicoInitializeInput {
  conversationId: string;
  callbackUrl: string;
  price: number;
  paidPrice: number;
  buyer: {
    id: string;
    name: string;
    surname: string;
    email: string;
    phone: string;
    identityNumber: string;
    ip: string;
  };
  roomName: string;
  roomTypeName: string;
  reservationCode: string;
}

export interface IyzicoInitializeResult {
  status: string;
  token?: string;
  paymentPageUrl?: string;
  checkoutFormContent?: string;
  errorCode?: string;
  errorMessage?: string;
  rawStatus?: string;
}

export interface IyzicoRetrieveResult {
  status: string;
  paymentStatus?: string;
  token?: string;
  paymentId?: string;
  conversationId?: string;
  paidPrice?: number;
  price?: number;
  currency?: string;
  fraudStatus?: number;
  errorCode?: string;
  errorMessage?: string;
  itemTransactions?: Array<{ paymentTransactionId?: string; paidPrice?: number }>;
  rawStatus?: string;
}

export interface IyzicoRefundResult {
  status: string;
  paymentId?: string;
  price?: number;
  errorCode?: string;
  errorMessage?: string;
}

function config() {
  const enabled = process.env.IYZICO_ENABLED === 'true';
  const apiKey = process.env.IYZICO_API_KEY?.trim();
  const secretKey = process.env.IYZICO_SECRET_KEY?.trim();
  const baseUrl = (process.env.IYZICO_BASE_URL?.trim() || 'https://sandbox-api.iyzipay.com').replace(/\/+$/, '');
  const locale = process.env.IYZICO_LOCALE?.trim() || 'tr';

  if (!enabled) {
    throw new Error('IYZICO_DISABLED');
  }

  if (!apiKey || !secretKey) {
    throw new Error('IYZICO_CONFIG_MISSING');
  }

  return { apiKey, secretKey, baseUrl, locale };
}

export function isIyzicoConfigured() {
  return process.env.IYZICO_ENABLED === 'true'
    && Boolean(process.env.IYZICO_API_KEY?.trim())
    && Boolean(process.env.IYZICO_SECRET_KEY?.trim());
}

function formatPrice(amount: number) {
  return Number(amount.toFixed(2));
}

function signedHeaders(path: string, body: string) {
  const { apiKey, secretKey } = config();
  const randomKey = randomBytes(16).toString('hex');
  const signature = createHmac('sha256', secretKey)
    .update(randomKey + path + body)
    .digest('hex');
  const authorizationParams = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`;

  return {
    Authorization: `IYZWSv2 ${Buffer.from(authorizationParams).toString('base64')}`,
    'x-iyzi-rnd': randomKey,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

async function iyzicoRequest<T>(path: string, payload: IyzicoRequestPayload): Promise<T> {
  const { baseUrl } = config();
  const body = JSON.stringify(payload);
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: signedHeaders(path, body),
    body,
    cache: 'no-store',
  });

  const data = await response.json().catch(() => null);

  if (!response.ok && !data) {
    throw new Error(`IYZICO_HTTP_${response.status}`);
  }

  return data as T;
}

function address(contactName: string) {
  return {
    contactName,
    city: 'Kutahya',
    country: 'Turkey',
    address: 'Kütahya Garden Otel online rezervasyon',
    zipCode: '43000',
  };
}

export async function initializeCheckoutForm(input: IyzicoInitializeInput) {
  const { locale } = config();
  const contactName = `${input.buyer.name} ${input.buyer.surname}`.trim();
  const amount = formatPrice(input.paidPrice);

  const payload = {
    locale,
    conversationId: input.conversationId,
    price: amount,
    paidPrice: amount,
    currency: 'TRY',
    basketId: input.reservationCode,
    paymentGroup: 'PRODUCT',
    callbackUrl: input.callbackUrl,
    enabledInstallments: [1],
    buyer: {
      id: input.buyer.id,
      name: input.buyer.name,
      surname: input.buyer.surname,
      gsmNumber: input.buyer.phone,
      email: input.buyer.email,
      identityNumber: input.buyer.identityNumber,
      registrationAddress: 'Kütahya Garden Otel online rezervasyon',
      ip: input.buyer.ip,
      city: 'Kutahya',
      country: 'Turkey',
      zipCode: '43000',
    },
    shippingAddress: address(contactName),
    billingAddress: address(contactName),
    basketItems: [
      {
        id: input.reservationCode,
        name: `Kütahya Garden Otel - ${input.roomName}`,
        category1: 'Konaklama',
        category2: input.roomTypeName,
        itemType: 'VIRTUAL',
        price: amount,
      },
    ],
  };

  const data = await iyzicoRequest<IyzicoInitializeResult>(
    '/payment/iyzipos/checkoutform/initialize/auth/ecom',
    payload,
  );

  return {
    ...data,
    rawStatus: data.status,
  };
}

export async function retrieveCheckoutForm(token: string, conversationId?: string) {
  const { locale } = config();
  const data = await iyzicoRequest<IyzicoRetrieveResult>(
    '/payment/iyzipos/checkoutform/auth/ecom/detail',
    {
      locale,
      conversationId,
      token,
    },
  );

  return {
    ...data,
    paidPrice: data.paidPrice === undefined ? undefined : Number(data.paidPrice),
    price: data.price === undefined ? undefined : Number(data.price),
    fraudStatus: data.fraudStatus === undefined ? undefined : Number(data.fraudStatus),
    rawStatus: data.status,
  };
}

// Resolve the per-item paymentTransactionId required by iyzico refunds.
export async function getPaymentTransactionId(token: string, conversationId?: string) {
  const detail = await retrieveCheckoutForm(token, conversationId);
  return detail.itemTransactions?.[0]?.paymentTransactionId ?? null;
}

export async function refundPayment(input: {
  paymentTransactionId: string;
  price: number;
  ip: string;
  conversationId?: string;
}): Promise<IyzicoRefundResult> {
  const { locale } = config();
  const data = await iyzicoRequest<IyzicoRefundResult>('/payment/refund', {
    locale,
    conversationId: input.conversationId,
    paymentTransactionId: input.paymentTransactionId,
    price: formatPrice(input.price),
    ip: input.ip,
    currency: 'TRY',
  });
  return data;
}

// Full refund of a not-yet-settled payment (same day). Uses paymentId directly
// — more reliable than /payment/refund which needs a paymentTransactionId.
export async function cancelIyzicoPayment(input: {
  paymentId: string;
  ip: string;
  conversationId?: string;
}): Promise<IyzicoRefundResult> {
  const { locale } = config();
  const data = await iyzicoRequest<IyzicoRefundResult>('/payment/cancel', {
    locale,
    conversationId: input.conversationId,
    paymentId: input.paymentId,
    ip: input.ip,
  });
  return data;
}
