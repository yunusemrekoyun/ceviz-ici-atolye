// Canlıdaki (ayrım sisteminden önceki) verinin yeni sürümle karşılaşması.
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { startTestServer, postJson, mailsTo } = require("./helpers");

let server;
let adminToken;
let Orders;
let Products;
const run = crypto.randomBytes(3).toString("hex");
const email = (name) => `${name}-${run}@tek.test`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DAY = 24 * 60 * 60 * 1000;

async function seedProduct(stock) {
  const _id = new mongoose.Types.ObjectId();
  await Products.insertOne({
    _id, name: `Tek ürün ${_id}`, images: [], imageAssets: [], price: 100, originalPrice: 100, discount: 0,
    category: new mongoose.Types.ObjectId(), sizes: [{ _id: new mongoose.Types.ObjectId(), size: "M", stock }],
    description: "", parentProductId: null, archivedAt: null, createdAt: new Date(), updatedAt: new Date(),
  });
  return _id;
}
const stockOf = async (id) => (await Products.findOne({ _id: id })).sizes[0].stock;

// Canlı sürümün yazdığı biçimde sipariş: stockReservedUntil, reviewAlertSentAt gibi yeni alanlar yok.
async function legacyOrder({ status, productId, createdAt = new Date(), stockUpdated = false, guestEmail, user = null, extra = {} }) {
  const _id = new mongoose.Types.ObjectId();
  await Orders.insertOne({
    _id,
    orderNumber: String(1e9 + Math.floor(Math.random() * 9e9)),
    ...(user ? { user } : { guest: { firstName: "Eski", lastName: "Müşteri", email: guestEmail, phone: "+905551234567" } }),
    items: [{ productId, name: "Çorap", price: 100, qty: 1, size: "M" }],
    totalPrice: 100,
    address: { title: "Ev", mainaddress: "Adres", street: "Sk", city: "Kütahya" },
    conversationId: crypto.randomBytes(16).toString("hex").toUpperCase(),
    status,
    stockUpdated,
    createdAt,
    updatedAt: createdAt,
    ...extra,
  });
  return _id;
}

test.before(async () => {
  server = await startTestServer({ ORDER_MAIL_SWEEP_MS: "300", ORDER_MAIL_SWEEP_GRACE_MS: "0" });
  Orders = mongoose.connection.collection("orders");
  Products = mongoose.connection.collection("products");
  const password = `Test-${crypto.randomBytes(6).toString("hex")}!aA1`;
  await mongoose.connection.collection("users").insertOne({
    firstName: "Tek", lastName: "Yönetici", email: email("yonetici"), password: await bcrypt.hash(password, 4),
    role: "admin", tokenVersion: 0, addresses: [], refreshTokens: [], createdAt: new Date(), updatedAt: new Date(),
  });
  adminToken = (await postJson(server.base, "/api/v1/auth/login", { email: email("yonetici"), password })).data.accessToken;
});

test.after(async () => {
  await server?.stop();
});

test("ayrım sisteminden önceki, stoğu düşülmüş eski bekleyen sipariş stoğa dokunulmadan kapanır", async () => {
  const productId = await seedProduct(4);
  const old = await legacyOrder({
    status: "pending", productId, stockUpdated: true, createdAt: new Date(Date.now() - 3 * DAY), guestEmail: email("eski-bekleyen"),
  });
  const plain = await legacyOrder({
    status: "pending", productId, createdAt: new Date(Date.now() - 3 * DAY), guestEmail: email("eski-bekleyen2"),
  });
  for (let i = 0; i < 20 && (await Orders.findOne({ _id: old })).status === "pending"; i += 1) await wait(150);
  const a = await Orders.findOne({ _id: old });
  assert.equal(a.status, "cancelled");
  assert.equal(a.cancelReason, "payment_abandoned");
  assert.equal((await Orders.findOne({ _id: plain })).status, "cancelled");
  assert.equal(await stockOf(productId), 4);
});

