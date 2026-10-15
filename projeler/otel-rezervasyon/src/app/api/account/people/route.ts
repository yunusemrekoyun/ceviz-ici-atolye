import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { prisma, type PrismaTransactionClient } from '@/lib/prisma';
import {
  accountPersonSelect,
  buildPersonLabel,
  normalizeComparable,
  serializeAccountPerson,
} from '@/lib/account/people';

export const runtime = 'nodejs';

const personSchema = z.object({
  label: z.string().max(100).optional(),
  relation: z.enum(['self', 'guest', 'family', 'company']).default('guest'),
  isDefault: z.boolean().optional(),
  firstName: z.string().min(1).max(100).transform((value) => value.trim()),
  lastName: z.string().min(1).max(100).transform((value) => value.trim()),
  email: z.string().email().max(254).optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  tcKimlikNo: z.string().optional(),
  passportNo: z.string().optional(),
  passportExpiry: z.string().optional(),
  companyName: z.string().optional(),
  taxNumber: z.string().optional(),
  taxOffice: z.string().optional(),
});

function toDate(value?: string) {
  return value ? new Date(value) : undefined;
}

type AccountPersonInput = {
  relation: 'self' | 'guest' | 'family' | 'company';
  isDefault: boolean;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  birthDate?: Date | null;
  gender?: string | null;
  nationality?: string | null;
  tcKimlikNo?: string | null;
  passportNo?: string | null;
  passportExpiry?: Date | null;
  companyName?: string | null;
  taxNumber?: string | null;
  taxOffice?: string | null;
};

function personKey(person: {
  firstName: string;
  lastName: string;
  phone?: string | null;
  tcKimlikNo?: string | null;
  passportNo?: string | null;
}) {
  return [
    normalizeComparable(person.firstName),
    normalizeComparable(person.lastName),
    normalizeComparable(person.phone),
    normalizeComparable(person.tcKimlikNo),
    normalizeComparable(person.passportNo),
  ].join('|');
}

