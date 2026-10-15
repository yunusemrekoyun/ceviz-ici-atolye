import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { trainerCreateSchema } from "@/lib/validators";
import { ok, err, validate, withHandler } from "@/lib/api-handler";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateToken } from "@/lib/token";
import { sendTrainerAccountSetupEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

export const GET = withHandler(async () => {
  await requireAdmin();
  const trainers = await prisma.trainer.findMany({
    include: {
      user: { select: { name: true, email: true, avatarUrl: true, phone: true } },
      _count: { select: { members: true, appointments: true } },
      availabilities: { orderBy: { dayOfWeek: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  return ok(trainers);
});

export const POST = withHandler(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const { data, error } = await validate(trainerCreateSchema, req);
  if (error) return error;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return err("Bu e-posta zaten kayıtlı", 409);

  // Trainer never logs in with this — it's an unguessable placeholder replaced
  // via the account-setup email below (same reset-token flow as forgot-password).
  const placeholderHash = await bcrypt.hash(crypto.randomUUID(), 10);
  const setupToken = generateToken();
  const setupExpiry = new Date(Date.now() + 60 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: placeholderHash,
      role: Role.TRAINER,
      emailVerified: new Date(),
      avatarUrl: data.avatarUrl || null,
      resetToken: setupToken,
      resetTokenExpiry: setupExpiry,
      trainer: {
        create: {
          specialty: data.specialty,
          bio: data.bio,
          experience: data.experience,
          rating: data.rating,
        },
      },
    },
    include: { trainer: true },
  });

  await sendTrainerAccountSetupEmail(user.email, user.name, setupToken);

  await audit({ userId: admin.sub, ip: getClientIp(req), action: "trainer.create", entity: "trainer", entityId: user.trainer?.id, meta: { name: user.name, email: user.email } });

  return ok(user.trainer, 201);
});
