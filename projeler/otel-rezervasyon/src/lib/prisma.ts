import { PrismaClient } from '@prisma/client';
import { decryptPii, encryptPii, PII_FIELDS } from './pii';

// Models whose identity-number columns are encrypted at rest.
const PII_MODELS = new Set(['User', 'AccountPerson', 'Reservation', 'ReservationGuest']);

function encryptData(data: unknown): void {
  if (!data || typeof data !== 'object') return;
  if (Array.isArray(data)) {
    for (const item of data) encryptData(item);
    return;
  }
  const obj = data as Record<string, unknown>;
  for (const field of PII_FIELDS) {
    const v = obj[field];
    if (typeof v === 'string' && v.length > 0) obj[field] = encryptPii(v);
  }
}

// Decrypt identity fields anywhere in a result graph (handles included
// relations like reservation.guests). Bounded to plain objects/arrays.
function decryptResult(value: unknown, depth = 0): void {
  if (!value || typeof value !== 'object' || depth > 6) return;
  if (Array.isArray(value)) {
    for (const item of value) decryptResult(item, depth + 1);
    return;
  }
  const obj = value as Record<string, unknown>;
  for (const [key, v] of Object.entries(obj)) {
    if ((PII_FIELDS as readonly string[]).includes(key)) {
      if (typeof v === 'string' && v.length > 0) obj[key] = decryptPii(v);
    } else if (v && typeof v === 'object') {
      decryptResult(v, depth + 1);
    }
  }
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  }).$extends({
    query: {
      $allModels: {
        async $allOperations({ model, args, query }) {
          // Encrypt identity numbers on the way in.
          if (model && PII_MODELS.has(model) && args && typeof args === 'object') {
            const a = args as { data?: unknown; create?: unknown; update?: unknown };
            if ('data' in a) encryptData(a.data);
            if ('create' in a) encryptData(a.create); // upsert
            if ('update' in a) encryptData(a.update); // upsert
          }

          const result = await query(args);

          // Decrypt identity numbers on the way out (incl. nested relations).
          if (result && typeof result === 'object') decryptResult(result);
          return result;
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

// Transaction-client type for the EXTENDED client. Helper functions that accept
// an interactive-transaction `tx` must use this (not Prisma.TransactionClient,
// which describes the unextended client and is no longer assignable). The full
// `prisma` client also satisfies it, so helpers accept both.
export type PrismaTransactionClient = Omit<
  ExtendedPrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends' | '$use'
>;

const globalForPrisma = globalThis as unknown as {
  prisma?: ExtendedPrismaClient;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
