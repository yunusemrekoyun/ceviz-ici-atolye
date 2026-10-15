const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createRefreshToken,
  hashRefreshToken,
} = require("../utils/authTokens");

test("yenileme tokenı veritabanı için kararlı ve geri döndürülemez özete çevrilir", () => {
  const token = "header.payload.signature";
  const hash = hashRefreshToken(token);

  assert.equal(hash.length, 64);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hash, hashRefreshToken(token));
  assert.notEqual(hash, token);
});

test("aynı saniyede üretilen yenileme tokenları benzersizdir", () => {
  const previousSecret = process.env.JWT_REFRESH_SECRET;
  const previousExpiry = process.env.JWT_REFRESH_EXPIRES_IN;
  process.env.JWT_REFRESH_SECRET = "unit-test-refresh-secret";
  process.env.JWT_REFRESH_EXPIRES_IN = "7d";

  try {
    const user = { _id: "507f1f77bcf86cd799439011", tokenVersion: 0 };
    assert.notEqual(createRefreshToken(user), createRefreshToken(user));
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_REFRESH_SECRET;
    else process.env.JWT_REFRESH_SECRET = previousSecret;
    if (previousExpiry === undefined) delete process.env.JWT_REFRESH_EXPIRES_IN;
    else process.env.JWT_REFRESH_EXPIRES_IN = previousExpiry;
  }
});
