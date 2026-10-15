const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { startTestServer, postJson, CONSENT } = require("./helpers");

let server;
let adminToken;
let userToken;

async function login(role, email) {
  const password = `Test-${crypto.randomBytes(6).toString("hex")}!aA1`;
  await mongoose.connection.collection("users").insertOne({
    firstName: "Yasal", lastName: role, email, password: await bcrypt.hash(password, 4), role,
    tokenVersion: 0, addresses: [], refreshTokens: [], createdAt: new Date(), updatedAt: new Date(),
  });
  const res = await postJson(server.base, "/api/v1/auth/login", { email, password });
  assert.equal(res.status, 200);
  return res.data.accessToken;
}

function call(method, path, token, body) {
  return fetch(`${server.base}/api/v1${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (res) => ({ status: res.status, data: await res.json().catch(() => null) }));
}

const LONG = "Bu sözleşme alıcı ile satıcı arasındaki mesafeli satışa ilişkin koşulları düzenler.\n\n# Madde 1\nTaraflar...";

test.before(async () => {
  server = await startTestServer();
  adminToken = await login("admin", "yasal-yonetici@test.local");
  userToken = await login("user", "yasal-musteri@test.local");
});

test.after(async () => {
  await server?.stop();
});

test("yayında metin yokken genel uç boş döner; yalnız yönetici yayınlayabilir", async () => {
  const empty = await call("GET", "/legal");
  assert.equal(empty.status, 200);
  assert.deepEqual(empty.data.documents, {});
  assert.equal((await call("POST", "/legal/admin/distance-sales", null, { title: "Sözleşme", body: LONG })).status, 401);
  assert.equal((await call("POST", "/legal/admin/distance-sales", userToken, { title: "Sözleşme", body: LONG })).status, 403);
  assert.equal((await call("POST", "/legal/admin/bilinmeyen", adminToken, { title: "Sözleşme", body: LONG })).status, 404);
  assert.equal((await call("POST", "/legal/admin/distance-sales", adminToken, { title: "S", body: LONG })).status, 400);
  assert.equal((await call("POST", "/legal/admin/distance-sales", adminToken, { title: "Sözleşme", body: "kısa" })).status, 400);
});

test("her yayın yeni sürüm; aynı metin tekrar yayınlanmaz; eski sürüm okunabilir", async () => {
  const first = await call("POST", "/legal/admin/distance-sales", adminToken, { title: "Mesafeli Satış Sözleşmesi", body: LONG });
  assert.equal(first.status, 201);
  assert.equal(first.data.version, 1);
  const same = await call("POST", "/legal/admin/distance-sales", adminToken, { title: "Mesafeli Satış Sözleşmesi", body: LONG });
  assert.equal(same.status, 409);
  const second = await call("POST", "/legal/admin/distance-sales", adminToken, { title: "Mesafeli Satış Sözleşmesi", body: `${LONG}\nEk madde.` });
  assert.equal(second.data.version, 2);

  const pub = await call("GET", "/legal");
  assert.equal(pub.data.documents["distance-sales"].version, 2);
  assert.match(pub.data.documents["distance-sales"].body, /Ek madde\./);
  assert.equal(pub.data.documents.kvkk, undefined);

  const admin = await call("GET", "/legal/admin", adminToken);
  assert.deepEqual(admin.data.documents["distance-sales"].history.map((h) => h.version), [2, 1]);
  const old = await call("GET", "/legal/admin/distance-sales/1", adminToken);
  assert.equal(old.data.body, LONG);
});

test("sipariş onayı o an yayındaki sözleşme sürümünü kaydeder", async () => {
  const productId = new mongoose.Types.ObjectId();
  await mongoose.connection.collection("products").insertOne({
    _id: productId, name: "Yasal ürün", images: [], imageAssets: [], price: 150, originalPrice: 150, discount: 0,
    category: new mongoose.Types.ObjectId(), sizes: [{ _id: new mongoose.Types.ObjectId(), size: "M", stock: 3 }],
    description: "", parentProductId: null, archivedAt: null, createdAt: new Date(), updatedAt: new Date(),
  });
  await mongoose.connection.collection("shippingmethods").insertOne({ name: "Standart", fee: 10, freeShippingThreshold: null });
  const res = await postJson(server.base, "/api/v1/payment/start-guest", {
    cartItems: [{ id: String(productId), size: "M", qty: 1 }],
    address: { title: "Ev", mainaddress: "Adres 1", street: "Sk", district: "Merkez", city: "Kütahya", postalCode: "43000" },
    guest: { firstName: "Yasal", lastName: "Alıcı", email: "yasal-alici@test.local", phone: "05551234567", registrationAddress: "Adres 1" },
    consent: CONSENT,
  });
  assert.equal(res.status, 200, JSON.stringify(res.data));
  const order = await mongoose.connection.collection("orders").findOne({ conversationId: res.data.conversationId });
  assert.match(order.consent.version, /^ön bilgilendirme: ilk metin, sözleşme: sürüm 2 \(\d{2}\.\d{2}\.\d{4}\)$/);
});
