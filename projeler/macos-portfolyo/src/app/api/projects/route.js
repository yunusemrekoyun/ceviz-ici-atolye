import { NextResponse } from "next/server";

import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/auth.js";
import { getProjects, saveProjects } from "@/lib/projects.js";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getProjects();
  return NextResponse.json({
    ok: true,
    projects: result.projects,
    projectFolders: result.projectFolders,
    source: result.source,
  });
}

export async function PUT(request) {
  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const payload = await verifyAccessToken(accessToken);

  if (!payload?.sub || payload?.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => ({}));
  if (!Array.isArray(body?.projects)) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload" },
      { status: 400 }
    );
  }

  const projectFolders = Array.isArray(body?.projectFolders)
    ? body.projectFolders
    : [];
  const result = await saveProjects({
    projects: body.projects,
    projectFolders,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    projects: result.projects,
    projectFolders: result.projectFolders,
  });
}
