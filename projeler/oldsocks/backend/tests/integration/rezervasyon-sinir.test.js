const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { startTestServer, postJson, CONSENT } = require("./helpers");

let server;
let productId;

test.before(async () => {
  // 5 dakika izin verilen alt sınırın altında: 10 dakikaya yükseltilir.
  server = await startTestServer({ STOCK_HOLDS_PER_IP: "2", STOCK_HOLD_MINUTES: "5" });
  await mongoose.connection.collection("shippingmethods").insertOne({ name: "Standart", fee: 10, freeShippingThreshold: null });
  productId = await seedProduct();
});

test.after(async () => {
  await server?.stop();
});

const address = { title: "Ev", mainaddress: "Adres 1", street: "Sk", district: "Merkez", city: "Kütahya", postalCode: "43000" };

async function seedProduct() {
  const _id = new mongoose.Types.ObjectId();
  await mongoose.connection.collection("products").insertOne({
    _id, name: `Sınır ürün ${_id}`, images: [], imageAssets: [], price: 100, originalPrice: 100, discount: 0,
    category: new mongoose.Types.ObjectId(), sizes: [{ _id: new mongoose.Types.ObjectId(), size: "M", stock: 100 }],
    description: "", parentProductId: null, archivedAt: null, createdAt: new Date(), updatedAt: new Date(),
  });
  return _id;
}

const start = (email, ip, product = productId) =>
  postJson(
    server.base,
    "/api/v1/payment/start-guest",
    {
      cartItems: [{ id: String(product), size: "M", qty: 1 }],
      address,
      guest: { firstName: "Sınır", lastName: "Deneme", email, phone: "05551234567", registrationAddress: "Adres 1" },
      consent: CONSENT,
    },
    { "X-Forwarded-For": ip }
  );

test("aynı IP aynı anda en fazla izin verilen sayıda ödeme oturumu açabilir", async () => {
  assert.equal((await start("a@sinir.test", "10.20.0.1")).status, 200);
  assert.equal((await start("b@sinir.test", "10.20.0.1")).status, 200);
  const third = await start("c@sinir.test", "10.20.0.1");
  assert.equal(third.status, 429);
  assert.equal(third.data.code, "TOO_MANY_HOLDS");
  assert.equal((await start("d@sinir.test", "10.20.0.2")).status, 200);
});

test("aynı IP'den eşzamanlı başlatmalar da sınırı aşamaz", async () => {
  // Farklı ürünler: aynı ürünün stok kaydı zaten işlemleri sıraya sokar.
  const products = await Promise.all(Array.from({ length: 8 }, () => seedProduct()));
  const results = await Promise.all(
    products.map((product, i) => start(`es-${i}@sinir.test`, "10.20.0.3", product))
  );
  const statuses = results.map((r) => r.status).sort();
  assert.deepEqual(statuses, [200, 200, 429, 429, 429, 429, 429, 429]);
});

test("IPv6'da aynı ağdaki farklı adresler tek bağlantı sayılır", async () => {
  assert.equal((await start("v6a@sinir.test", "2001:db8:5:1::1")).status, 200);
  assert.equal((await start("v6b@sinir.test", "2001:db8:5:2::9")).status, 200);
  assert.equal((await start("v6c@sinir.test", "2001:db8:5:3:ffff::3")).status, 429);
});

test("üye, bağlantının misafir sınırına takılmaz", async () => {
  const email = `uye-${crypto.randomBytes(3).toString("hex")}@sinir.test`;
  const password = `Test-${crypto.randomBytes(6).toString("hex")}!aA1`;
  const addressId = new mongoose.Types.ObjectId();
  await mongoose.connection.collection("users").insertOne({
    firstName: "Sınır", lastName: "Üye", email, phone: "+905551234567", password: await bcrypt.hash(password, 4),
    role: "user", tokenVersion: 0, refreshTokens: [], createdAt: new Date(), updatedAt: new Date(),
    addresses: [{ _id: addressId, ...address }],
  });
  const login = await postJson(server.base, "/api/v1/auth/login", { email, password });
  const member = await postJson(
    server.base,
    "/api/v1/payment/start",
    { cartItems: [{ id: String(productId), size: "M", qty: 1 }], addressId: String(addressId), consent: CONSENT },
    { Authorization: `Bearer ${login.data.accessToken}`, "X-Forwarded-For": "10.20.0.1" }
  );
  assert.equal(member.status, 200, JSON.stringify(member.data));
});

test("en kısa ayrım süresinde de ödeme formu açılır", async () => {
  const res = await start("form@sinir.test", "10.20.0.9");
  assert.equal(res.status, 200, JSON.stringify(res.data));
  const minutes = (new Date(res.data.reservedUntil) - Date.now()) / 60000;
  assert.ok(minutes > 9 && minutes <= 10, String(minutes));
  const inline = await fetch(`${server.base}/api/v1/payment/inline/${res.data.conversationId}`);
  assert.equal(inline.status, 200);
});

