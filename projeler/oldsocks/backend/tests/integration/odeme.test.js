const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const crypto = require("node:crypto");
const { startTestServer, paytrCallback, postJson, mailsTo, CONSENT } = require("./helpers");

let server;
let Order;
let Product;

const guest = {
  firstName: "Deneme",
  lastName: "Müşteri",
  email: "deneme@oldscks.local",
  phone: "05551234567",
  registrationAddress: "Merkez Mah. Test Sk. No:1 Kütahya",
};
const address = {
  title: "Ev",
  mainaddress: "Merkez Mah. Test Sk. No:1",
  street: "Test Sk.",
  district: "Merkez",
  city: "Kütahya",
  postalCode: "43000",
};

async function seedProduct({ stock = 5, price = 250 } = {}) {
  const categoryId = new mongoose.Types.ObjectId();
  await mongoose.connection.collection("categories").insertOne({
    _id: categoryId,
    name: `Test kategori ${categoryId}`,
    parent: null,
    archivedAt: null,
  });
  const productId = new mongoose.Types.ObjectId();
  await mongoose.connection.collection("products").insertOne({
    _id: productId,
    name: `Test ürün ${productId}`,
    images: [],
    imageAssets: [],
    price,
    originalPrice: price,
    discount: 0,
    category: categoryId,
    color: "Siyah",
    sizes: [{ _id: new mongoose.Types.ObjectId(), size: "M", stock }],
    description: "",
    parentProductId: null,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return productId;
}

async function stockOf(productId) {
  const p = await mongoose.connection.collection("products").findOne({ _id: productId });
  return p.sizes[0].stock;
}

async function startGuestOrder(productId, qty = 1, guestOverride = {}) {
  const res = await postJson(server.base, "/api/v1/payment/start-guest", {
    cartItems: [{ id: String(productId), size: "M", qty }],
    address,
    guest: { ...guest, ...guestOverride },
    consent: CONSENT,
  });
  assert.equal(res.status, 200, JSON.stringify(res.data));
  const order = await Order.findOne({ conversationId: res.data.conversationId });
  return { conversationId: res.data.conversationId, order };
}

test.before(async () => {
  server = await startTestServer();
  Order = mongoose.connection.collection("orders");
  Product = mongoose.connection.collection("products");
  await mongoose.connection.collection("shippingmethods").insertOne({
    name: "Standart Kargo",
    fee: 50,
    freeShippingThreshold: null,
  });
});

test.after(async () => {
  await server?.stop();
});

test("misafir siparişi imzalı PayTR bildirimiyle ödenir, stok bir kez düşer", async () => {
  const productId = await seedProduct({ stock: 5 });
  const { conversationId, order } = await startGuestOrder(productId, 2);
  assert.equal(order.status, "pending");
  assert.equal(order.totalPrice, 550);

  const totalAmount = Math.round(order.totalPrice * 100);
  const first = await paytrCallback(server.base, { merchantOid: conversationId, totalAmount });
  assert.equal(first.text, "OK");
  const second = await paytrCallback(server.base, { merchantOid: conversationId, totalAmount });
  assert.equal(second.text, "OK");

  const paid = await Order.findOne({ conversationId });
  assert.equal(paid.status, "paid");
  assert.equal(paid.stockUpdated, true);
  assert.equal(await stockOf(productId), 3);
});

test("imzası geçersiz bildirim reddedilir, sipariş beklemede kalır", async () => {
  const productId = await seedProduct({ stock: 2 });
  const { conversationId, order } = await startGuestOrder(productId);
  const res = await paytrCallback(server.base, {
    merchantOid: conversationId,
    totalAmount: Math.round(order.totalPrice * 100),
    hash: "gecersiz-imza",
  });
  assert.equal(res.status, 400);
  const after = await Order.findOne({ conversationId });
  assert.equal(after.status, "pending");
  assert.equal(await stockOf(productId), 1); // ödeme ekranında ayrılan adet ayrılmış kalır
});

test("eksik tutarlı bildirim siparişi incelemeye alır, ayrılan stok incelemede tutulur", async () => {
  const productId = await seedProduct({ stock: 2 });
  const { conversationId, order } = await startGuestOrder(productId);
  const res = await paytrCallback(server.base, {
    merchantOid: conversationId,
    totalAmount: Math.round(order.totalPrice * 100) - 1,
  });
  assert.equal(res.text, "OK");
  const after = await Order.findOne({ conversationId });
  assert.equal(after.status, "payment_review");
  assert.equal(await stockOf(productId), 1);
});

test("başarısız ödeme bildirimi bekleyen siparişi iptal eder ve ayrılan stoğu geri ekler", async () => {
  const productId = await seedProduct({ stock: 1 });
  const { conversationId, order } = await startGuestOrder(productId);
  assert.equal(await stockOf(productId), 0);
  const res = await paytrCallback(server.base, {
    merchantOid: conversationId,
    status: "failed",
    totalAmount: Math.round(order.totalPrice * 100),
  });
  assert.equal(res.text, "OK");
  const after = await Order.findOne({ conversationId });
  assert.equal(after.status, "cancelled");
  assert.equal(await stockOf(productId), 1);
});

test("son adet ödeme ekranında ayrılır: ikinci müşteri ödeme başlatamaz, ilki öder", async () => {
  const productId = await seedProduct({ stock: 1 });
  const a = await startGuestOrder(productId, 1, { email: `ilk-${crypto.randomBytes(3).toString("hex")}@test.local` });
  assert.equal(await stockOf(productId), 0);
  const b = await postJson(server.base, "/api/v1/payment/start-guest", {
    cartItems: [{ id: String(productId), size: "M", qty: 1 }],
    address,
    guest: { ...guest, email: `ikinci-${crypto.randomBytes(3).toString("hex")}@test.local` },
    consent: CONSENT,
  });
  assert.equal(b.status, 409);
  assert.ok(["STOCK_TAKEN", undefined].includes(b.data.code)); // fiyatlama da "yetersiz stok" diyebilir
  await paytrCallback(server.base, { merchantOid: a.conversationId, totalAmount: Math.round(a.order.totalPrice * 100) });
  assert.equal((await Order.findOne({ conversationId: a.conversationId })).status, "paid");
  assert.equal(await stockOf(productId), 0);
});

test("sipariş onay ve mock ödeme uçları yalnız metin sipariş kimliği kabul eder", async () => {
  const productId = await seedProduct({ stock: 3 });
  await startGuestOrder(productId);
  for (const path of ["/api/v1/orders/confirm", "/api/v1/payment/mock-complete"]) {
    const res = await postJson(server.base, path, { conversationId: { $regex: "." } });
    assert.equal(res.status, 400, `${path} → ${res.status} ${JSON.stringify(res.data)}`);
  }
});

test("sonuç sayfası için onay ucu durumu açıkça döner: bekliyor, ödendi, başarısız", async () => {
  const productId = await seedProduct({ stock: 3 });
  const paid = await startGuestOrder(productId);
  const pending = await postJson(server.base, "/api/v1/orders/confirm", { conversationId: paid.conversationId });
  assert.equal(pending.status, 409);
  assert.equal(pending.data.state, "pending");

  await paytrCallback(server.base, {
    merchantOid: paid.conversationId,
    totalAmount: Math.round(paid.order.totalPrice * 100),
  });
  const ok = await postJson(server.base, "/api/v1/orders/confirm", { conversationId: paid.conversationId });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.state, "paid");
  assert.equal(ok.data.orderNumber, paid.order.orderNumber);

  const failed = await startGuestOrder(productId);
  await paytrCallback(server.base, { merchantOid: failed.conversationId, status: "failed", totalAmount: 0 });
  const res = await postJson(server.base, "/api/v1/orders/confirm", { conversationId: failed.conversationId });
  assert.equal(res.status, 409);
  assert.equal(res.data.state, "failed");
});

test("ürün detayı önbellekten gelir ama ödeme sonrası stok hemen güncellenir", async () => {
  const productId = await seedProduct({ stock: 3 });
  const detail = async () => (await fetch(`${server.base}/api/v1/products/${productId}`)).json();
  assert.equal((await detail()).sizes[0].stock, 3); // önbelleği doldur
  const { conversationId, order } = await startGuestOrder(productId, 2);
  await paytrCallback(server.base, { merchantOid: conversationId, totalAmount: Math.round(order.totalPrice * 100) });
  assert.equal((await detail()).sizes[0].stock, 1);
});

test("geçersiz ürün kimlikleri 500 yerine 404/400 döner", async () => {
  assert.equal((await fetch(`${server.base}/api/v1/products/gecersiz`)).status, 404);
  assert.equal((await fetch(`${server.base}/api/v1/products?varyantsOf=gecersiz`)).status, 400);
});


test("bildirim iki kez gelse ve onay sayfası da tetiklense müşteriye tek e-posta gider", async () => {
  const email = `tek-eposta-${crypto.randomBytes(4).toString("hex")}@test.local`;
  const productId = await seedProduct({ stock: 5 });
  const { conversationId, order } = await startGuestOrder(productId, 1, { email });
  const totalAmount = Math.round(order.totalPrice * 100);
  await Promise.all([
    paytrCallback(server.base, { merchantOid: conversationId, totalAmount }),
    paytrCallback(server.base, { merchantOid: conversationId, totalAmount }),
    postJson(server.base, "/api/v1/orders/confirm", { conversationId }),
  ]);
  await postJson(server.base, "/api/v1/orders/confirm", { conversationId });
  await new Promise((r) => setTimeout(r, 1500));
  const mails = await mailsTo(email);
  assert.equal(mails.length, 1, `beklenen 1, gelen ${mails.length}`);
  const saved = await Order.findOne({ conversationId });
  assert.ok(saved.orderMailSentAt);
});

test("eksik tutarlı ödemede yöneticiye inceleme uyarısı gider", async () => {
  const productId = await seedProduct({ stock: 2 });
  const { conversationId, order } = await startGuestOrder(productId);
  await paytrCallback(server.base, { merchantOid: conversationId, totalAmount: Math.round(order.totalPrice * 100) - 5 });
  await new Promise((r) => setTimeout(r, 1000));
  const alerts = (await mailsTo("yonetici@oldscks.local")).filter((m) => m.Subject.includes(order.orderNumber));
  assert.equal(alerts.length, 1);
  assert.match(alerts[0].Subject, /incelemede/);
});

test("sözleşme onayı olmadan ödeme başlatılmaz; onay siparişe kaydedilir", async () => {
  const productId = await seedProduct({ stock: 3 });
  const email = `onay-${crypto.randomBytes(4).toString("hex")}@test.local`;
  const body = {
    cartItems: [{ id: String(productId), size: "M", qty: 1 }],
    address,
    guest: { ...guest, email },
  };
  const none = await postJson(server.base, "/api/v1/payment/start-guest", body);
  assert.equal(none.status, 400);
  assert.equal(none.data.code, "CONSENT_REQUIRED");
  const half = await postJson(server.base, "/api/v1/payment/start-guest", {
    ...body,
    consent: { preInformation: true, distanceSales: false, version: "x" },
  });
  assert.equal(half.status, 400);

  const ok = await postJson(server.base, "/api/v1/payment/start-guest", { ...body, consent: CONSENT }, {
    "User-Agent": "onay-testi/1.0",
  });
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  const order = await Order.findOne({ conversationId: ok.data.conversationId });
  assert.equal(order.consent.version, "ön bilgilendirme: ilk metin, sözleşme: ilk metin");
  assert.ok(order.consent.preInformationAcceptedAt instanceof Date);
  assert.ok(order.consent.distanceSalesAcceptedAt instanceof Date);
  assert.equal(order.consent.userAgent, "onay-testi/1.0");
  assert.ok(order.consent.ip);

  // Onay kaydı sipariş onay e-postasında yer alır.
  await paytrCallback(server.base, {
    merchantOid: ok.data.conversationId,
    totalAmount: Math.round(order.totalPrice * 100),
  });
  const mails = await mailsTo(email, { waitMs: 5000 });
  const confirmation = mails.find((m) => m.Subject.includes(order.orderNumber));
  assert.ok(confirmation, "onay e-postası gelmedi");
  assert.match(confirmation.Text, /Mesafeli Satış Sözleşmesi .* onaylandı \(metin sürümü: ön bilgilendirme: ilk metin, sözleşme: ilk metin\)/);
});
