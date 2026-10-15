import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb.js";
import RefreshToken from "@/models/RefreshToken.js";
import { REFRESH_COOKIE_NAME, hashToken } from "@/lib/auth.js";
import { clearAuthCookies } from "@/lib/authSession.js";

export async function POST(request) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (refreshToken) {
    const connection = await connectToDatabase();
    if (connection) {
      const refreshHash = hashToken(refreshToken);
      await RefreshToken.updateOne(
        { tokenHash: refreshHash, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
    }
  }

  const accept = request.headers.get("accept") ?? "";
  const isHtml = accept.includes("text/html");

  if (isHtml) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    clearAuthCookies(response);
    return response;
  }

  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
