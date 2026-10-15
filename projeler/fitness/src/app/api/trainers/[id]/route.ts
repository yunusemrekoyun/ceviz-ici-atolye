import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { trainerUpdateSchema } from "@/lib/validators";
import { ok, err, validate, withHandler } from "@/lib/api-handler";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withHandler(async (_req: NextRequest, ctx?: any) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const trainer = await prisma.trainer.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, avatarUrl: true, phone: true } },
      _count: { select: { members: true, appointments: true } },
      availabilities: { orderBy: { dayOfWeek: "asc" } },
      members: {
        take: 10,
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!trainer) return err("Eğitmen bulunamadı", 404);
  return ok(trainer);
});

export const PATCH = withHandler(async (req: NextRequest, ctx?: any) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const { data, error } = await validate(trainerUpdateSchema, req);
  if (error) return error;

  const trainer = await prisma.trainer.findUnique({ where: { id }, select: { userId: true } });
  if (!trainer) return err("Eğitmen bulunamadı", 404);

  const { name, avatarUrl, isActive, ...trainerData } = data;

  const [, updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: trainer.userId },
      data: { ...(name ? { name } : {}), ...(avatarUrl !== undefined ? { avatarUrl } : {}) },
    }),
    prisma.trainer.update({
      where: { id },
      data: { ...trainerData, ...(isActive !== undefined ? { isActive } : {}) },
      include: {
        user: { select: { name: true, email: true, avatarUrl: true } },
        _count: { select: { members: true, appointments: true } },
        availabilities: true,
      },
    }),
  ]);

  await audit({ userId: admin.sub, ip: getClientIp(req), action: "trainer.update", entity: "trainer", entityId: id, meta: { fields: Object.keys(data) } });

  return ok(updated);
});

export const DELETE = withHandler(async (req: NextRequest, ctx?: any) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;

  const memberCount = await prisma.member.count({ where: { trainerId: id } });
  if (memberCount > 0) return err(`Bu eğitmene bağlı ${memberCount} üye var. Önce üyeleri güncellleyin.`, 409);

  const trainer = await prisma.trainer.findUnique({ where: { id }, select: { userId: true } });
  if (!trainer) return err("Eğitmen bulunamadı", 404);

  await prisma.user.delete({ where: { id: trainer.userId } });

  await audit({ userId: admin.sub, ip: getClientIp(req), action: "trainer.delete", entity: "trainer", entityId: id });

  return ok({ ok: true });
});