test("yönetici, stoğu düşülmüş eski bekleyen siparişi eskisi gibi doğrudan iptal edemez", async () => {
  const productId = await seedProduct(4);
  const id = await legacyOrder({ status: "pending", productId, stockUpdated: true, guestEmail: email("eski-iptal") });
  const res = await fetch(`${server.base}/api/v1/orders/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: "cancelled" }),
  });
  assert.equal(res.status, 409);
  assert.equal((await Orders.findOne({ _id: id })).status, "pending");
  assert.equal(await stockOf(productId), 4);
});

test("e-posta kaydı olmayan eski ödenmiş siparişe ve eski incelemeye toplu e-posta gitmez; yenisine gider", async () => {
  const productId = await seedProduct(10);
  const oldPaid = email("eski-odenmis");
  const newPaid = email("yeni-odenmis");
  await legacyOrder({
    status: "paid", productId, stockUpdated: true, guestEmail: oldPaid, createdAt: new Date(Date.now() - 40 * DAY),
    extra: { paymentReceivedAt: new Date(Date.now() - 40 * DAY) },
  });
  const oldReview = await legacyOrder({
    status: "payment_review", productId, guestEmail: email("eski-inceleme"), createdAt: new Date(Date.now() - 20 * DAY),
    extra: { paymentReceivedAt: new Date(Date.now() - 20 * DAY) },
  });
  const fresh = await legacyOrder({
    status: "paid", productId, stockUpdated: true, guestEmail: newPaid,
    extra: { paymentReceivedAt: new Date(Date.now() - 5000) },
  });
  assert.ok((await mailsTo(newPaid)).length >= 1);
  await wait(800);
  assert.ok((await Orders.findOne({ _id: fresh })).orderMailSentAt);
  assert.equal((await mailsTo(oldPaid, { waitMs: 0 })).length, 0);
  assert.equal((await Orders.findOne({ _id: oldReview })).reviewAlertSentAt ?? null, null);
});

test("ödemesi alınmadan kapanan denemeler ana sipariş listesine değil 'Tamamlanmayan ödemeler' sekmesine düşer", async () => {
  const productId = await seedProduct(10);
  const mark = `liste-${crypto.randomBytes(2).toString("hex")}`;
  const ids = {
    paid: await legacyOrder({ status: "paid", productId, guestEmail: email(`${mark}-odenmis`), extra: { paymentReceivedAt: new Date() } }),
    abandoned: await legacyOrder({ status: "cancelled", productId, guestEmail: email(`${mark}-terk`), extra: { cancelReason: "payment_abandoned" } }),
    refunded: await legacyOrder({
      status: "cancelled", productId, guestEmail: email(`${mark}-iade`),
      extra: { cancelReason: "admin_cancelled", paymentReceivedAt: new Date() },
    }),
    legacyCancelled: await legacyOrder({ status: "cancelled", productId, guestEmail: email(`${mark}-eski-iptal`) }),
  };
  const list = async (mode) => {
    const res = await fetch(`${server.base}/api/v1/orders/all?page=1&pageSize=100&mode=${mode}&q=${mark}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    return data.items.map((o) => String(o._id)).sort();
  };
  assert.deepEqual(await list("active"), [ids.paid, ids.refunded, ids.legacyCancelled].map(String).sort());
  assert.deepEqual(await list("unpaid"), [String(ids.abandoned)]);
});

test("uzun adlı kargo yöntemiyle verilmiş sipariş, firma yazılmadan kargoya verilebilir", async () => {
  const productId = await seedProduct(3);
  const longName = "Standart Kargo — 1500 TL üzeri ücretsiz, 2-3 iş günü içinde teslim edilir ve takip edilir";
  const id = await legacyOrder({
    status: "paid", productId, stockUpdated: true, guestEmail: email("uzun-kargo"),
    extra: { paymentReceivedAt: new Date(Date.now() - 10 * DAY), orderMailSentAt: new Date(), shipping: { name: longName, fee: 0 } },
  });
  const res = await fetch(`${server.base}/api/v1/orders/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: "shipped" }),
  });
  assert.equal(res.status, 200, await res.text());
  const order = await Orders.findOne({ _id: id });
  assert.equal(order.status, "shipped");
  assert.equal(order.shipping.carrier, longName.slice(0, 60).trim());
});
