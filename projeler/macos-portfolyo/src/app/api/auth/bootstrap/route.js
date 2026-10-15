import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb.js";
import User from "@/models/User.js";
import { hashPassword } from "@/lib/auth.js";

export async function POST(request) {
  const bootstrapSecret = process.env.BOOTSTRAP_TOKEN;
  if (!bootstrapSecret) {
    return NextResponse.json(
      { ok: false, error: "BOOTSTRAP_TOKEN is not set" },
      { status: 500 }
    );
  }

  let token = null;
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }

  if (!token) {
    const body = await request.json().catch(() => ({}));
    token = body?.token ?? null;
  }

  if (token !== bootstrapSecret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_USERNAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return NextResponse.json(
      { ok: false, error: "Admin credentials are not set" },
      { status: 500 }
    );
  }

  await connectToDatabase();

  const existing = await User.countDocuments();
  if (existing > 0) {
    return NextResponse.json(
      { ok: false, error: "Admin already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  const user = await User.create({
    username: ADMIN_USERNAME,
    email: ADMIN_EMAIL,
    passwordHash,
    role: "admin",
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
    },
  });
}
