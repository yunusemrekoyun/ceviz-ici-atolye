import { NextRequest, NextResponse } from "next/server";
import { processAndSaveImage } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

// Folders each role may write to. Admins/staff are unrestricted.
const ROLE_FOLDERS: Record<string, string[]> = {
  MEMBER:  ["progress"],
  TRAINER: ["progress", "trainers"],
};

export async function POST(req: NextRequest) {
  const user = await requireUser();

  const formData = await req.formData();
  const file   = formData.get("file")   as File   | null;
  const folder = (formData.get("folder") as string) || "general";
  const alt    = (formData.get("alt")    as string) || "";

  if (!file) return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });

  // Role-based folder restriction
  const allowed = ROLE_FOLDERS[user.role];
  if (allowed && !allowed.includes(folder)) {
    return NextResponse.json({ error: "Bu klasöre yükleme yetkiniz yok" }, { status: 403 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Desteklenmeyen dosya türü" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Dosya 10 MB sınırını aşıyor" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { filename, width, height, formats } = await processAndSaveImage(buffer, folder);

  const asset = await prisma.mediaAsset.create({
    data: { filename, folder, alt: alt || null, width, height, formats: formats as object },
  });

  return NextResponse.json(asset, { status: 201 });
}
