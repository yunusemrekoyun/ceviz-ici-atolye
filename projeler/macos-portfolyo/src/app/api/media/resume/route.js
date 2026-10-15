import { NextResponse } from "next/server";

import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/auth.js";
import { getResumeConfig, saveResumeConfig } from "@/lib/resume.js";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getResumeConfig();
  return NextResponse.json({ ok: true, resume: result.resume, source: result.source });
}

export async function PUT(request) {
  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const payload = await verifyAccessToken(accessToken);

  if (!payload?.sub || payload?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body?.url !== "string") {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const result = await saveResumeConfig({
    url: body.url,
    publicId: body.publicId,
    fileName: body.fileName,
    bytes: body.bytes,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
  }

  return NextResponse.json({ ok: true, resume: result.resume });
}

