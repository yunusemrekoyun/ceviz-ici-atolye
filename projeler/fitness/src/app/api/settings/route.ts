import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { SYSTEM_SETTINGS_TAG } from "@/lib/settings";

export async function GET() {
  await requireAdmin();
  const settings = await prisma.siteSetting.findMany({ orderBy: [{ group: "asc" }, { key: "asc" }] });
  return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  const body = await req.json();
  const { settings } = body as { settings: { key: string; value: string; type?: string; group?: string }[] };

  if (!Array.isArray(settings)) {
    return NextResponse.json({ error: "settings array gerekli" }, { status: 400 });
  }

  await Promise.all(
    settings.map((s) =>
      prisma.siteSetting.upsert({
        where: { key: s.key },
        create: { key: s.key, value: s.value, type: s.type ?? "text", group: s.group ?? "general" },
        update: { value: s.value },
      })
    )
  );

  // Bakım modu / kayıt kapatma anında etkili olmalı — cache'i bekletme.
  if (settings.some((s) => s.key.startsWith("system."))) {
    revalidateTag(SYSTEM_SETTINGS_TAG);
  }

  await audit({ userId: admin.sub, ip: getClientIp(req), action: "settings.update", entity: "settings", meta: { keys: settings.map((s) => s.key) } });

  return NextResponse.json({ ok: true, count: settings.length });
}
