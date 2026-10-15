import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, withHandler } from "@/lib/api-handler";

export const GET = withHandler(async (req: NextRequest) => {
  await requireAdmin();

  const sp = req.nextUrl.searchParams;
  const entity = sp.get("entity") || undefined;
  const action = sp.get("action") || undefined;
  const userId = sp.get("userId") || undefined;
  const skip = Math.max(0, parseInt(sp.get("skip") ?? "0", 10));
  const take = Math.min(100, Math.max(1, parseInt(sp.get("take") ?? "50", 10)));

  const where = {
    ...(entity ? { entity } : {}),
    ...(action ? { action } : {}),
    ...(userId ? { userId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return ok({ items, total });
});
