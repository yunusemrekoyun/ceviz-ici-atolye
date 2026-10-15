import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb.js";
import User from "@/models/User.js";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/auth.js";

const buildUserPayload = (user) => ({
  id: user._id.toString(),
  username: user.username,
  email: user.email,
  role: user.role,
  lastLoginAt: user.lastLoginAt,
});

export async function GET(request) {
  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const payload = await verifyAccessToken(accessToken);

  if (!payload?.sub) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const connection = await connectToDatabase();
  if (!connection) {
    return NextResponse.json(
      { ok: false, error: "Database unavailable" },
      { status: 503 }
    );
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  return NextResponse.json({ ok: true, user: buildUserPayload(user) });
}
