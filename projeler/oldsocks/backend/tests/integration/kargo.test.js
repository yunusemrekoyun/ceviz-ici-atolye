const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { startTestServer, postJson, mailsTo } = require("./helpers");

let server;
let adminToken;
let Orders;
const run = crypto.randomBytes(3).toString("hex");

// Belirli sayıda e-posta gelene kadar (en çok 5 sn) bekler.
async function mailCount(to, count) {
  const deadline = Date.now() + 5000;
  for (;;) {
    const mails = await mailsTo(to, { waitMs: 0 });
    if (mails.length >= count || Date.now() > deadline) return mails;
    await new Promise((r) => setTimeout(r, 200));
  }
}

function email(name) {
  return `${name}-${run}@kargo.test`;
}

async function seedOrder({ status = "paid", guestEmail, user = null, extra = {} } = {}) {
  const _id = new mongoose.Types.ObjectId();
  const orderNumber = String(1e9 + Math.floor(Math.random() * 9e9));
  await Orders.insertOne({
    _id,
    orderNumber,
    user,
    guest: guestEmail
      ? { firstName: "Kargo", lastName: "Müşteri", email: guestEmail, phone: "05551234567", registrationAddress: "Adres" }
      : null,
    items: [{ productId: new mongoose.Types.ObjectId(), name: "Siyah Çorap", price: 150, qty: 2, size: "M", color: "Siyah" }],
    totalPrice: 350,
    address: { title: "Ev", mainaddress: "Gizli Sk. No:7", street: "Gizli Sk.", district: "Merkez", city: "Kütahya", postalCode: "43000" },
    shipping: { name: "Standart", fee: 50 },
    conversationId: crypto.randomBytes(12).toString("hex"),
    status,
    stockUpdated: status !== "pending",
    paymentReceivedAt: status === "pending" ? null : new Date(),
    orderMailSentAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...extra,
  });
  return { _id, orderNumber };
}

