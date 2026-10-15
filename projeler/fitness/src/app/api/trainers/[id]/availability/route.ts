import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { availabilitySchema } from "@/lib/validators";
import { ok, err, withHandler } from "@/lib/api-handler";

export const GET = withHandler(async (_req: NextRequest, ctx?: any) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const slots = await prisma.trainerAvailability.findMany({
    where: { trainerId: id },
    orderBy: { dayOfWeek: "asc" },
  });
  return ok(slots);
});

export const POST = withHandler(async (req: NextRequest, ctx?: any) => {
  await requireAdmin();
  const { id } = await ctx.params;

  const body = await req.json();
  const parsed = availabilitySchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Geçersiz veri");

  // Replace all slots atomically
  await prisma.$transaction([
    prisma.trainerAvailability.deleteMany({ where: { trainerId: id } }),
    prisma.trainerAvailability.createMany({
      data: parsed.data.map((s) => ({ ...s, trainerId: id })),
    }),
  ]);

  const slots = await prisma.trainerAvailability.findMany({
    where: { trainerId: id },
    orderBy: { dayOfWeek: "asc" },
  });
  return ok(slots);
});
