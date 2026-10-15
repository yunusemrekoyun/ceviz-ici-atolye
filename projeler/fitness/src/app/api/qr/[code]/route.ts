import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const svg = await QRCode.toString(code, {
    type: "svg",
    margin: 1,
    color: { dark: "#0a0a0f", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
