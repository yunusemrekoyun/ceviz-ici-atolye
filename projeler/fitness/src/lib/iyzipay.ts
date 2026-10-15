// eslint-disable-next-line @typescript-eslint/no-require-imports
const Iyzipay = require("iyzipay");

export function iyzipayClientFromConfig(apiKey: string, secretKey: string, baseUrl: string) {
  return new Iyzipay({ apiKey, secretKey, uri: baseUrl });
}

export function promisify<T>(fn: (req: object, cb: (err: unknown, result: T) => void) => void, request: object): Promise<T> {
  return new Promise((resolve, reject) => {
    fn(request, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

export interface IyziResult {
  status: string;
  errorCode?: string;
  errorMessage?: string;
  conversationId?: string;
  token?: string;
  checkoutFormContent?: string;
  price?: string;
  paidPrice?: string;
  paymentStatus?: string;
  paymentId?: string;
  fraudStatus?: number;
  binNumber?: string;
  lastFourDigits?: string;
  cardAssociation?: string;
  cardFamily?: string;
  cardType?: string;
}

export function formatPrice(amount: number | string): string {
  return Number(amount).toFixed(2);
}
