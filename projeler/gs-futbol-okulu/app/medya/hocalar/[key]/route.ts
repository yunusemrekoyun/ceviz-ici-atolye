import crypto from "node:crypto";
import { can, getCurrentAdmin } from "@/lib/auth/server";
import { readCoachPhoto } from "@/lib/coach-profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  let photo = readCoachPhoto(key);
  if (!photo && can(await getCurrentAdmin(), "ekip.yonet")) photo = readCoachPhoto(key, true);
  if (!photo) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  const etag = `"${crypto.createHash("sha256").update(photo.data).digest("hex")}"`;
  const headers = { "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff", ETag: etag,
    "Cache-Control": photo.published ? "public, max-age=0, must-revalidate" : "private, no-store", Vary: "Cookie" };
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  return new Response(new Uint8Array(photo.data), { headers });
}
