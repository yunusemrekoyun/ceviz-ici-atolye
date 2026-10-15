import { SignJWT, jwtVerify, type JWTPayload } from "jose";

function getSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET;
  if (!raw && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET env var is required in production");
  }
  return new TextEncoder().encode(raw ?? "dev-secret-change-me-please-use-min-32-chars-xxxxxxxx");
}

export type AuthPayload = JWTPayload & {
  sub: string;
  email: string;
  role: "ADMIN" | "STAFF" | "TRAINER" | "MEMBER";
  name: string;
};

export async function signToken(payload: Omit<AuthPayload, "iat" | "exp">): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN || "7d")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as AuthPayload;
  } catch {
    return null;
  }
}
