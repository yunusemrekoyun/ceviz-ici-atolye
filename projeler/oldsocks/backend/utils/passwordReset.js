const crypto = require("crypto");

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

function createPasswordResetToken() {
  return crypto.randomBytes(RESET_TOKEN_BYTES).toString("hex");
}

function hashPasswordResetToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function getPasswordResetExpiryDate() {
  return new Date(Date.now() + RESET_TOKEN_TTL_MS);
}

module.exports = {
  RESET_TOKEN_TTL_MS,
  createPasswordResetToken,
  getPasswordResetExpiryDate,
  hashPasswordResetToken,
};
