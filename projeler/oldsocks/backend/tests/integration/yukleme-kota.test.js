const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { startTestServer, postJson } = require("./helpers");

let server;

test.before(async () => {
  // Disk güvenlik payı bu makinede testi engellemesin; kota disk kontrolünden önce çalışır.
  server = await startTestServer({ MEDIA_RESERVE_PERCENT: "0", MEDIA_RESERVE_BYTES: "0", MEDIA_OPERATION_MARGIN_BYTES: "0" });
});

test.after(async () => {
  await server?.stop();
});

test("müşteri günde en fazla 10 profil fotoğrafı yüklemesi başlatabilir", async () => {
  const email = `kota-${crypto.randomBytes(3).toString("hex")}@test.local`;
  const password = `Test-${crypto.randomBytes(6).toString("hex")}!aA1`;
  await mongoose.connection.collection("users").insertOne({
    firstName: "Kota", lastName: "Müşteri", email, password: await bcrypt.hash(password, 4),
    role: "user", tokenVersion: 0, addresses: [], refreshTokens: [], createdAt: new Date(), updatedAt: new Date(),
  });
  const token = (await postJson(server.base, "/api/v1/auth/login", { email, password })).data.accessToken;
  const start = (i) =>
    postJson(
      server.base,
      "/api/v1/media/uploads",
      { purpose: "profile_image", fileName: `foto-${i}.jpg`, mime: "image/jpeg", bytes: 200_000, clientUploadId: `kota-${i}-${crypto.randomBytes(4).toString("hex")}` },
      { Authorization: `Bearer ${token}` }
    );
  for (let i = 0; i < 10; i += 1) {
    const res = await start(i);
    assert.ok([200, 201].includes(res.status), `${i}: ${res.status} ${JSON.stringify(res.data)}`);
  }
  const over = await start(10);
  assert.equal(over.status, 429);
  assert.match(over.data.message, /Günlük yükleme sınırına/);

  const product = await start("urun");
  assert.ok(product.status === 429 || product.status === 403);
});