async function memberLogin(email) {
  const password = `Test-${crypto.randomBytes(6).toString("hex")}!aA1`;
  const addressId = new mongoose.Types.ObjectId();
  await mongoose.connection.collection("users").insertOne({
    firstName: "Sınır", lastName: "Üye", email, phone: "+905551234567", password: await bcrypt.hash(password, 4),
    role: "user", tokenVersion: 0, refreshTokens: [], createdAt: new Date(), updatedAt: new Date(),
    addresses: [{ _id: addressId, ...address }],
  });
  const login = await postJson(server.base, "/api/v1/auth/login", { email, password });
  return { token: login.data.accessToken, addressId };
}

const startMember = (member, product, previousConversationId) =>
  postJson(
    server.base,
    "/api/v1/payment/start",
    {
      cartItems: [{ id: String(product), size: "M", qty: 1 }],
      addressId: String(member.addressId),
      consent: CONSENT,
      previousConversationId,
    },
    { Authorization: `Bearer ${member.token}`, "X-Forwarded-For": "10.30.0.1" }
  );

const stockOf = async (product) => (await mongoose.connection.collection("products").findOne({ _id: product })).sizes[0].stock;

test("misafirken ödemeye geçip giriş yapan üye ödeme başlatabilir; misafir oturumu kapanır", async () => {
  const product = await seedProduct();
  await mongoose.connection.collection("products").updateOne({ _id: product }, { $set: { "sizes.0.stock": 1 } });
  const asGuest = await start("once-misafir@sinir.test", "10.30.0.1", product);
  assert.equal(asGuest.status, 200);
  const member = await memberLogin(`sonra-uye-${crypto.randomBytes(3).toString("hex")}@sinir.test`);
  const res = await startMember(member, product, asGuest.data.conversationId);
  assert.equal(res.status, 200, JSON.stringify(res.data));
  const old = await mongoose.connection.collection("orders").findOne({ conversationId: asGuest.data.conversationId });
  assert.equal(old.cancelReason, "session_replaced");
  assert.equal(await stockOf(product), 0);
});

test("üye, başka bir hesabın ödeme oturumunu kapatamaz", async () => {
  const product = await seedProduct();
  const first = await memberLogin(`ilk-${crypto.randomBytes(3).toString("hex")}@sinir.test`);
  const second = await memberLogin(`ikinci-${crypto.randomBytes(3).toString("hex")}@sinir.test`);
  const a = await startMember(first, product);
  assert.equal(a.status, 200);
  assert.equal((await startMember(second, product, a.data.conversationId)).status, 200);
  const order = await mongoose.connection.collection("orders").findOne({ conversationId: a.data.conversationId });
  assert.equal(order.status, "pending");
});

test("süresi dolmuş ama henüz geri verilmemiş kendi ayrımı sepette mevcut sayılır", async () => {
  const product = await seedProduct();
  await mongoose.connection.collection("products").updateOne({ _id: product }, { $set: { "sizes.0.stock": 1 } });
  const res = await start("suresi-dolan@sinir.test", "10.30.0.2", product);
  assert.equal(res.status, 200);
  await mongoose.connection
    .collection("orders")
    .updateOne({ conversationId: res.data.conversationId }, { $set: { stockReservedUntil: new Date(Date.now() - 1000) } });
  const check = await postJson(server.base, "/api/v1/cart-campaigns/check", {
    cartItems: [{ id: String(product), size: "M", qty: 1 }],
    heldBy: res.data.conversationId,
  });
  assert.equal(check.data.items[0].status, "ok");
  assert.equal(check.data.items[0].available, 1);
});

test("bağlantı başına ayrım sayımı kendi indeksini kullanır", async () => {
  const orders = mongoose.connection.collection("orders");
  const indexName = "stockHoldKey_1_status_1_stockReservedUntil_1";
  for (let i = 0; i < 40 && !(await orders.indexes()).some((ix) => ix.name === indexName); i += 1) {
    await new Promise((r) => setTimeout(r, 100));
  }
  const plan = await orders
    .find({
      stockHoldKey: { $eq: "10.20.0.1", $type: "string" },
      status: "pending",
      stockUpdated: true,
      stockReservedUntil: { $gt: new Date() },
    })
    .explain("queryPlanner");
  // Kısmi indeks yalnız $type ile yazılmış sorguda aday olur; seçilip seçilmemesi veri
  // miktarına bağlı olduğundan aday planlar arasında olması yeterli.
  const candidates = [plan.queryPlanner.winningPlan, ...(plan.queryPlanner.rejectedPlans || [])];
  assert.match(JSON.stringify(candidates), new RegExp(indexName));
  const plain = await orders
    .find({ stockHoldKey: "10.20.0.1", status: "pending", stockUpdated: true, stockReservedUntil: { $gt: new Date() } })
    .explain("queryPlanner");
  const plainCandidates = [plain.queryPlanner.winningPlan, ...(plain.queryPlanner.rejectedPlans || [])];
  assert.doesNotMatch(JSON.stringify(plainCandidates), new RegExp(indexName));
});

