import type { Prisma } from '@prisma/client';

export const accountPersonSelect = {
  id: true,
  label: true,
  relation: true,
  isDefault: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  birthDate: true,
  gender: true,
  nationality: true,
  tcKimlikNo: true,
  passportNo: true,
  passportExpiry: true,
  companyName: true,
  taxNumber: true,
  taxOffice: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AccountPersonSelect;

type AccountPersonRecord = Prisma.AccountPersonGetPayload<{ select: typeof accountPersonSelect }>;

export function serializeAccountPerson(person: AccountPersonRecord) {
  return {
    ...person,
    birthDate: person.birthDate?.toISOString().split('T')[0] ?? null,
    passportExpiry: person.passportExpiry?.toISOString().split('T')[0] ?? null,
    createdAt: person.createdAt.toISOString(),
    updatedAt: person.updatedAt.toISOString(),
  };
}

export function buildPersonLabel(firstName: string, lastName: string, relation: string) {
  const fullName = `${firstName} ${lastName}`.trim();

  if (relation === 'self') return fullName;
  if (relation === 'guest') return fullName;

  return fullName;
}

export function normalizeComparable(value: string | null | undefined) {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
}
