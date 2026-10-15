import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const MIME: Record<string, string> = {
  avif: "image/avif",
  webp: "image/webp",
  jpeg: "image/jpeg",
  jpg:  "image/jpeg",
  png:  "image/png",
  gif:  "image/gif",
};

function resolveUploadRoot(): string {
  const dir = process.env.UPLOAD_DIR ?? "public/uploads";
  return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
}

// In production, nginx should serve uploads directly — this route acts as fallback.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;

  // Prevent path traversal
  const joined = segments.map((s) => s.replace(/\.\./g, "")).join("/");
  const filepath = path.join(resolveUploadRoot(), joined);

  // Extra guard: ensure resolved path is still inside upload root
  if (!filepath.startsWith(resolveUploadRoot())) {
    return NextResponse.json({ error: "Geçersiz yol" }, { status: 400 });
  }

  try {
    const buffer = await fs.readFile(filepath);
    const ext = filepath.split(".").pop()?.toLowerCase() ?? "jpeg";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }
}
