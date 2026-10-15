import { desc, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { jobRuns } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * Sağlık kontrolü (izleme servisi / uptime için). Kişisel veri döndürmez:
 * veritabanı yanıt veriyor mu, günlük iş en son ne zaman başarılı çalıştı.
 */
export async function GET(): Promise<Response> {
  try {
    const db = getDb();
    db.get(sql`select 1`);
    const last = db.select({ key: jobRuns.runKey, status: jobRuns.status }).from(jobRuns).orderBy(desc(jobRuns.startedAt)).limit(1).get();
    const stale = !last || Date.parse(`${last.key}T00:00:00+03:00`) < Date.now() - 2 * 86_400_000;
    return Response.json({ ok: true, db: "ok", dailyJob: last ? { day: last.key, status: last.status } : null, dailyJobStale: stale }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, db: "error" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
