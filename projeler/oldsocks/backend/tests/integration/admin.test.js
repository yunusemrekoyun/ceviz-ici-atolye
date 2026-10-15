const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { startTestServer, postJson } = require("./helpers");

let server;
let adminToken;
let adminId;

async function createUser(role, email) {
  const password = `Test-${crypto.randomBytes(6).toString("hex")}!aA1`;
  const _id = new mongoose.Types.ObjectId();
  await mongoose.connection.collection("users").insertOne({
    _id,
    firstName: "Test",
    lastName: role === "admin" ? "Yönetici" : "Müşteri",
    email,
    password: await bcrypt.hash(password, 4),
    role,
    tokenVersion: 0,
    addresses: [],
    refreshTokens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { _id, password };
}

async function del(id) {
  const res = await fetch(`${server.base}/api/v1/users/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

test.before(async () => {
  server = await startTestServer();
  const admin = await createUser("admin", "yonetici@test.local");
  adminId = admin._id;
  const login = await postJson(server.base, "/api/v1/auth/login", {
    email: "yonetici@test.local",
    password: admin.password,
  });
  assert.equal(login.status, 200);
  adminToken = login.data.accessToken;
});

test.after(async () => {
  await server?.stop();
});

test("yönetici kendi hesabını silemez", async () => {
  const res = await del(adminId);
  assert.equal(res.status, 400);
  assert.ok(await mongoose.connection.collection("users").findOne({ _id: adminId }));
});

test("geçersiz kimlik 500 yerine 400 döner", async () => {
  const res = await del("gecersiz-kimlik");
  assert.equal(res.status, 400);
});

test("başka bir kullanıcı silinebilir", async () => {
  const user = await createUser("user", "musteri@test.local");
  const res = await del(user._id);
  assert.equal(res.status, 200);
  assert.equal(await mongoose.connection.collection("users").findOne({ _id: user._id }), null);
});