test("aynı tarayıcıda başka hesaba geçen üyenin önizlemesi önceki hesabın ayrımını saymaz", async () => {
  const product = await seedProduct();
  await mongoose.connection.collection("products").updateOne({ _id: product }, { $set: { "sizes.0.stock": 1 } });
  const first = await memberLogin(`onceki-${crypto.randomBytes(3).toString("hex")}@sinir.test`);
  const second = await memberLogin(`sonraki-${crypto.randomBytes(3).toString("hex")}@sinir.test`);
  const a = await startMember(first, product);
  assert.equal(a.status, 200);
  const preview = (member) =>
    postJson(
      server.base,
      "/api/v1/cart-campaigns/preview",
      { cartItems: [{ id: String(product), size: "M", qty: 1 }], heldBy: a.data.conversationId },
      { Authorization: `Bearer ${member.token}` }
    );
  assert.equal((await preview(first)).status, 200);
  const other = await preview(second);
  assert.equal(other.status, 409);
  assert.match(other.data.message, /stok/i);
});

test("çıkış yapıp yeniden giren üyenin kendi ayrımı sepette mevcut sayılır", async () => {
  const product = await seedProduct();
  await mongoose.connection.collection("products").updateOne({ _id: product }, { $set: { "sizes.0.stock": 1 } });
  const member = await memberLogin(`yeniden-giris-${crypto.randomBytes(3).toString("hex")}@sinir.test`);
  assert.equal((await startMember(member, product)).status, 200);
  const cartItems = [{ id: String(product), size: "M", qty: 1 }];
  const anonymous = await postJson(server.base, "/api/v1/cart-campaigns/check", { cartItems });
  assert.equal(anonymous.data.items[0].available, 0);
  const own = await postJson(server.base, "/api/v1/cart-campaigns/check", { cartItems }, { Authorization: `Bearer ${member.token}` });
  assert.equal(own.data.items[0].status, "ok");
  assert.equal(own.data.items[0].available, 1);
});

test("süresi dolmuş oturum anahtarıyla sepet kontrolü 401 döner (istemci yenileyip tekrarlar); bozuk anahtar misafir sayılır", async () => {
  const jwt = require("jsonwebtoken");
  const product = await seedProduct();
  const member = await memberLogin(`suresi-dolan-${crypto.randomBytes(3).toString("hex")}@sinir.test`);
  const user = await mongoose.connection.collection("users").findOne({ "addresses._id": member.addressId });
  const expired = jwt.sign({ userId: String(user._id), tokenVersion: 0 }, server.env.JWT_SECRET, { expiresIn: -10 });
  const cartItems = [{ id: String(product), size: "M", qty: 1 }];
  const res = await postJson(server.base, "/api/v1/cart-campaigns/check", { cartItems }, { Authorization: `Bearer ${expired}` });
  assert.equal(res.status, 401);
  const broken = await postJson(server.base, "/api/v1/cart-campaigns/check", { cartItems }, { Authorization: "Bearer bozuk" });
  assert.equal(broken.status, 200);
});

test("önizleme, başka hesabın ödeme oturumunu kupon sayımında hariç tutmaz (üyenin kendi ayrımı olsa da)", async () => {
  const product = await seedProduct();
  const other = await seedProduct();
  const code = `SNR${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  await mongoose.connection.collection("coupons").insertOne({
    code, isEnabled: true, discountType: "percent", discountValue: 10, minimumSubtotal: 0,
    expiresAt: null, maxUses: 1, productIds: [product], createdAt: new Date(), updatedAt: new Date(),
  });
  const a = await memberLogin(`kupon-a-${crypto.randomBytes(3).toString("hex")}@sinir.test`);
  const b = await memberLogin(`kupon-b-${crypto.randomBytes(3).toString("hex")}@sinir.test`);
  const withCoupon = await postJson(
    server.base,
    "/api/v1/payment/start",
    { cartItems: [{ id: String(product), size: "M", qty: 1 }], addressId: String(a.addressId), couponCode: code, consent: CONSENT },
    { Authorization: `Bearer ${a.token}`, "X-Forwarded-For": "10.30.0.5" }
  );
  assert.equal(withCoupon.status, 200, JSON.stringify(withCoupon.data));
  assert.equal((await startMember(b, other)).status, 200);
  const preview = await postJson(
    server.base,
    "/api/v1/cart-campaigns/preview",
    { cartItems: [{ id: String(product), size: "M", qty: 1 }], couponCode: code, heldBy: withCoupon.data.conversationId },
    { Authorization: `Bearer ${b.token}` }
  );
  assert.equal(preview.status, 409);
  assert.match(preview.data.message, /kullanım sınırına/);
});
