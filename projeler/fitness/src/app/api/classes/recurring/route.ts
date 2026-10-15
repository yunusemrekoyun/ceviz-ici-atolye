import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { ok, validate, withHandler } from "@/lib/api-handler";

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  trainerId: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  capacity: z.number().int().min(1).max(200).default(20),
  durationMin: z.number().int().min(15).max(480).default(60),
  color: z.string().default("#C6FF3D"),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  isPublished: z.boolean().default(false),
  weeks: z.number().int().min(2).max(52),
});

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Aynı dersi haftalık olarak N kez oluşturur (bağımsız kayıtlar).
export const POST = withHandler(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const { data, error } = await validate(schema, req);
  if (error) return error;

  const { weeks, startAt, endAt, ...base } = data;
  const startMs = new Date(startAt).getTime();
  const endMs = new Date(endAt).getTime();
  const recurringDay = new Date(startAt).getUTCDay();

  const created = await Promise.all(
    Array.from({ length: weeks }, (_, i) =>
      prisma.groupClass.create({
        data: {
          ...base,
          startAt: new Date(startMs + i * WEEK_MS),
          endAt: new Date(endMs + i * WEEK_MS),
          isRecurring: true,
          recurringDay,
        },
        include: { trainer: { include: { user: { select: { name: true } } } } },
      })
    )
  );

  await audit({
    userId: admin.sub,
    ip: getClientIp(req),
    action: "class.create_recurring",
    entity: "groupClass",
    meta: { title: base.title, weeks, from: startAt },
  });

  return ok({ classes: created, count: created.length }, 201);
});
