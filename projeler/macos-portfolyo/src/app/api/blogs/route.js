import { NextResponse } from "next/server";

import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/auth.js";
import { getBlogs, saveBlogs } from "@/lib/blogs.js";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getBlogs();
  return NextResponse.json({ ok: true, posts: result.posts, source: result.source });
}

export async function PUT(request) {
  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const payload = await verifyAccessToken(accessToken);

  if (!payload?.sub || payload?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (!Array.isArray(body?.posts)) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const result = await saveBlogs({ posts: body.posts });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 503 });
  }

  return NextResponse.json({ ok: true, posts: result.posts });
}
