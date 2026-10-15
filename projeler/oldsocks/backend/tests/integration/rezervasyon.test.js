const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { startTestServer, paytrCallback, postJson, CONSENT } = require("./helpers");

let server;
let adminToken;
let Orders;
let Products;

const address = { title: "Ev", mainaddress: "Adres 1", street: "Sk", district: "Merkez", city: "Kütahya", postalCode: "43000" };
const guest = (email) => ({ firstName: "Rezerv", lastName: "Müşteri", email, phone: "05551234567", registrationAddress: "Adres 1" });
const uniq = (name) => `${name}-${crypto.randomBytes(3).toString("hex")}@rezerv.test`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function seedProduct(stock) {
  const _id = new mongoose.Types.ObjectId();
  await Products.insertOne({
    _id, name: `Rezerv ürün ${_id}`, images: [], imageAssets: [], price: 100, originalPrice: 100, discount: 0,
    category: new mongoose.Types.ObjectId(), sizes: [{ _id: new mongoose.Types.ObjectId(), size: "M", stock }],
    description: "", parentProductId: null, archivedAt: null, createdAt: new Date(), updatedAt: new Date(),
  });
  return _id;
}

const stockOf = async (id) => (await Products.findOne({ _id: id })).sizes[0].stock;

function start(productId, email, qty = 1, extra = {}) {
  return postJson(server.base, "/api/v1/payment/start-guest", {
    cartItems: [{ id: String(productId), size: "M", qty }],
    address,
    guest: guest(email),
    consent: CONSENT,
    ...extra,
  });
}

