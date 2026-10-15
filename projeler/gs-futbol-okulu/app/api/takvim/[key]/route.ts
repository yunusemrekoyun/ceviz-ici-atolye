import { eq } from "drizzle-orm";
import { todayKey } from "@/lib/billing";
import { buildIcs, parseCalendarKey } from "@/lib/calendar-feed";
import { addDaysTo } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { ageGroups } from "@/lib/db/schema";
import { ensureSessionsWindow, listSessions } from "@/lib/program";

export const dynamic = "force-dynamic";

/** Grup antrenman takvimi aboneliği (webcal). Anahtar imzalı; yalnız grup programını içerir. */
export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }): Promise<Response> {
  const key = (await ctx.params).key.replace(/\.ics$/, "");
  const groupId = parseCalendarKey(key);
  const group = groupId ? getDb().select().from(ageGroups).where(eq(ageGroups.id, groupId)).get() : null;
  if (!group) return new Response("Bulunamadı", { status: 404 });
  ensureSessionsWindow();
  const today = todayKey();
  const sessions = listSessions({ from: addDaysTo(today, -14), to: addDaysTo(today, 35), groupIds: [group.id], includeCancelled: true });
  return new Response(buildIcs(group.name, sessions), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `inline; filename="antrenman-${group.id}.ics"`, "Cache-Control": "no-store" },
  });
}
