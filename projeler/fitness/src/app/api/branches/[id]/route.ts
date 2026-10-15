import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { branchSchema } from "@/lib/validators";
import { ok, err, validate, withHandler } from "@/lib/api-handler";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withHandler(async (_req: NextRequest, ctx?: any) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const branch = await prisma.branch.findUnique({
    where: { id },
    include: { _count: { select: { members: true, attendances: true } } },
  });
  if (!branch) return err("Şube bulunamadı", 404);
  return ok(branch);
});

export const PATCH = withHandler(async (req: NextRequest, ctx?: any) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const { data, error } = await validate(branchSchema.partial(), req);
  if (error) return error;

  const branch = await prisma.branch.update({ where: { id }, data });
  await audit({ userId: admin.sub, ip: getClientIp(req), action: "branch.update", entity: "branch", entityId: id, meta: { fields: Object.keys(data) } });
  return ok(branch);
});

export const DELETE = withHandler(async (req: NextRequest, ctx?: any) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;

  const memberCount = await prisma.member.count({ where: { branchId: id } });
  if (memberCount > 0) {
    return err(`Bu şubede ${memberCount} üye kayıtlı. Önce üyeleri başka şubeye taşıyın.`, 409);
  }

  await prisma.branch.delete({ where: { id } });
  await audit({ userId: admin.sub, ip: getClientIp(req), action: "branch.delete", entity: "branch", entityId: id });
  return ok({ ok: true });
});
