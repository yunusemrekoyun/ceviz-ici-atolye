import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ImageResponse } from "next/og";
import { BRAND_NAME } from "@/lib/constants";

export const alt = `${BRAND_NAME}: yaşına uygun gruplar, antrenman programı ve online ön kayıt`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const root = process.cwd();
  const [display, body, ball, crest] = await Promise.all([
    fs.readFile(path.join(root, "assets/og/teko-600.ttf")),
    fs.readFile(path.join(root, "assets/og/ubuntu-400.ttf")),
    sharp(path.join(root, "public/home/football.svg")).resize(360, 360).png().toBuffer(),
    sharp(path.join(root, "public/home/crest.webp")).png().toBuffer(),
  ]);
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", padding: 20, background: "#eeecee", fontFamily: "Ubuntu" }}>
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: 44, border: "1px solid #ded9dc", borderRadius: 20, background: "white", position: "relative", color: "#252328" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={`data:image/png;base64,${crest.toString("base64")}`} width={54} height={54} alt="" style={{ borderRadius: 27 }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: "Teko", fontSize: 34, lineHeight: 1, color: "#941d3b" }}>KÜTAHYA GALATASARAY</span>
            <span style={{ fontSize: 13, marginTop: 4, color: "#625c62" }}>Futbol Okulu</span>
          </div>
        </div>
        <span style={{ fontFamily: "Teko", fontSize: 100, lineHeight: 1, color: "#941d3b", marginTop: 52 }}>FUTBOL OKULU</span>
        <span style={{ fontFamily: "Teko", fontSize: 42, marginTop: 12 }}>Her şey bir ilk pasla başlar.</span>
        <span style={{ fontSize: 20, lineHeight: 1.6, width: 470, marginTop: 8, color: "#625c62" }}>Doğum yılına göre gruplar, antrenman günleri ve saha bilgisi.</span>
        <div style={{ display: "flex", position: "absolute", right: 58, top: 144, width: 360, height: 360, borderRadius: 180, background: "#f5f3f3" }}>
          <img src={`data:image/png;base64,${ball.toString("base64")}`} width={360} height={360} alt=""/>
        </div>
        <div style={{ display: "flex", position: "absolute", bottom: 43, left: 44, borderRadius: 6, padding: "16px 28px", color: "white", background: "#941d3b", fontSize: 18 }}>Ön kayıt yap →</div>
        <div style={{ display: "flex", position: "absolute", left: 0, right: 0, bottom: 0, height: 8, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, background: "linear-gradient(90deg,#941d3b 50%,#fdb912 50%)" }}/>
      </div>
    </div>,
    { ...size, fonts: [{ name: "Teko", data: display, weight: 600 }, { name: "Ubuntu", data: body, weight: 400 }] },
  );
}
