import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, withHandler } from "@/lib/api-handler";
import { Role } from "@prisma/client";

export const GET = withHandler(async (req: NextRequest) => {
  await requireAdmin();

  const sp = req.nextUrl.searchParams;
  const userId = sp.get("userId") || undefined;
  const role = sp.get("role") as Role | null;
  const take = Math.min(200, Math.max(1, parseInt(sp.get("take") ?? "100", 10)));

  const sessions = await prisma.session.findMany({
    where: {
      ...(userId ? { userId } : {}),
      ...(role ? { user: { role } } : {}),
    },
    include: { user: { select: { name: true, email: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });

  return ok({ sessions });
});
