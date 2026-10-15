const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { startTestServer, postJson } = require("./helpers");

let server;
let adminToken;
const db = () => mongoose.connection;

async function call(method, pathName, body) {
  const res = await fetch(`${server.base}${pathName}`, {
    method,
    headers: { Authorization: `Bearer ${adminToken}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

test.before(async () => {
  server = await startTestServer();
  const password = `Test-${crypto.randomBytes(6).toString("hex")}!aA1`;
  await db().collection("users").insertOne({
    _id: new mongoose.Types.ObjectId(),
    firstName: "Test",
    lastName: "Yönetici",
    email: "kampanya-yonetici@test.local",
    password: await bcrypt.hash(password, 4),
    role: "admin",
    tokenVersion: 0,
    addresses: [],
    refreshTokens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const login = await postJson(server.base, "/api/v1/auth/login", { email: "kampanya-yonetici@test.local", password });
  assert.equal(login.status, 200);
  adminToken = login.data.accessToken;
});

test.after(async () => {
  await server?.stop();
});

test("aktif kampanya yeniden pasif yapılabilir ve vitrinden kalkar", async () => {
  const _id = new mongoose.Types.ObjectId();
  await db().collection("campaigns").insertOne({
    _id, title: "Yaz", subtitle: "", buttonText: "İncele", imageUrl: "", imageAsset: null,
    products: [], categories: [], isActive: false, overlayOpacity: 0, buttonOpacity: 30,
  });

  assert.equal((await call("PATCH", `/api/v1/campaigns/${_id}/activate`)).status, 200);
  const shown = await (await fetch(`${server.base}/api/v1/campaigns/active`)).json();
  assert.equal(String(shown?._id), String(_id));

  const off = await call("PATCH", `/api/v1/campaigns/${_id}/deactivate`);
  assert.equal(off.status, 200);
  assert.equal((await db().collection("campaigns").findOne({ _id })).isActive, false);
  const after = await (await fetch(`${server.base}/api/v1/campaigns/active`)).json().catch(() => null);
  assert.notEqual(String(after?._id), String(_id));

  assert.equal((await call("PATCH", `/api/v1/campaigns/${new mongoose.Types.ObjectId()}/deactivate`)).status, 404);
});

test("mini kampanya yayından kaldırılabilir ve slotsuz kaydedilebilir", async () => {
  const category = new mongoose.Types.ObjectId();
  await db().collection("categories").insertOne({ _id: category, name: "Mini Kat", parent: null, archivedAt: null });
  const a = new mongoose.Types.ObjectId();
  await db().collection("minicampaigns").insertOne({ _id: a, title: "A", imageUrl: "", imageAsset: null, products: [], categories: [category], slot: 1 });

  const off = await call("PATCH", `/api/v1/mini-campaigns/${a}/deactivate`);
  assert.equal(off.status, 200);
  assert.equal((await db().collection("minicampaigns").findOne({ _id: a })).slot, null);
  const active = await (await fetch(`${server.base}/api/v1/mini-campaigns/active?slot=1`)).json().catch(() => null);
  assert.notEqual(String(active?._id), String(a));

  // Slota geri alınır; sonra düzenleme formundan "yayında değil" (boş slot) ile kaydedilir.
  assert.equal((await call("PATCH", `/api/v1/mini-campaigns/${a}/activate?slot=2`)).status, 200);
  assert.equal((await db().collection("minicampaigns").findOne({ _id: a })).slot, 2);
  const saved = await call("PUT", `/api/v1/mini-campaigns/${a}`, { title: "A2", slot: "", products: [], categories: [String(category)] });
  assert.equal(saved.status, 200);
  const doc = await db().collection("minicampaigns").findOne({ _id: a });
  assert.equal(doc.title, "A2");
  assert.equal(doc.slot, null);

  // Slotsuz kayıt başka kampanyayı slotundan düşürmez.
  const b = new mongoose.Types.ObjectId();
  await db().collection("minicampaigns").insertOne({ _id: b, title: "B", imageUrl: "", imageAsset: null, products: [], categories: [category], slot: 1 });
  assert.equal((await call("PUT", `/api/v1/mini-campaigns/${a}`, { title: "A3", slot: "", products: [], categories: [String(category)] })).status, 200);
  assert.equal((await db().collection("minicampaigns").findOne({ _id: b })).slot, 1);
});
