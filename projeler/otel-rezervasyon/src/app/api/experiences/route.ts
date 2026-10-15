import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { experiencesData } from '@/data';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const insuranceAndGearFee = 15;

const experienceSchema = z.object({
  experienceId: z.string().min(1),
  day: z.coerce.number().int(),
  guests: z.coerce.number().int(),
});

export async function GET() {
  return NextResponse.json({ ok: true, experiences: experiencesData });
}

export async function POST(request: NextRequest) {
  const parsed = experienceSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: 'Experience request data is invalid.' },
      { status: 400 },
    );
  }

  const experience = experiencesData.find((item) => item.id === parsed.data.experienceId);
  const day = parsed.data.day;
  const guests = parsed.data.guests;

  if (!experience) {
    return NextResponse.json(
      { ok: false, message: 'Selected experience was not found.' },
      { status: 404 },
    );
  }

  if (day < 1 || day > 31) {
    return NextResponse.json(
      { ok: false, message: 'Experience day must be a valid day in May.' },
      { status: 400 },
    );
  }

  if (guests < 1 || guests > 6) {
    return NextResponse.json(
      { ok: false, message: 'Attendee count must be between 1 and 6.' },
      { status: 400 },
    );
  }

  const totalPrice = (experience.price + insuranceAndGearFee) * guests;
  const confirmationId = `GH-EXP-${Date.now().toString(36).toUpperCase()}`;
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  const date = new Date(Date.UTC(2026, 4, day));

  try {
    await prisma.experienceBooking.create({
      data: {
        userId: auth?.user.id,
        experienceId: experience.id,
        experienceName: experience.name,
        date,
        guests,
        basePrice: experience.price,
        insuranceAndGearFee,
        totalPrice,
        confirmationId,
      },
    });
  } catch (error) {
    console.error('Experience booking persistence failed.', error);

    return NextResponse.json(
      { ok: false, message: 'Experience booking could not be stored.' },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    confirmationId,
    request: {
      experienceId: experience.id,
      experienceName: experience.name,
      date: `2026-05-${String(day).padStart(2, '0')}`,
      guests,
      basePrice: experience.price,
      insuranceAndGearFee,
      totalPrice,
    },
  });
}
