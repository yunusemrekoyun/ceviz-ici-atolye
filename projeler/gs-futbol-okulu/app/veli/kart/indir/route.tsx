/* eslint-disable @next/next/no-img-element -- next/og (satori) resmi yalnız <img> ile çizer */
import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";
import { ImageResponse } from "next/og";
import { headers } from "next/headers";
import { listAgeGroups } from "@/lib/age-groups-db";
import { getCurrentUser } from "@/lib/auth/server";
import { cardPath, ensureCard } from "@/lib/cards";
import { getFile, readFileData } from "@/lib/files";
import { guardianCanSee } from "@/lib/guardians";
import { hasPhotoConsent } from "@/lib/legal";
import { getRegistration } from "@/lib/registrations";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

const RED = "#941d3b";
const YELLOW = "#fdb912";
const INK = "#252328";
const MUTED = "#625c62";

const png = (buf: Buffer) => `data:image/png;base64,${buf.toString("base64")}`;

/** Dijital kartın indirilebilir resmi (kredi kartı oranında PNG). Yalnız çocuğun velisi indirir. */
export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user || user.portal !== "guardian") return new Response("Oturum gerekli", { status: 401, headers: { "Cache-Control": "no-store" } });
  const id = Number(new URL(request.url).searchParams.get("ogrenci"));
  const reg = Number.isInteger(id) && id > 0 && guardianCanSee(user.id, id) ? getRegistration(id) : null;
  if (!reg || reg.status !== "enrolled") return new Response("Bulunamadı", { status: 404, headers: { "Cache-Control": "no-store" } });

  const card = ensureCard(reg.id, null);
  const url = `${getSiteUrl(await headers())}${cardPath(card.code)}`;
  const root = process.cwd();
  const [teko, ubuntu, crest, qr] = await Promise.all([
    fs.readFile(path.join(root, "assets/og/teko-600.ttf")),
    fs.readFile(path.join(root, "assets/og/ubuntu-400.ttf")),
    sharp(path.join(root, "public/home/crest.webp")).resize(160, 160).png().toBuffer(),
    QRCode.toBuffer(url, { type: "png", width: 600, margin: 1, errorCorrectionLevel: "M" }),
  ]);
  let photo: string | null = null;
  if (reg.photoFileId && hasPhotoConsent(reg.id)) {
    const file = getFile(reg.photoFileId);
    const data = file ? readFileData(file) : null;
    if (data) photo = png(await sharp(data).rotate().resize(240, 300, { fit: "cover" }).png().toBuffer());
  }
  const group = listAgeGroups().find((g) => g.id === reg.groupId);

  const image = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#ffffff", fontFamily: "Ubuntu", color: INK }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22, height: 130, padding: "0 40px", background: RED, color: "#ffffff" }}>
          <img src={png(crest)} width={84} height={84} style={{ borderRadius: 999, background: "#ffffff" }} alt="" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: "Teko", fontSize: 60, lineHeight: 1 }}>KÜTAHYA GALATASARAY</span>
            <span style={{ fontSize: 22, color: YELLOW }}>Futbol Okulu · Öğrenci kartı</span>
          </div>
        </div>
        <div style={{ display: "flex", height: 10 }}>
          <div style={{ flex: 1, background: RED }} />
          <div style={{ flex: 1, background: YELLOW }} />
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 36, padding: "0 40px" }}>
          {photo ? <img src={photo} width={200} height={250} style={{ borderRadius: 14, objectFit: "cover" }} alt="" /> : null}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <span style={{ fontFamily: "Teko", fontSize: reg.studentFullName.length > 18 ? 58 : 70, lineHeight: 1 }}>{reg.studentFullName}</span>
            <span style={{ fontSize: 26, color: MUTED, marginTop: 6 }}>{group?.name ?? ""}</span>
            <span style={{ fontSize: 20, color: MUTED, marginTop: 34, letterSpacing: 2 }}>ÖĞRENCİ NO</span>
            <span style={{ fontFamily: "Teko", fontSize: 92, lineHeight: 1, color: RED }}>{reg.studentNo ? String(reg.studentNo) : "—"}</span>
          </div>
          <img src={png(qr)} width={300} height={300} alt="" />
        </div>
      </div>
    ),
    {
      width: 1012,
      height: 638,
      fonts: [
        { name: "Teko", data: teko, weight: 600, style: "normal" },
        { name: "Ubuntu", data: ubuntu, weight: 400, style: "normal" },
      ],
    },
  );
  const body = await image.arrayBuffer();
  const name = `kgs-kart-${reg.studentNo ?? reg.id}.png`;
  return new Response(body, { headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" } });
}
