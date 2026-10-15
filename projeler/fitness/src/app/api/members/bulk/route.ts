import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { ok, err, validate, withHandler } from "@/lib/api-handler";
import { MemberStatus } from "@prisma/client";

const bulkSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("status"),
    ids: z.array(z.string()).min(1, "En az bir üye seçmelisin"),
    status: z.nativeEnum(MemberStatus),
  }),
  z.object({
    action: z.literal("notify"),
    ids: z.array(z.string()).min(1, "En az bir üye seçmelisin"),
    title: z.string().min(1, "Başlık zorunlu"),
    body: z.string().min(1, "Mesaj zorunlu"),
    type: z.string().optional(),
  }),
]);

export const POST = withHandler(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const { data, error } = await validate(bulkSchema, req);
  if (error) return error;

  if (data.action === "status") {
    const res = await prisma.member.updateMany({
      where: { id: { in: data.ids } },
      data: { status: data.status },
    });
    await audit({
      userId: admin.sub,
      ip: getClientIp(req),
      action: "member.bulk_status",
      entity: "member",
      meta: { count: res.count, status: data.status, ids: data.ids },
    });
    return ok({ count: res.count });
  }

  // notify
  const members = await prisma.member.findMany({
    where: { id: { in: data.ids } },
    select: { user: { select: { id: true } } },
  });
  if (members.length === 0) return err("Seçilen üye bulunamadı", 404);

  await prisma.notification.createMany({
    data: members.map((m) => ({
      userId: m.user.id,
      title: data.title.trim(),
      body: data.body.trim(),
      type: data.type ?? "info",
    })),
  });
  await audit({
    userId: admin.sub,
    ip: getClientIp(req),
    action: "member.bulk_notify",
    entity: "notification",
    meta: { count: members.length, title: data.title.trim() },
  });
  return ok({ count: members.length });
});
