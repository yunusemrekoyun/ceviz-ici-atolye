const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function getTokenVersion(user) {
  return Number(user?.tokenVersion || 0);
}

function createAccessToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      tokenVersion: getTokenVersion(user),
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
}

function createRefreshToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      tokenVersion: getTokenVersion(user),
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
      jwtid: crypto.randomUUID(),
    }
  );
}

function hashRefreshToken(token) {
  return crypto
    .createHash("sha256")
    .update(String(token || ""))
    .digest("hex");
}

module.exports = {
  COOKIE_OPTIONS,
  createAccessToken,
  createRefreshToken,
  getTokenVersion,
  hashRefreshToken,
};
