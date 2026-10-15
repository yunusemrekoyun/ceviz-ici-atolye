import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { branchSchema } from "@/lib/validators";
import { ok, err, validate, withHandler } from "@/lib/api-handler";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

export const GET = withHandler(async () => {
  await requireAdmin();
  const branches = await prisma.branch.findMany({
    include: { _count: { select: { members: true, attendances: true } } },
    orderBy: { name: "asc" },
  });
  return ok(branches);
});

export const POST = withHandler(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const { data, error } = await validate(branchSchema, req);
  if (error) return error;

  const branch = await prisma.branch.create({ data });
  await audit({ userId: admin.sub, ip: getClientIp(req), action: "branch.create", entity: "branch", entityId: branch.id, meta: { name: branch.name } });
  return ok(branch, 201);
});
