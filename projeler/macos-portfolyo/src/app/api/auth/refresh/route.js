import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb.js";
import User from "@/models/User.js";
import RefreshToken from "@/models/RefreshToken.js";
import {
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_TTL_DAYS,
  generateRefreshToken,
  hashToken,
  signAccessToken,
} from "@/lib/auth.js";
import {
  clearAuthCookies,
  getClientMeta,
  setAuthCookies,
} from "@/lib/authSession.js";

const buildUnauthorized = (message) => {
  const response = NextResponse.json(
    { ok: false, error: message },
    { status: 401 }
  );
  clearAuthCookies(response);
  return response;
};

export async function POST(request) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (!refreshToken) {
    return buildUnauthorized("Refresh token missing");
  }

  const connection = await connectToDatabase();
  if (!connection) {
    return NextResponse.json(
      { ok: false, error: "Database unavailable" },
      { status: 503 }
    );
  }

  const refreshTokenHash = hashToken(refreshToken);
  const tokenDoc = await RefreshToken.findOne({ tokenHash: refreshTokenHash });
  if (!tokenDoc) {
    return buildUnauthorized("Invalid refresh token");
  }

  const now = new Date();
  if (tokenDoc.revokedAt) {
    await RefreshToken.updateMany(
      { userId: tokenDoc.userId, revokedAt: null },
      { $set: { revokedAt: now } }
    );
    return buildUnauthorized("Refresh token revoked");
  }

  if (tokenDoc.expiresAt <= now) {
    tokenDoc.revokedAt = now;
    await tokenDoc.save();
    return buildUnauthorized("Refresh token expired");
  }

  const user = await User.findById(tokenDoc.userId);
  if (!user) {
    tokenDoc.revokedAt = now;
    await tokenDoc.save();
    return buildUnauthorized("User not found");
  }

  const nextRefreshToken = generateRefreshToken();
  const nextRefreshHash = hashToken(nextRefreshToken);
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  );
  const { userAgent, ip } = getClientMeta(request);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: nextRefreshHash,
    expiresAt,
    userAgent,
    ip,
  });

  tokenDoc.revokedAt = now;
  tokenDoc.replacedByTokenHash = nextRefreshHash;
  await tokenDoc.save();

  const accessToken = await signAccessToken({
    sub: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
  });

  const response = NextResponse.json({ ok: true });
  setAuthCookies(response, {
    accessToken,
    refreshToken: nextRefreshToken,
  });
  return response;
}
