import crypto from "node:crypto";
import { jsonNoStore } from "@/lib/api";
import { runDaily } from "@/lib/jobs";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.length < 16) return false;
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

/** Sunucudaki cron her gün çağırır: `curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3050/api/cron/daily` */
export async function POST(request: Request): Promise<Response> {
  if (!authorized(request)) return jsonNoStore({ ok: false }, { status: 404 });
  const force = new URL(request.url).searchParams.get("force") === "1";
  const result = runDaily(new Date(), force);
  return jsonNoStore({ ok: result.status !== "failed", ...result });
}
