const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { startTestServer, postJson } = require("./helpers");

let server;
let adminToken;
let Products;

async function seedCategory(parent = null) {
  const _id = new mongoose.Types.ObjectId();
  await mongoose.connection.collection("categories").insertOne({
    _id,
    name: `İndirim kategori ${_id}`,
    parent,
    archivedAt: null,
  });
  return _id;
}

async function seedProduct({ originalPrice = 1000, price = 1000, category } = {}) {
  const _id = new mongoose.Types.ObjectId();
  await Products.insertOne({
    _id,
    name: `İndirim ürün ${_id}`,
    images: [],
    imageAssets: [],
    price,
    originalPrice,
    discount: originalPrice > price ? Math.round((100 - (price / originalPrice) * 100) * 100) / 100 : 0,
    category: category || (await seedCategory()),
    color: "",
    sizes: [{ _id: new mongoose.Types.ObjectId(), size: "M", stock: 3 }],
    description: "",
    parentProductId: null,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return _id;
}

async function priceOf(id) {
  const p = await Products.findOne({ _id: id });
  return { price: p.price, discount: p.discount };
}

async function admin(method, pathName, body) {
  const res = await fetch(`${server.base}/api/v1${pathName}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

function createRule(productIds, rate, extra = {}) {
  return admin("POST", "/discounts", {
    title: "Sezon indirimi",
    discountRate: rate,
    selectionType: "product",
    targetIds: productIds.map(String),
    isActive: true,
    ...extra,
  });
}

test.before(async () => {
  server = await startTestServer();
  Products = mongoose.connection.collection("products");
  const password = `Test-${crypto.randomBytes(6).toString("hex")}!aA1`;
  await mongoose.connection.collection("users").insertOne({
    firstName: "Test",
    lastName: "Yönetici",
    email: "indirim-yonetici@test.local",
    password: await bcrypt.hash(password, 4),
    role: "admin",
    tokenVersion: 0,
    addresses: [],
    refreshTokens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const login = await postJson(server.base, "/api/v1/auth/login", {
    email: "indirim-yonetici@test.local",
    password,
  });
  assert.equal(login.status, 200);
  adminToken = login.data.accessToken;
});

test.after(async () => {
  await server?.stop();
});

test("kural kapanınca elle girilen satış fiyatı kuruşu kuruşuna geri gelir", async () => {
  const id = await seedProduct({ originalPrice: 1000, price: 899.9 });
  const rule = await createRule([id], 20);
  assert.equal(rule.status, 201, JSON.stringify(rule.data));
  assert.deepEqual(await priceOf(id), { price: 800, discount: 20 });

  const off = await admin("PUT", `/discounts/${rule.data._id}/toggle`, { isActive: false });
  assert.equal(off.status, 200);
  assert.deepEqual(await priceOf(id), { price: 899.9, discount: 10.01 });
});

test("kural fiyatı hiçbir zaman yükseltmez", async () => {
  const id = await seedProduct({ originalPrice: 1000, price: 600 });
  const rule = await createRule([id], 20);
  assert.equal(rule.status, 201);
  assert.equal((await priceOf(id)).price, 600);
  await admin("DELETE", `/discounts/${rule.data._id}`);
  assert.equal((await priceOf(id)).price, 600);
});

test("kural açıkken fiyat elle değiştirildiyse kural kapanınca o fiyata dokunulmaz", async () => {
  const id = await seedProduct({ originalPrice: 1000, price: 1000 });
  const rule = await createRule([id], 20);
  await Products.updateOne({ _id: id }, { $set: { price: 750, discount: 25 } });
  await admin("PUT", `/discounts/${rule.data._id}/toggle`, { isActive: false });
  assert.deepEqual(await priceOf(id), { price: 750, discount: 25 });
});

test("oran değişince yeni oran uygulanır, kapanınca ilk fiyata dönülür", async () => {
  const id = await seedProduct({ originalPrice: 1000, price: 899.9 });
  const rule = await createRule([id], 20);
  const updated = await admin("PUT", `/discounts/${rule.data._id}`, {
    title: "Sezon indirimi",
    discountRate: 30,
    selectionType: "product",
    targetIds: [String(id)],
    isActive: true,
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.data));
  assert.equal((await priceOf(id)).price, 700);
  await admin("PUT", `/discounts/${rule.data._id}/toggle`, { isActive: false });
  assert.equal((await priceOf(id)).price, 899.9);
});

test("çakışan kural reddedilir; ürün fiyatı ve kural listesi değişmez", async () => {
  const id = await seedProduct({ originalPrice: 500, price: 500 });
  const first = await createRule([id], 10);
  assert.equal(first.status, 201);
  const before = await mongoose.connection.collection("discounts").countDocuments();

  const second = await createRule([id], 40);
  assert.equal(second.status, 409);
  assert.equal((await priceOf(id)).price, 450);
  assert.equal(await mongoose.connection.collection("discounts").countDocuments(), before);

  const inactive = await createRule([id], 40, { isActive: false });
  assert.equal(inactive.status, 201);
  const activate = await admin("PUT", `/discounts/${inactive.data._id}/toggle`, { isActive: true });
  assert.equal(activate.status, 409);
  const stored = await mongoose.connection
    .collection("discounts")
    .findOne({ _id: new mongoose.Types.ObjectId(inactive.data._id) });
  assert.equal(stored.isActive, false);
  assert.equal((await priceOf(id)).price, 450);
});

test("geçersiz oran reddedilir", async () => {
  const id = await seedProduct();
  for (const rate of [0, 100, -5, "abc"]) {
    const res = await createRule([id], rate);
    assert.equal(res.status, 400, `oran ${rate}`);
  }
  assert.equal((await priceOf(id)).price, 1000);
});

test("kategori kuralı alt kategorileri kapsar; vitrin yeni fiyatı hemen gösterir", async () => {
  const root = await seedCategory();
  const child = await seedCategory(root);
  const id = await seedProduct({ originalPrice: 400, price: 400, category: child });

  // Önbelleği eski fiyatla doldur.
  const warm = await fetch(`${server.base}/api/v1/products/${id}`);
  assert.equal(warm.status, 200);
  assert.equal((await warm.json()).price, 400);

  const rule = await admin("POST", "/discounts", {
    title: "Kategori indirimi",
    discountRate: 25,
    selectionType: "category",
    targetIds: [String(root)],
    isActive: true,
  });
  assert.equal(rule.status, 201);
  const fresh = await fetch(`${server.base}/api/v1/products/${id}`);
  assert.equal((await fresh.json()).price, 300);

  await admin("DELETE", `/discounts/${rule.data._id}`);
  const restored = await fetch(`${server.base}/api/v1/products/${id}`);
  assert.equal((await restored.json()).price, 400);
});
