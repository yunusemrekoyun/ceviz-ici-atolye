/* eslint-env node */
import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "crypto";
import argon2 from "argon2";

const accessSecret = process.env.JWT_ACCESS_SECRET || "";
const accessSecretKey = new TextEncoder().encode(accessSecret);

const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 900);
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);

const ACCESS_COOKIE_NAME = "access_token";
const REFRESH_COOKIE_NAME = "refresh_token";

const isProd = process.env.NODE_ENV === "production";
const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

const accessCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax",
  path: "/",
  maxAge: ACCESS_TOKEN_TTL_SECONDS,
  domain: cookieDomain,
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax",
  path: "/api/auth",
  maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
  domain: cookieDomain,
};

const hashToken = (token) =>
  createHash("sha256").update(token).digest("hex");

const generateRefreshToken = () => randomBytes(64).toString("base64url");

const hashPassword = async (password) =>
  argon2.hash(password, { type: argon2.argon2id });

const verifyPassword = async (hash, password) =>
  argon2.verify(hash, password);

const signAccessToken = async (payload) => {
  if (!accessSecret) {
    throw new Error("JWT_ACCESS_SECRET is not set");
  }

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(accessSecretKey);
};

const verifyAccessToken = async (token) => {
  if (!token || !accessSecret) return null;
  try {
    const { payload } = await jwtVerify(token, accessSecretKey);
    return payload;
  } catch {
    return null;
  }
};

export {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_DAYS,
  accessCookieOptions,
  refreshCookieOptions,
  hashPassword,
  verifyPassword,
  hashToken,
  generateRefreshToken,
  signAccessToken,
  verifyAccessToken,
};
