import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { ok, err, validate, withHandler, type ApiContext } from "@/lib/api-handler";

const schema = z.object({ bookingId: z.string() });

// Admin bir bekleme listesi kaydını manuel onaylar (kontenjanı aşabilir — kasıtlı).
export const POST = withHandler(async (req: NextRequest, ctx: ApiContext) => {
  const admin = await requireAdmin();
  const { id } = (await ctx.params) as { id: string };
  const { data, error } = await validate(schema, req);
  if (error) return error;

  const booking = await prisma.classBooking.findFirst({
    where: { id: data.bookingId, classId: id, status: "WAITLIST" },
    include: {
      member: { select: { userId: true } },
      class: { select: { title: true } },
    },
  });
  if (!booking) return err("Bekleme listesinde kayıt bulunamadı", 404);

  const updated = await prisma.classBooking.update({
    where: { id: booking.id },
    data: { status: "CONFIRMED" },
  });

  await prisma.notification.create({
    data: {
      userId: booking.member.userId,
      title: "Ders yerin onaylandı",
      body: `"${booking.class.title}" dersinde bekleme listesinden kaydın onaylandı.`,
      type: "success",
    },
  });

  await audit({
    userId: admin.sub,
    ip: getClientIp(req),
    action: "class.promote_waitlist",
    entity: "classBooking",
    entityId: booking.id,
    meta: { classId: id },
  });

  return ok({ booking: updated });
});