async function syncPeopleFromExistingReservations(tx: PrismaTransactionClient, userId: string, email: string) {
  const [people, user, reservations] = await Promise.all([
    tx.accountPerson.findMany({
      where: { userId },
      select: accountPersonSelect,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    }),
    tx.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
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
      },
    }),
    tx.reservation.findMany({
      where: {
        OR: [
          { userId },
          { email },
        ],
      },
      select: {
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
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const existingKeys = new Set(people.map(personKey));
  let hasDefault = people.some((person) => person.isDefault);
  const candidates: AccountPersonInput[] = [];

  if (user?.firstName && user.lastName) {
    candidates.push({
      relation: 'self',
      isDefault: !hasDefault,
      firstName: user.firstName,
      lastName: user.lastName,
      email,
      phone: user.phone,
      birthDate: user.birthDate,
      gender: user.gender,
      nationality: user.nationality,
      tcKimlikNo: user.tcKimlikNo,
      passportNo: user.passportNo,
      passportExpiry: user.passportExpiry,
      companyName: user.companyName,
      taxNumber: user.taxNumber,
      taxOffice: user.taxOffice,
    });
  }

  for (const reservation of reservations) {
    if (!reservation.firstName || !reservation.lastName) continue;

    candidates.push({
      relation: 'guest',
      isDefault: false,
      firstName: reservation.firstName,
      lastName: reservation.lastName,
      email: reservation.email,
      phone: reservation.phone,
      birthDate: reservation.birthDate,
      gender: reservation.gender,
      nationality: reservation.nationality,
      tcKimlikNo: reservation.tcKimlikNo,
      passportNo: reservation.passportNo,
      passportExpiry: reservation.passportExpiry,
      companyName: reservation.companyName,
      taxNumber: reservation.taxNumber,
      taxOffice: reservation.taxOffice,
    });
  }

  let created = false;

  for (const candidate of candidates) {
    const key = personKey(candidate);
    if (existingKeys.has(key)) continue;

    const isDefault = !hasDefault && people.length === 0
      ? true
      : candidate.isDefault;
    const relation = isDefault ? 'self' : candidate.relation;

    await tx.accountPerson.create({
      data: {
        userId,
        label: buildPersonLabel(candidate.firstName, candidate.lastName, relation),
        relation,
        isDefault,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email || undefined,
        phone: candidate.phone || undefined,
        birthDate: candidate.birthDate || undefined,
        gender: candidate.gender || undefined,
        nationality: candidate.nationality || 'TR',
        tcKimlikNo: candidate.tcKimlikNo || undefined,
        passportNo: candidate.passportNo || undefined,
        passportExpiry: candidate.passportExpiry || undefined,
        companyName: candidate.companyName || undefined,
        taxNumber: candidate.taxNumber || undefined,
        taxOffice: candidate.taxOffice || undefined,
      },
    });

    if (isDefault) {
      hasDefault = true;
      await tx.user.update({
        where: { id: userId },
        data: {
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          phone: candidate.phone || undefined,
          birthDate: candidate.birthDate || undefined,
          gender: candidate.gender || undefined,
          nationality: candidate.nationality || 'TR',
          tcKimlikNo: candidate.tcKimlikNo || undefined,
          passportNo: candidate.passportNo || undefined,
          passportExpiry: candidate.passportExpiry || undefined,
          companyName: candidate.companyName || undefined,
          taxNumber: candidate.taxNumber || undefined,
          taxOffice: candidate.taxOffice || undefined,
        },
      });
    }

    existingKeys.add(key);
    created = true;
  }

  if (!created) return people;

  return tx.accountPerson.findMany({
    where: { userId },
    select: accountPersonSelect,
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
}

export async function GET(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);

  if (!auth) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const people = await prisma.$transaction((tx) => (
    syncPeopleFromExistingReservations(tx, auth.user.id, auth.user.email)
  ));

  return NextResponse.json({
    ok: true,
    people: people.map(serializeAccountPerson),
  });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);

  if (!auth) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const parsed = personSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: 'Kişi bilgileri geçersiz.' },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const existing = await prisma.accountPerson.findFirst({
    where: {
      userId: auth.user.id,
      firstName: { equals: data.firstName, mode: 'insensitive' },
      lastName: { equals: data.lastName, mode: 'insensitive' },
      phone: data.phone || null,
    },
    select: accountPersonSelect,
  });

  if (
    existing &&
    normalizeComparable(existing.firstName) === normalizeComparable(data.firstName) &&
    normalizeComparable(existing.lastName) === normalizeComparable(data.lastName)
  ) {
    return NextResponse.json({
      ok: true,
      person: serializeAccountPerson(existing),
      reused: true,
    });
  }

  const shouldBeDefault = data.isDefault ?? false;
  const person = await prisma.$transaction(async (tx) => {
    if (shouldBeDefault) {
      await tx.accountPerson.updateMany({
        where: { userId: auth.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const created = await tx.accountPerson.create({
      data: {
        userId: auth.user.id,
        label: data.label || buildPersonLabel(data.firstName, data.lastName, data.relation),
        relation: data.relation,
        isDefault: shouldBeDefault,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || undefined,
        phone: data.phone || undefined,
        birthDate: toDate(data.birthDate),
        gender: data.gender || undefined,
        nationality: data.nationality || 'TR',
        tcKimlikNo: data.tcKimlikNo || undefined,
        passportNo: data.passportNo || undefined,
        passportExpiry: toDate(data.passportExpiry),
        companyName: data.companyName || undefined,
        taxNumber: data.taxNumber || undefined,
        taxOffice: data.taxOffice || undefined,
      },
      select: accountPersonSelect,
    });

    if (shouldBeDefault && data.relation === 'self') {
      await tx.user.update({
        where: { id: auth.user.id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || undefined,
          birthDate: toDate(data.birthDate),
          gender: data.gender || undefined,
          nationality: data.nationality || 'TR',
          tcKimlikNo: data.tcKimlikNo || undefined,
          passportNo: data.passportNo || undefined,
          passportExpiry: toDate(data.passportExpiry),
          companyName: data.companyName || undefined,
          taxNumber: data.taxNumber || undefined,
          taxOffice: data.taxOffice || undefined,
        },
      });
    }

    return created;
  });

  return NextResponse.json({
    ok: true,
    person: serializeAccountPerson(person),
  }, { status: 201 });
}
