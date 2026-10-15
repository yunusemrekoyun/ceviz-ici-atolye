import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb.js";
import User from "@/models/User.js";
import RefreshToken from "@/models/RefreshToken.js";
import {
  REFRESH_TOKEN_TTL_DAYS,
  generateRefreshToken,
  hashToken,
  signAccessToken,
  verifyPassword,
} from "@/lib/auth.js";
import { getClientMeta, setAuthCookies } from "@/lib/authSession.js";

const buildUserPayload = (user) => ({
  id: user._id.toString(),
  username: user.username,
  email: user.email,
  role: user.role,
});

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const identifier = String(
    body?.identifier ?? body?.username ?? body?.email ?? ""
  )
    .trim()
    .toLowerCase();
  const password = String(body?.password ?? "");

  if (!identifier || !password) {
    return NextResponse.json(
      { ok: false, error: "Missing credentials" },
      { status: 400 }
    );
  }

  const connection = await connectToDatabase();
  if (!connection) {
    return NextResponse.json(
      { ok: false, error: "Database unavailable" },
      { status: 503 }
    );
  }

  const user = await User.findOne({
    $or: [{ username: identifier }, { email: identifier }],
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Invalid credentials" },
      { status: 401 }
    );
  }

  let passwordOk = false;
  try {
    passwordOk = await verifyPassword(user.passwordHash, password);
  } catch {
    passwordOk = false;
  }

  if (!passwordOk) {
    return NextResponse.json(
      { ok: false, error: "Invalid credentials" },
      { status: 401 }
    );
  }

  const accessToken = await signAccessToken({
    sub: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
  });

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  );
  const { userAgent, ip } = getClientMeta(request);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: refreshTokenHash,
    expiresAt,
    userAgent,
    ip,
  });

  user.lastLoginAt = new Date();
  await user.save();

  const response = NextResponse.json({ ok: true, user: buildUserPayload(user) });
  setAuthCookies(response, { accessToken, refreshToken });

  return response;
}
