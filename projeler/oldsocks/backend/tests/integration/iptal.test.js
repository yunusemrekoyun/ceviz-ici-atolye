const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { startTestServer, postJson, mailsTo, paytrCallback } = require("./helpers");

let server;
let adminToken;
let Orders;
let Products;
const run = crypto.randomBytes(3).toString("hex");
const email = (name) => `${name}-${run}@iptal.test`;

async function seedProduct(stock) {
  const _id = new mongoose.Types.ObjectId();
  await Products.insertOne({
    _id,
    name: `İptal ürün ${_id}`,
    images: [],
    imageAssets: [],
    price: 100,
    originalPrice: 100,
    discount: 0,
    category: new mongoose.Types.ObjectId(),
    color: "",
    sizes: [
      { _id: new mongoose.Types.ObjectId(), size: "M", stock },
      { _id: new mongoose.Types.ObjectId(), size: "L", stock },
    ],
    description: "",
    parentProductId: null,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return _id;
}

async function stockOf(productId, size = "M") {
  const p = await Products.findOne({ _id: productId });
  return p.sizes.find((s) => s.size === size).stock;
}

async function seedOrder({ status = "paid", guestEmail, items, stockUpdated = true, couponId = null }) {
  const _id = new mongoose.Types.ObjectId();
  const orderNumber = String(1e9 + Math.floor(Math.random() * 9e9));
  await Orders.insertOne({
    _id,
    orderNumber,
    guest: { firstName: "İptal", lastName: "Müşteri", email: guestEmail, phone: "05551234567", registrationAddress: "Adres" },
    items,
    totalPrice: items.reduce((t, it) => t + it.price * it.qty, 0),
    address: { title: "Ev", mainaddress: "Adres", street: "Sk.", district: "Merkez", city: "Kütahya", postalCode: "43000" },
    shipping: { name: "Standart", fee: 0 },
    coupon: { couponId, code: couponId ? "IPTAL10" : null },
    conversationId: crypto.randomBytes(12).toString("hex"),
    status,
    stockUpdated,
    paymentReceivedAt: status === "pending" ? null : new Date(),
    orderMailSentAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { _id, orderNumber };
}

async function cancel(id, body) {
  const res = await fetch(`${server.base}/api/v1/orders/${id}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

test.before(async () => {
  server = await startTestServer({ ORDER_MAIL_SWEEP_MS: "300", ORDER_MAIL_SWEEP_GRACE_MS: "0" });
  Orders = mongoose.connection.collection("orders");
  Products = mongoose.connection.collection("products");
  const password = `Test-${crypto.randomBytes(6).toString("hex")}!aA1`;
  await mongoose.connection.collection("users").insertOne({
    firstName: "Test",
    lastName: "Yönetici",
    email: email("yonetici"),
    password: await bcrypt.hash(password, 4),
    role: "admin",
    tokenVersion: 0,
    addresses: [],
    refreshTokens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const login = await postJson(server.base, "/api/v1/auth/login", { email: email("yonetici"), password });
  assert.equal(login.status, 200);
  adminToken = login.data.accessToken;
});

test.after(async () => {
  await server?.stop();
});

test("ödenmiş sipariş iptal edilir: stok geri eklenir, iade kaydı tutulur, müşteriye e-posta gider", async () => {
  const productId = await seedProduct(3);
  const couponId = new mongoose.Types.ObjectId();
  const to = email("iade");
  const { _id, orderNumber } = await seedOrder({
    guestEmail: to,
    couponId,
    items: [
      { productId, name: "Çorap", price: 100, qty: 2, size: "M" },
      { productId, name: "Çorap", price: 100, qty: 1, size: "L" },
    ],
  });
  await mongoose.connection.collection("couponusages").insertOne({ couponId, emailKey: to, orderId: _id, usedAt: new Date() });

  const res = await cancel(_id, { refundAmount: 300, note: "Müşteri vazgeçti", restock: true });
  assert.equal(res.status, 200, JSON.stringify(res.data));

  assert.equal(await stockOf(productId, "M"), 5);
  assert.equal(await stockOf(productId, "L"), 4);
  const stored = await Orders.findOne({ _id });
  assert.equal(stored.status, "cancelled");
  assert.equal(stored.cancelReason, "admin_cancelled");
  assert.equal(stored.stockUpdated, false);
  assert.equal(stored.refund.amount, 300);
  assert.equal(stored.refund.restocked, true);
  assert.equal(await mongoose.connection.collection("couponusages").countDocuments({ orderId: _id }), 0);

  const mails = await mailsTo(to);
  assert.equal(mails.length, 1);
  assert.match(mails[0].Subject, /iptal edildi/);
  assert.match(mails[0].Text, /İade tutarı: ₺300,00/);

  // İkinci iptal reddedilir, stok iki kez eklenmez.
  const again = await cancel(_id, { refundAmount: 300, note: "Tekrar" });
  assert.equal(again.status, 409);
  assert.equal(await stockOf(productId, "M"), 5);

  // Müşteri sipariş takibinde iptali ve iade tutarını görür.
  const lookup = await postJson(server.base, "/api/v1/orders/lookup", { orderNumber, email: to });
  assert.equal(lookup.status, 200);
  assert.equal(lookup.data.status, "cancelled");
  assert.equal(lookup.data.refundAmount, 300);
});

test("stok iadesi istenmezse stok değişmez; e-posta istenmezse gönderilmez", async () => {
  const productId = await seedProduct(3);
  const to = email("sessiz");
  const { _id } = await seedOrder({ guestEmail: to, items: [{ productId, name: "Çorap", price: 100, qty: 1, size: "M" }] });
  const res = await cancel(_id, { refundAmount: 50, note: "Kısmi iade", restock: false, notifyCustomer: false });
  assert.equal(res.status, 200);
  assert.equal(await stockOf(productId, "M"), 3);
  const stored = await Orders.findOne({ _id });
  assert.equal(stored.refund.restocked, false);
  assert.equal(stored.stockUpdated, true);
  await new Promise((r) => setTimeout(r, 1200));
  assert.equal((await mailsTo(to, { waitMs: 0 })).length, 0);
});

test("silinmiş ürün atlanır, diğer kalemler stoğa döner", async () => {
  const kept = await seedProduct(1);
  const gone = new mongoose.Types.ObjectId();
  const { _id } = await seedOrder({
    guestEmail: email("silinmis"),
    items: [
      { productId: kept, name: "Kalan", price: 100, qty: 1, size: "M" },
      { productId: gone, name: "Silinen", price: 100, qty: 1, size: "M" },
    ],
  });
  const res = await cancel(_id, { refundAmount: 200, note: "Stok iadesi", notifyCustomer: false });
  assert.equal(res.status, 200);
  assert.equal(await stockOf(kept, "M"), 2);
  assert.deepEqual(res.data.skipped, [{ name: "Silinen", size: "M", qty: 1 }]);
});

test("geçersiz iptal istekleri reddedilir", async () => {
  const productId = await seedProduct(3);
  const paid = await seedOrder({ guestEmail: email("gecersiz"), items: [{ productId, name: "Çorap", price: 100, qty: 1, size: "M" }] });
  assert.equal((await cancel(paid._id, { refundAmount: 101, note: "Fazla tutar" })).status, 400);
  assert.equal((await cancel(paid._id, { refundAmount: 10, note: "" })).status, 400);
  assert.equal((await cancel(paid._id, { refundAmount: -1, note: "Negatif" })).status, 400);
  assert.equal((await cancel("gecersiz-id", { refundAmount: 1, note: "Kimlik" })).status, 404);
  assert.equal(await stockOf(productId, "M"), 3);

  const pending = await seedOrder({
    status: "pending",
    stockUpdated: false,
    guestEmail: email("bekleyen"),
    items: [{ productId, name: "Çorap", price: 100, qty: 1, size: "M" }],
  });
  assert.equal((await cancel(pending._id, { refundAmount: 0, note: "Ödenmemiş" })).status, 409);

  // Durum menüsünden doğrudan iptal hâlâ engelli (iptal / iade akışı kullanılmalı).
  const res = await fetch(`${server.base}/api/v1/orders/${paid._id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: "cancelled" }),
  });
  assert.equal(res.status, 409);
});

test("terk edilen ödeme oturumunun otomatik kapatılması müşteriye e-posta göndermez", async () => {
  const to = email("terk");
  await seedOrder({
    status: "cancelled",
    stockUpdated: false,
    guestEmail: to,
    items: [{ productId: new mongoose.Types.ObjectId(), name: "Çorap", price: 100, qty: 1, size: "M" }],
  });
  await Orders.updateOne({ "guest.email": to }, { $set: { cancelledAt: new Date(Date.now() - 60_000), cancelReason: "payment_abandoned" } });
  await new Promise((r) => setTimeout(r, 1200));
  assert.equal((await mailsTo(to, { waitMs: 0 })).length, 0);
});

test("iade edilip iptal edilen siparişe PayTR aynı bildirimi yeniden gönderirse sipariş değişmez", async () => {
  const productId = await seedProduct(3);
  const { _id } = await seedOrder({
    guestEmail: email("tekrar-bildirim"),
    items: [{ productId, name: "Çorap", price: 100, qty: 1, size: "M" }],
  });
  const order = await Orders.findOne({ _id });
  await Orders.updateOne({ _id }, { $set: { paymentId: order.conversationId } });
  assert.equal((await cancel(_id, { refundAmount: 100, note: "İade", restock: true, notifyCustomer: false })).status, 200);
  const stock = await stockOf(productId, "M");
  const res = await paytrCallback(server.base, { merchantOid: order.conversationId, totalAmount: 10000 });
  assert.equal(res.text, "OK");
  const after = await Orders.findOne({ _id });
  assert.equal(after.status, "cancelled");
  assert.equal(after.cancelReason, "admin_cancelled");
  assert.equal(after.reviewAlertSentAt ?? null, null);
  assert.equal(await stockOf(productId, "M"), stock);
});