async function admin(method, path, body) {
  const res = await fetch(`${server.base}/api/v1${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function waitFor(check, ms = 4000) {
  const end = Date.now() + ms;
  for (;;) {
    const value = await check();
    if (value || Date.now() > end) return value;
    await wait(150);
  }
}

test.before(async () => {
  server = await startTestServer({ ORDER_MAIL_SWEEP_MS: "300", ORDER_MAIL_SWEEP_GRACE_MS: "0" });
  Orders = mongoose.connection.collection("orders");
  Products = mongoose.connection.collection("products");
  await mongoose.connection.collection("shippingmethods").insertOne({ name: "Standart", fee: 10, freeShippingThreshold: null });
  const password = `Test-${crypto.randomBytes(6).toString("hex")}!aA1`;
  await mongoose.connection.collection("users").insertOne({
    firstName: "Rezerv", lastName: "Yönetici", email: "rezerv-yonetici@test.local", password: await bcrypt.hash(password, 4),
    role: "admin", tokenVersion: 0, addresses: [], refreshTokens: [], createdAt: new Date(), updatedAt: new Date(),
  });
  const login = await postJson(server.base, "/api/v1/auth/login", { email: "rezerv-yonetici@test.local", password });
  adminToken = login.data.accessToken;
});

test.after(async () => {
  await server?.stop();
});

test("ödeme ekranına geçişte stok 20 dakikalığına siparişe ayrılır", async () => {
  const productId = await seedProduct(3);
  const before = Date.now();
  const res = await start(productId, uniq("ayir"), 2);
  assert.equal(res.status, 200, JSON.stringify(res.data));
  assert.equal(await stockOf(productId), 1);
  const order = await Orders.findOne({ conversationId: res.data.conversationId });
  assert.equal(order.status, "pending");
  assert.equal(order.stockUpdated, true);
  const holdMs = new Date(res.data.reservedUntil).getTime() - before;
  assert.ok(holdMs > 19 * 60 * 1000 && holdMs <= 20 * 60 * 1000 + 5000, `ayrım süresi ${holdMs} ms`);

  // Başarılı ödeme stoğu ikinci kez düşmez.
  await paytrCallback(server.base, { merchantOid: res.data.conversationId, totalAmount: Math.round(order.totalPrice * 100) });
  const paid = await Orders.findOne({ _id: order._id });
  assert.equal(paid.status, "paid");
  assert.equal(paid.stockReservedUntil, null);
  assert.equal(await stockOf(productId), 1);
});

test("süresi dolan ayrım stoğu geri verir; sonra gelen ödeme stok varsa siparişi tamamlar", async () => {
  const productId = await seedProduct(1);
  const res = await start(productId, uniq("sure"));
  const order = await Orders.findOne({ conversationId: res.data.conversationId });
  await Orders.updateOne({ _id: order._id }, { $set: { stockReservedUntil: new Date(Date.now() - 1000) } });

  const expired = await waitFor(async () => {
    const o = await Orders.findOne({ _id: order._id });
    return o.status === "cancelled" ? o : null;
  });
  assert.ok(expired, "süresi dolan sipariş kapanmadı");
  assert.equal(expired.cancelReason, "reservation_expired");
  assert.equal(await stockOf(productId), 1);

  await paytrCallback(server.base, { merchantOid: res.data.conversationId, totalAmount: Math.round(order.totalPrice * 100) });
  const late = await Orders.findOne({ _id: order._id });
  assert.equal(late.status, "paid");
  assert.equal(late.cancelReason, null);
  assert.equal(await stockOf(productId), 0);
});

test("süresi dolduktan sonra gelen ödemede stok kalmadıysa sipariş incelemeye düşer", async () => {
  const productId = await seedProduct(1);
  const first = await start(productId, uniq("gec"));
  const order = await Orders.findOne({ conversationId: first.data.conversationId });
  await Orders.updateOne({ _id: order._id }, { $set: { stockReservedUntil: new Date(Date.now() - 1000) } });
  await waitFor(async () => (await Orders.findOne({ _id: order._id })).status === "cancelled");

  const other = await start(productId, uniq("baskasi"));
  assert.equal(other.status, 200);
  assert.equal(await stockOf(productId), 0);

  await paytrCallback(server.base, { merchantOid: first.data.conversationId, totalAmount: Math.round(order.totalPrice * 100) });
  const late = await Orders.findOne({ _id: order._id });
  assert.equal(late.status, "payment_review");
  assert.equal(late.cancelReason, "stock_unavailable_after_payment");
  assert.equal(await stockOf(productId), 0);
});

test("aynı müşteri yeniden ödeme başlatınca eski oturumun ayırdığı stok ona engel olmaz", async () => {
  const productId = await seedProduct(1);
  const email = uniq("tekrar");
  const first = await start(productId, email);
  assert.equal(first.status, 200);
  // Başka biri aynı e-postayı yazsa da oturum kapanmaz (tarayıcının bildiği kimlik gerekir).
  const stranger = await start(productId, email);
  assert.equal(stranger.status, 409);
  assert.equal((await Orders.findOne({ conversationId: first.data.conversationId })).status, "pending");

  const second = await start(productId, email.toUpperCase(), 1, { previousConversationId: first.data.conversationId });
  assert.equal(second.status, 200, JSON.stringify(second.data));
  const old = await Orders.findOne({ conversationId: first.data.conversationId });
  assert.equal(old.status, "cancelled");
  assert.equal(old.cancelReason, "session_replaced");
  assert.equal(await stockOf(productId), 0);
});

test("yönetici bekleyen siparişi iptal edince ayrılan stok geri eklenir; ödenmemiş sipariş kargoya verilemez", async () => {
  const productId = await seedProduct(2);
  const res = await start(productId, uniq("yonetici"));
  const order = await Orders.findOne({ conversationId: res.data.conversationId });
  assert.equal(await stockOf(productId), 1);

  const ship = await admin("PUT", `/orders/${order._id}/status`, { status: "shipped" });
  assert.equal(ship.status, 409);

  const cancel = await admin("PUT", `/orders/${order._id}/status`, { status: "cancelled" });
  assert.equal(cancel.status, 200, JSON.stringify(cancel.data));
  const after = await Orders.findOne({ _id: order._id });
  assert.equal(after.status, "cancelled");
  assert.equal(after.cancelReason, "admin_cancelled_unpaid");
  assert.equal(await stockOf(productId), 2);
});

test("başarısız ödeme bildirimi aynı anda iki kez gelse de stok bir kez geri eklenir", async () => {
  const productId = await seedProduct(1);
  const res = await start(productId, uniq("cift"));
  const order = await Orders.findOne({ conversationId: res.data.conversationId });
  await Promise.all([
    paytrCallback(server.base, { merchantOid: res.data.conversationId, status: "failed", totalAmount: 0 }),
    paytrCallback(server.base, { merchantOid: res.data.conversationId, status: "failed", totalAmount: 0 }),
  ]);
  assert.equal((await Orders.findOne({ _id: order._id })).status, "cancelled");
  assert.equal(await stockOf(productId), 1);
});

test("müşteri sepete dönünce ayrım sürer; kendi ayırdığı adet ona mevcut görünür, yeniden ödemede eski oturum kapanır", async () => {
  const productId = await seedProduct(1);
  const code = `DON${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  await mongoose.connection.collection("coupons").insertOne({
    code, isEnabled: true, discountType: "percent", discountValue: 10, minimumSubtotal: 0,
    expiresAt: null, maxUses: 1, productIds: [productId], createdAt: new Date(), updatedAt: new Date(),
  });
  const email = uniq("don");
  const res = await start(productId, email, 1, { couponCode: code });
  assert.equal(res.status, 200, JSON.stringify(res.data));
  const heldBy = res.data.conversationId;
  assert.equal(await stockOf(productId), 0);

  // Başka sekmede ödeme formu açık olabilir: sepeti görüntülemek ayrımı bırakmaz.
  const cartItems = [{ id: String(productId), size: "M", qty: 1 }];
  const others = await postJson(server.base, "/api/v1/cart-campaigns/check", { cartItems });
  assert.equal(others.data.items[0].status, "insufficient");
  const mine = await postJson(server.base, "/api/v1/cart-campaigns/check", { cartItems, heldBy });
  assert.equal(mine.data.items[0].status, "ok");
  assert.equal(mine.data.items[0].available, 1);
  const preview = await postJson(server.base, "/api/v1/cart-campaigns/preview", {
    cartItems, couponCode: code, customerEmail: email, heldBy,
  });
  assert.equal(preview.status, 200, JSON.stringify(preview.data));
  assert.equal((await Orders.findOne({ conversationId: heldBy })).status, "pending");
  assert.equal((await postJson(server.base, "/api/v1/payment/release", { conversationId: heldBy })).status, 404);

  const stranger = await start(productId, uniq("baska"));
  assert.equal(stranger.status, 409);
  assert.match(stranger.data.message, /stok/i);

  // Aynı tarayıcıdan yeniden ödeme (e-posta değişse de): eski oturum kapanır, adet yenisine geçer.
  const again = await start(productId, uniq("don2"), 1, { couponCode: code, previousConversationId: heldBy });
  assert.equal(again.status, 200, JSON.stringify(again.data));
  const old = await Orders.findOne({ conversationId: heldBy });
  assert.equal(old.status, "cancelled");
  assert.equal(old.cancelReason, "session_replaced");
  assert.equal(await stockOf(productId), 0);

  // Eski oturuma geç ödeme ihtimali: sonuç sayfası beklemeye devam eder.
  const confirm = await postJson(server.base, "/api/v1/orders/confirm", { conversationId: heldBy });
  assert.equal(confirm.status, 409);
  assert.equal(confirm.data.state, "pending");
});

test("süresi dolan kuponlu oturuma geç ödeme gelirse kupon kuralları yeniden denetlenir", async () => {
  const productId = await seedProduct(3);
  const code = `REZ${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  await mongoose.connection.collection("coupons").insertOne({
    code, isEnabled: true, discountType: "percent", discountValue: 10, minimumSubtotal: 0,
    expiresAt: null, maxUses: 1, productIds: [productId], createdAt: new Date(), updatedAt: new Date(),
  });
  const expire = async (conversationId) => {
    await Orders.updateOne({ conversationId }, { $set: { stockReservedUntil: new Date(Date.now() - 1000) } });
    return waitFor(async () => (await Orders.findOne({ conversationId })).status === "cancelled");
  };
  const payFor = async (conversationId) => {
    const order = await Orders.findOne({ conversationId });
    await paytrCallback(server.base, { merchantOid: conversationId, totalAmount: Math.round(order.totalPrice * 100) });
    return Orders.findOne({ _id: order._id });
  };

  // Kupon hâlâ kullanılabilir: sipariş tamamlanır, stok yeniden düşülür.
  const first = await start(productId, uniq("kupon1"), 1, { couponCode: code });
  assert.equal(first.status, 200, JSON.stringify(first.data));
  assert.ok(await expire(first.data.conversationId));
  assert.equal(await stockOf(productId), 3);
  const paid = await payFor(first.data.conversationId);
  assert.equal(paid.status, "paid");
  assert.equal(await stockOf(productId), 2);

  // Sınır bu arada doldu: para alındı, sipariş incelemeye düşer.
  await mongoose.connection.collection("coupons").updateOne({ code }, { $set: { maxUses: 2 } });
  const second = await start(productId, uniq("kupon2"), 1, { couponCode: code });
  assert.equal(second.status, 200, JSON.stringify(second.data));
  assert.ok(await expire(second.data.conversationId));
  await mongoose.connection.collection("coupons").updateOne({ code }, { $set: { maxUses: 1 } });
  const review = await payFor(second.data.conversationId);
  assert.equal(review.status, "payment_review");
  assert.equal(review.cancelReason, "coupon_limit_after_payment");
  assert.equal(await stockOf(productId), 2);
});

test("ayrımın bitmesine az kalmışsa ödeme formu yeniden açılmaz", async () => {
  const productId = await seedProduct(1);
  const res = await start(productId, uniq("form"));
  const order = await Orders.findOne({ conversationId: res.data.conversationId });
  await Orders.updateOne({ _id: order._id }, { $set: { stockReservedUntil: new Date(Date.now() + 4 * 60 * 1000) } });
  const inline = await fetch(`${server.base}/api/v1/payment/inline/${res.data.conversationId}`);
  assert.equal(inline.status, 410);
  await Orders.updateOne({ _id: order._id }, { $set: { stockReservedUntil: new Date(Date.now() + 15 * 60 * 1000) } });
  const ok = await fetch(`${server.base}/api/v1/payment/inline/${res.data.conversationId}`);
  assert.equal(ok.status, 200);
});

test("yöneticinin iptal ettiği bekleyen siparişe ödeme gelirse inceleme ve uyarı", async () => {
  const productId = await seedProduct(1);
  const res = await start(productId, uniq("iptalodeme"));
  const order = await Orders.findOne({ conversationId: res.data.conversationId });
  await admin("PUT", `/orders/${order._id}/status`, { status: "cancelled" });
  await paytrCallback(server.base, { merchantOid: res.data.conversationId, totalAmount: Math.round(order.totalPrice * 100) });
  const after = await Orders.findOne({ _id: order._id });
  assert.equal(after.status, "payment_review");
  assert.equal(after.cancelReason, "paid_after_cancel");
  assert.ok(after.paymentReceivedAt);
});

test("üye aynı anda iki ödeme başlatırsa yalnız en yeni oturum stok tutar", async () => {
  const productId = await seedProduct(3);
  const password = `Test-${crypto.randomBytes(6).toString("hex")}!aA1`;
  const email = uniq("uye");
  const addressId = new mongoose.Types.ObjectId();
  await mongoose.connection.collection("users").insertOne({
    firstName: "Rezerv", lastName: "Üye", email, phone: "+905551234567", password: await bcrypt.hash(password, 4),
    role: "user", tokenVersion: 0, refreshTokens: [], createdAt: new Date(), updatedAt: new Date(),
    addresses: [{ _id: addressId, title: "Ev", mainaddress: "Adres 1", street: "Sk", district: "Merkez", city: "Kütahya", postalCode: "43000" }],
  });
  const login = await postJson(server.base, "/api/v1/auth/login", { email, password });
  const startMember = () =>
    postJson(
      server.base,
      "/api/v1/payment/start",
      { cartItems: [{ id: String(productId), size: "M", qty: 1 }], addressId: String(addressId), consent: CONSENT },
      { Authorization: `Bearer ${login.data.accessToken}` }
    );
  const [a, b] = await Promise.all([startMember(), startMember()]);
  assert.equal(a.status, 200, JSON.stringify(a.data));
  assert.equal(b.status, 200, JSON.stringify(b.data));
  const user = await mongoose.connection.collection("users").findOne({ email });
  const pending = await Orders.find({ user: user._id, status: "pending" }).toArray();
  assert.equal(pending.length, 1);
  assert.equal(pending[0].identityFallbackUsed, true);
  assert.equal(await stockOf(productId), 2);
});

test("ayrım açıkken bedenin adı değişse de ayrım bitince adet aynı bedene geri eklenir", async () => {
  const productId = await seedProduct(5);
  const res = await start(productId, uniq("adi-degisen"));
  assert.equal(res.status, 200);
  const order = await Orders.findOne({ conversationId: res.data.conversationId });
  assert.ok(order.items[0].sizeId);
  await Products.updateOne({ _id: productId }, { $set: { "sizes.0.size": "Medium" } });
  await paytrCallback(server.base, { merchantOid: res.data.conversationId, status: "failed", totalAmount: 0 });
  const product = await Products.findOne({ _id: productId });
  assert.deepEqual(product.sizes.map((s) => [s.size, s.stock]), [["Medium", 5]]);
});

test("ayrım sırasında adı değişen bedene geç gelen ödeme stoğu aynı bedenden yeniden düşer", async () => {
  const productId = await seedProduct(1);
  const res = await start(productId, uniq("adi-degisen-gec"));
  assert.equal(res.status, 200);
  await Products.updateOne({ _id: productId }, { $set: { "sizes.0.size": "Medium" } });
  await Orders.updateOne({ conversationId: res.data.conversationId }, { $set: { stockReservedUntil: new Date(Date.now() - 1000) } });
  assert.ok(await waitFor(async () => (await Orders.findOne({ conversationId: res.data.conversationId })).status === "cancelled"));
  assert.equal(await stockOf(productId), 1);
  const order = await Orders.findOne({ conversationId: res.data.conversationId });
  await paytrCallback(server.base, { merchantOid: res.data.conversationId, totalAmount: Math.round(order.totalPrice * 100) });
  assert.equal((await Orders.findOne({ _id: order._id })).status, "paid");
  assert.equal(await stockOf(productId), 0);
});

test("yönetici bekleyen siparişi ödendi yapınca ödeme zamanı kaydedilir (e-posta taraması kapsar)", async () => {
  const productId = await seedProduct(2);
  const res = await start(productId, uniq("elle-odendi"));
  const order = await Orders.findOne({ conversationId: res.data.conversationId });
  const update = await admin("PUT", `/orders/${order._id}/status`, { status: "paid" });
  assert.equal(update.status, 200, JSON.stringify(update.data));
  const after = await Orders.findOne({ _id: order._id });
  assert.equal(after.status, "paid");
  assert.ok(after.paymentReceivedAt);
});

test("ayrım sırasında beden satırı silinip aynı adla yeniden eklenirse geç ödeme ve yönetici onayı yeni satırdan düşer", async () => {
  const recreate = (productId, stock) =>
    Products.updateOne({ _id: productId }, { $set: { sizes: [{ _id: new mongoose.Types.ObjectId(), size: "M", stock }] } });
  const expire = async (conversationId) => {
    await Orders.updateOne({ conversationId }, { $set: { stockReservedUntil: new Date(Date.now() - 1000) } });
    return waitFor(async () => (await Orders.findOne({ conversationId })).status === "cancelled");
  };

  // Geç gelen ödeme
  const late = await seedProduct(1);
  const a = await start(late, uniq("yeniden-satir"));
  assert.equal(a.status, 200);
  await recreate(late, 0);
  assert.ok(await expire(a.data.conversationId));
  assert.equal(await stockOf(late), 1);
  const orderA = await Orders.findOne({ conversationId: a.data.conversationId });
  await paytrCallback(server.base, { merchantOid: a.data.conversationId, totalAmount: Math.round(orderA.totalPrice * 100) });
  assert.equal((await Orders.findOne({ _id: orderA._id })).status, "paid");
  assert.equal(await stockOf(late), 0);

  // İncelemedeki siparişi yönetici onaylar
  const review = await seedProduct(1);
  const b = await start(review, uniq("yeniden-satir-onay"));
  assert.ok(await expire(b.data.conversationId));
  await Orders.updateOne(
    { conversationId: b.data.conversationId },
    { $set: { status: "payment_review", cancelReason: "stock_unavailable_after_payment", paymentReceivedAt: new Date() } }
  );
  await recreate(review, 3);
  const orderB = await Orders.findOne({ conversationId: b.data.conversationId });
  const approved = await admin("PUT", `/orders/${orderB._id}/status`, { status: "paid" });
  assert.equal(approved.status, 200, JSON.stringify(approved.data));
  assert.equal(await stockOf(review), 2);
});

test("misafirde T.C. kimlik no isteğe bağlı: boşsa 11111111111 atanır, girilirse 11 hane olmalı", async () => {
  const productId = await seedProduct(5);
  const withGuest = (email, identityNumber) =>
    postJson(server.base, "/api/v1/payment/start-guest", {
      cartItems: [{ id: String(productId), size: "M", qty: 1 }],
      address,
      guest: { ...guest(email), identityNumber },
      consent: CONSENT,
    });

  const empty = await withGuest(uniq("tc-bos"), "");
  assert.equal(empty.status, 200, JSON.stringify(empty.data));
  const a = await Orders.findOne({ conversationId: empty.data.conversationId });
  assert.equal(a.guest.identityNumber, "11111111111");
  assert.equal(a.guest.identityFallbackUsed, true);
  assert.equal(a.identityFallbackUsed, true);

  const given = await withGuest(uniq("tc-dolu"), "123 456 789 01");
  assert.equal(given.status, 200, JSON.stringify(given.data));
  const b = await Orders.findOne({ conversationId: given.data.conversationId });
  assert.equal(b.guest.identityNumber, "12345678901");
  assert.equal(b.guest.identityFallbackUsed, false);
  assert.equal(b.identityFallbackUsed, false);

  const short = await withGuest(uniq("tc-kisa"), "1234567890");
  assert.equal(short.status, 422);
  assert.ok(short.data.invalid.includes("guest.identityNumber"));
});
