import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, err, validate, withHandler, type ApiContext } from "@/lib/api-handler";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { Role } from "@prisma/client";

const patchSchema = z.object({ isActive: z.boolean() });

export const PATCH = withHandler(async (req: NextRequest, ctx: ApiContext) => {
  const admin = await requireAdmin();
  const { id } = (await ctx.params) as { id: string };
  const { data, error } = await validate(patchSchema, req);
  if (error) return error;

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, isActive: true },
  });
  if (!target || (target.role !== Role.ADMIN && target.role !== Role.STAFF)) {
    return err("Personel bulunamadı", 404);
  }

  if (target.id === admin.sub) {
    return err("Kendi hesabını devre dışı bırakamazsın", 400);
  }

  // Son aktif yöneticiyi pasifleştirmeye izin verme
  if (!data.isActive && target.role === Role.ADMIN) {
    const activeAdmins = await prisma.user.count({ where: { role: Role.ADMIN, isActive: true } });
    if (activeAdmins <= 1) return err("Sistemde en az bir aktif yönetici kalmalı", 400);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: data.isActive },
    select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
  });

  await audit({
    userId: admin.sub,
    ip: getClientIp(req),
    action: data.isActive ? "staff.activate" : "staff.deactivate",
    entity: "user",
    entityId: id,
    meta: { email: updated.email },
  });

  return ok(updated);
});
