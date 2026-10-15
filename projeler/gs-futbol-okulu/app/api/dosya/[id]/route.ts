import { getCurrentUser } from "@/lib/auth/server";
import { canViewFile } from "@/lib/file-access";
import { getFile, readFileData } from "@/lib/files";

export const dynamic = "force-dynamic";

function notFound(): Response {
  return new Response("Bulunamadı", { status: 404, headers: { "Cache-Control": "no-store" } });
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return new Response("Oturum gerekli", { status: 401, headers: { "Cache-Control": "no-store" } });
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return notFound();
  const file = getFile(id);
  // Yetkisiz kullanıcıya dosyanın var olup olmadığı da söylenmez.
  if (!file || !canViewFile(user, file)) return notFound();
  const data = readFileData(file);
  if (!data) return notFound();
  const ext = file.mime === "application/pdf" ? "pdf" : "jpg";
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(data.length),
      "Content-Disposition": `inline; filename="${file.kind}-${file.id}.${ext}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
