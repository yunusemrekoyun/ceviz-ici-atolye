const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { startTestServer, postJson, paytrCallback } = require("./helpers");

let server;
let token;

async function adminToken() {
  const password = `Admin-${crypto.randomBytes(5).toString("hex")}!aA1`;
  await mongoose.connection.collection("users").insertOne({
    firstName: "Liste", lastName: "Yönetici", email: "liste-admin@test.local",
    password: await bcrypt.hash(password, 4), role: "admin", tokenVersion: 0, refreshTokens: [], addresses: [],
  });
  return (await postJson(server.base, "/api/v1/auth/login", { email: "liste-admin@test.local", password })).data.accessToken;
}

function order(i, extra = {}) {
  return {
    orderNumber: String(2000000000 + i),
    guest: { firstName: i === 7 ? "Zeynep" : "Misafir", lastName: `No${i}`, email: `m${i}@test.local`, phone: `+9055500000${String(i).padStart(2, "0")}` },
    items: [{ productId: new mongoose.Types.ObjectId(), name: "Ürün", price: 100, qty: 1 }],
    totalPrice: 100,
    address: { title: "Ev", mainaddress: "x", street: "y", city: "Kütahya" },
    conversationId: `LISTE${i}${crypto.randomBytes(3).toString("hex")}`,
    status: i % 3 === 0 ? "pending" : "paid",
    createdAt: new Date(Date.UTC(2026, 8, 1, 0, i)),
    ...extra,
  };
}

async function list(params) {
  const res = await fetch(`${server.base}/api/v1/orders/all?${new URLSearchParams(params)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

test.before(async () => {
  server = await startTestServer();
  token = await adminToken();
  await mongoose.connection.collection("orders").insertMany(Array.from({ length: 30 }, (_, i) => order(i + 1)));
});

test.after(async () => {
  await server?.stop();
});

test("sipariş listesi sayfalanır ve sayılar sunucudan gelir", async () => {
  const first = await list({ page: 1, pageSize: 5 });
  assert.equal(first.items.length, 5);
  assert.equal(first.total, 20);
  assert.equal(first.pendingCount, 10);
  assert.equal(first.activeCount, 20);
  assert.equal(first.items[0].orderNumber, "2000000029"); // en yeni önce, bekleyenler hariç
  const last = await list({ page: 4, pageSize: 5 });
  assert.equal(last.items.length, 5);
});

test("müşteri adı, e-posta ve telefonla aranabilir; özel karakterler güvenli", async () => {
  assert.deepEqual((await list({ page: 1, q: "zeynep" })).items.map((o) => o.orderNumber), ["2000000007"]);
  assert.equal((await list({ page: 1, q: "m14@test" })).items[0].orderNumber, "2000000014");
  assert.equal((await list({ page: 1, q: "0000020" })).items[0].orderNumber, "2000000020");
  assert.equal((await list({ page: 1, q: "(.*)+$" })).total, 0);
});

test("bekleyenler ayrı listelenir; parametresiz çağrı eski biçimi korur", async () => {
  const pending = await list({ page: 1, mode: "pending", pageSize: 50 });
  assert.equal(pending.total, 10);
  assert.ok(pending.items.every((o) => o.status === "pending"));
  const legacy = await (await fetch(`${server.base}/api/v1/orders/all`, { headers: { Authorization: `Bearer ${token}` } })).json();
  assert.equal(Array.isArray(legacy), true);
  assert.equal(legacy.length, 30);
});

test("iptal edilmiş siparişe gelen ödeme sessizce yok sayılmaz, incelemeye alınır", async () => {
  const conversationId = `IPTAL${crypto.randomBytes(4).toString("hex")}`;
  await mongoose.connection.collection("orders").insertOne(order(99, { conversationId, status: "cancelled", cancelReason: "payment_abandoned" }));
  const res = await paytrCallback(server.base, { merchantOid: conversationId, totalAmount: 10000 });
  assert.equal(res.text, "OK");
  const saved = await mongoose.connection.collection("orders").findOne({ conversationId });
  assert.equal(saved.status, "payment_review");
  assert.equal(saved.cancelReason, "paid_after_cancel");
});
