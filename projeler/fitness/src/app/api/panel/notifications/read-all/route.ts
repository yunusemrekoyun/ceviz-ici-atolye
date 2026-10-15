import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function PATCH() {
  const user = await requireUser();

  await prisma.notification.updateMany({
    where: { userId: user.sub, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