async function admin(method, pathName, body) {
  const res = await fetch(`${server.base}/api/v1${pathName}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

let ipCounter = 0;
function lookup(body, ip) {
  ipCounter += 1;
  return postJson(server.base, "/api/v1/orders/lookup", body, {
    "X-Forwarded-For": ip || `10.9.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`,
  });
}

async function createUser(role, userEmail) {
  const password = `Test-${crypto.randomBytes(6).toString("hex")}!aA1`;
  const _id = new mongoose.Types.ObjectId();
  await mongoose.connection.collection("users").insertOne({
    _id,
    firstName: "Test",
    lastName: role,
    email: userEmail,
    password: await bcrypt.hash(password, 4),
    role,
    tokenVersion: 0,
    addresses: [],
    refreshTokens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const login = await postJson(server.base, "/api/v1/auth/login", { email: userEmail, password });
  assert.equal(login.status, 200);
  return { _id, token: login.data.accessToken };
}

test.before(async () => {
  server = await startTestServer({ ORDER_MAIL_SWEEP_MS: "300", ORDER_MAIL_SWEEP_GRACE_MS: "0" });
  Orders = mongoose.connection.collection("orders");
  adminToken = (await createUser("admin", email("yonetici"))).token;
});

test.after(async () => {
  await server?.stop();
});

test("kargo firması girilmezse Kargo ayarlarındaki yöntem adı kullanılır; e-posta bir kez gider", async () => {
  const to = email("kargo");
  const { _id } = await seedOrder({ guestEmail: to });

  // Firma yazılmadan kargoya verilir: siparişteki kargo yöntemi ("Standart") firma olur.
  const plain = await seedOrder({ guestEmail: email("firmasiz") });
  const noCarrier = await admin("PUT", `/orders/${plain._id}/status`, { status: "shipped" });
  assert.equal(noCarrier.status, 200, JSON.stringify(noCarrier.data));
  assert.equal((await Orders.findOne({ _id: plain._id })).shipping.carrier, "Standart");

  const badNumber = await admin("PUT", `/orders/${_id}/status`, {
    status: "shipped",
    carrier: "Yurtiçi Kargo",
    trackingNumber: "12<script>",
  });
  assert.equal(badNumber.status, 400);

  const ok = await admin("PUT", `/orders/${_id}/status`, {
    status: "shipped",
    carrier: "Yurtiçi Kargo",
    trackingNumber: "YK 123 456",
  });
  assert.equal(ok.status, 200, JSON.stringify(ok.data));

  const mails = await mailsTo(to);
  assert.equal(mails.length, 1);
  assert.match(mails[0].Subject, /kargoya verildi/);
  assert.match(mails[0].Text, /YK123456/);
  assert.match(mails[0].Text, /Yurtiçi Kargo/);

  const stored = await Orders.findOne({ _id });
  assert.ok(stored.shippedAt);
  assert.ok(stored.shippedMailSentAt);

  // Düzeltme e-posta göndermez.
  const fix = await admin("PUT", `/orders/${_id}/tracking`, { carrier: "Aras Kargo", trackingNumber: "AR-99" });
  assert.equal(fix.status, 200);
  assert.equal((await Orders.findOne({ _id })).shipping.trackingNumber, "AR-99");

  const done = await admin("PUT", `/orders/${_id}/status`, { status: "completed" });
  assert.equal(done.status, 200);
  const final = await mailCount(to, 2);
  assert.equal(final.length, 2);
  assert.ok(final.some((m) => /tamamlandı/.test(m.Subject)));
  // Sweeper birkaç tur daha dönse de yeni e-posta gitmez.
  await new Promise((r) => setTimeout(r, 1000));
  assert.equal((await mailsTo(to, { waitMs: 0 })).length, 2);
});

test("kargoya verilmemiş siparişin kargo bilgisi düzenlenemez", async () => {
  const { _id } = await seedOrder({ guestEmail: email("kargosuz") });
  const res = await admin("PUT", `/orders/${_id}/tracking`, { carrier: "PTT Kargo" });
  assert.equal(res.status, 409);
});

test("tarayıcı gönderilemeyen kargo e-postasını yeniden dener, eski kargolanmış siparişlere dokunmaz", async () => {
  const due = email("tekrar");
  const legacy = email("eski");
  await seedOrder({
    status: "shipped",
    guestEmail: due,
    extra: { shippedAt: new Date(Date.now() - 60_000), shipping: { name: "Standart", fee: 50, carrier: "MNG Kargo", trackingNumber: "M1" } },
  });
  await seedOrder({ status: "shipped", guestEmail: legacy });

  const mails = await mailsTo(due, { waitMs: 5000 });
  assert.equal(mails.length, 1);
  await new Promise((r) => setTimeout(r, 1000));
  assert.equal((await mailsTo(legacy, { waitMs: 0 })).length, 0);
});

test("sipariş takibi doğru e-postayla durum ve kargo bilgisini verir, adres vermez", async () => {
  const to = email("takip");
  const { orderNumber } = await seedOrder({
    status: "shipped",
    guestEmail: to,
    extra: { shippedAt: new Date(), shippedMailSentAt: new Date(), shipping: { name: "Standart", fee: 50, carrier: "PTT Kargo", trackingNumber: "PTT1" } },
  });

  const ok = await lookup({ orderNumber: `#${orderNumber}`, email: to.toUpperCase() });
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  assert.equal(ok.data.status, "shipped");
  assert.equal(ok.data.shipping.trackingNumber, "PTT1");
  const body = JSON.stringify(ok.data);
  assert.doesNotMatch(body, /Gizli Sk|05551234567|conversationId|paytr/i);

  const wrong = await lookup({ orderNumber, email: "baskasi@kargo.test" });
  assert.equal(wrong.status, 404);

  const pending = await seedOrder({ status: "pending", guestEmail: to });
  assert.equal((await lookup({ orderNumber: pending.orderNumber, email: to })).status, 404);
});

test("sipariş takibi IP başına 15 dakikada 10 denemeyle sınırlı", async () => {
  const statuses = [];
  for (let i = 0; i < 11; i += 1) {
    statuses.push((await lookup({ orderNumber: "1234567890", email: "x@kargo.test" }, "10.77.0.1")).status);
  }
  assert.deepEqual(statuses.slice(0, 10), Array(10).fill(404));
  assert.equal(statuses[10], 429);
});

test("müşterinin sipariş listesinde iç alanlar yer almaz", async () => {
  const user = await createUser("user", email("uye"));
  await seedOrder({ user: user._id, extra: { paytrInit: { token: "gizli" }, mailAttemptAt: new Date() } });
  const res = await fetch(`${server.base}/api/v1/orders`, { headers: { Authorization: `Bearer ${user.token}` } });
  const orders = await res.json();
  assert.equal(orders.length, 1);
  assert.equal(orders[0].paytrInit, undefined);
  assert.equal(orders[0].mailAttemptAt, undefined);
  assert.equal(orders[0].orderNumber.length > 0, true);
});
