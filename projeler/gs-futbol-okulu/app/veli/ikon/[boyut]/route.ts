import path from "node:path";
import sharp from "sharp";

/** Ana ekran simgesi: beyaz zemin üzerinde okul arması (maskelenebilir: arma güvenli alanın içinde). */
const SIZES = new Set([180, 192, 512]);

export async function GET(_request: Request, ctx: { params: Promise<{ boyut: string }> }): Promise<Response> {
  const size = Number((await ctx.params).boyut);
  if (!SIZES.has(size)) return new Response("Bulunamadı", { status: 404 });
  const crest = await sharp(path.join(process.cwd(), "public/home/crest.webp"))
    .resize(Math.round(size * 0.72), Math.round(size * 0.72), { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();
  const png = await sharp({ create: { width: size, height: size, channels: 4, background: "#ffffff" } })
    .composite([{ input: crest, gravity: "center" }])
    .png()
    .toBuffer();
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" } });
}
