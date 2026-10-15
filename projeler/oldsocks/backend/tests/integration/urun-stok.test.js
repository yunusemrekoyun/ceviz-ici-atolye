const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { startTestServer, postJson, CONSENT } = require("./helpers");

let server;
let adminToken;
let assetId;
let categoryId;
let Products;

const id = () => new mongoose.Types.ObjectId();

async function seedProduct(sizes) {
  const _id = id();
  await Products.insertOne({
    _id, name: `Stok ürünü ${_id}`, images: [], imageAssets: [assetId], price: 100, originalPrice: 100, discount: 0,
    category: categoryId, color: "", sizes: sizes.map(([size, stock]) => ({ _id: id(), size, stock })),
    description: "", parentProductId: null, archivedAt: null, createdAt: new Date(), updatedAt: new Date(),
  });
  return _id;
}

// Formun açıldığı an: satırlar kimlik ve açılıştaki stokla gelir (EditProductForm).
async function openForm(productId) {
  const product = await Products.findOne({ _id: productId });
  return product.sizes.map((s) => ({ _id: String(s._id), size: s.size, stock: s.stock, loadedStock: s.stock }));
}

async function save(productId, sizes, extra = {}) {
  const res = await fetch(`${server.base}/api/v1/products/${productId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: "Stok ürünü", price: 100, originalPrice: 100, category: String(categoryId),
      imageAssetIds: [String(assetId)], sizes, ...extra,
    }),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

const stocks = async (productId) =>
  Object.fromEntries((await Products.findOne({ _id: productId })).sizes.map((s) => [s.size, s.stock]));

function hold(productId, size) {
  return postJson(server.base, "/api/v1/payment/start-guest", {
    cartItems: [{ id: String(productId), size, qty: 1 }],
    address: { title: "Ev", mainaddress: "Adres 1", street: "Sk", district: "Merkez", city: "Kütahya", postalCode: "43000" },
    guest: {
      firstName: "Stok", lastName: "Müşteri", email: `stok-${crypto.randomBytes(3).toString("hex")}@test.local`,
      phone: "05551234567", registrationAddress: "Adres 1",
    },
    consent: CONSENT,
  });
}

test.before(async () => {
  server = await startTestServer();
  const db = mongoose.connection;
  Products = db.collection("products");
  assetId = id();
  await db.collection("mediaassets").insertOne({
    _id: assetId, kind: "image", purpose: "product_image", status: "ready", createdBy: id(),
    original: { fileName: "a.jpg", stagingKey: "staging/a", checksumSha256: "abc" },
    manifestKey: "product_image/a/manifest.json",
    variants: [{ name: "w640", kind: "image", format: "webp", key: "product_image/a/w640.webp", url: "", mime: "image/webp", bytes: 10, width: 640, height: 800 }],
  });
  categoryId = id();
  await db.collection("categories").insertOne({ _id: categoryId, name: "Stok kategori", parent: null, archivedAt: null });
  await db.collection("shippingmethods").insertOne({ name: "Standart", fee: 10, freeShippingThreshold: null });
  const password = `Test-${crypto.randomBytes(6).toString("hex")}!aA1`;
  await db.collection("users").insertOne({
    firstName: "Stok", lastName: "Yönetici", email: "stok-yonetici@test.local", password: await bcrypt.hash(password, 4),
    role: "admin", tokenVersion: 0, addresses: [], refreshTokens: [], createdAt: new Date(), updatedAt: new Date(),
  });
  adminToken = (await postJson(server.base, "/api/v1/auth/login", { email: "stok-yonetici@test.local", password })).data.accessToken;
});

test.after(async () => {
  await server?.stop();
});

test("form açıkken ayrılan adet, başka bedeni kaydeden yönetici tarafından ezilmez", async () => {
  const productId = await seedProduct([["M", 5], ["L", 3]]);
  const form = await openForm(productId);
  assert.equal((await hold(productId, "M")).status, 200);
  form[1].stock = 6;
  const res = await save(productId, form);
  assert.equal(res.status, 200, JSON.stringify(res.data));
  assert.deepEqual(await stocks(productId), { M: 4, L: 6 });
});

test("stoğu form açıkken değişen bedende yönetici güncel değeri görür; onaylayınca yazılır, tekrar gönderim etkisiz", async () => {
  const productId = await seedProduct([["M", 5]]);
  const form = await openForm(productId);
  assert.equal((await hold(productId, "M")).status, 200);
  form[0].stock = 8;
  const conflict = await save(productId, form);
  assert.equal(conflict.status, 409);
  assert.equal(conflict.data.code, "STOCK_CHANGED");
  assert.deepEqual(conflict.data.conflicts.map((c) => [c.size, c.current, c.entered]), [["M", 4, 8]]);
  assert.match(conflict.data.message, /M şu an 4/);
  assert.deepEqual(await stocks(productId), { M: 4 });

  form[0].loadedStock = 4;
  assert.equal((await save(productId, form)).status, 200);
  assert.deepEqual(await stocks(productId), { M: 8 });
  // Yanıt kaybolup aynı form yeniden gönderilirse stok ikinci kez değişmez.
  assert.equal((await save(productId, form)).status, 409);
  assert.deepEqual(await stocks(productId), { M: 8 });
});

test("beden adı değiştirilen satır kendi stoğunu korur, bedensiz ürün de aynı kuralla kaydedilir", async () => {
  const productId = await seedProduct([["M", 2], ["L", 7]]);
  const form = await openForm(productId);
  const renamed = [{ ...form[1], size: "M" }]; // M satırı silindi, L'nin adı M yapıldı
  assert.equal((await save(productId, renamed)).status, 200);
  assert.deepEqual(await stocks(productId), { M: 7 });

  const single = await seedProduct([["", 10]]);
  const singleForm = await openForm(single);
  assert.equal((await hold(single, "")).status, 200);
  singleForm[0].stock = 12;
  assert.equal((await save(single, singleForm)).status, 409);
  assert.deepEqual(await stocks(single), { "": 9 });
});

test("kayıt ile eşzamanlı ayrımlar kaybolmaz", async () => {
  for (let round = 0; round < 4; round += 1) {
    const productId = await seedProduct([["M", 20], ["L", 1]]);
    const form = await openForm(productId);
    form[1].stock = 9;
    const results = await Promise.all([
      ...Array.from({ length: 5 }, () => hold(productId, "M")),
      save(productId, form, { description: `tur ${round}` }),
    ]);
    assert.deepEqual(results.map((r) => r.status), [200, 200, 200, 200, 200, 200], JSON.stringify(results.at(-1).data));
    assert.deepEqual(await stocks(productId), { M: 15, L: 9 });
  }
});

test("çakışmadan sonra yalnız değiştirilen beden yazılır; dokunulmamış bedende ayrım korunur", async () => {
  const productId = await seedProduct([["M", 5], ["L", 5]]);
  const form = await openForm(productId);
  assert.equal((await hold(productId, "M")).status, 200);
  assert.equal((await hold(productId, "L")).status, 200);
  form[1].stock = 8;
  const conflict = await save(productId, form);
  assert.equal(conflict.status, 409);
  assert.deepEqual(conflict.data.conflicts.map((c) => c.size), ["L"]);
  // Formun yaptığı gibi (frontend/src/utils/stockConflict): dokunulmamış satır güncel stoğu alır.
  const fresh = new Map(conflict.data.sizes.map((s) => [String(s._id), s.stock]));
  const next = form.map((row) =>
    row.stock === row.loadedStock
      ? { ...row, stock: fresh.get(row._id), loadedStock: fresh.get(row._id) }
      : { ...row, loadedStock: fresh.get(row._id) }
  );
  assert.equal((await save(productId, next)).status, 200);
  assert.deepEqual(await stocks(productId), { M: 4, L: 8 });
});

test("diğer alanlardan biri geçersizse stok da yazılmaz", async () => {
  const productId = await seedProduct([["M", 5]]);
  const form = await openForm(productId);
  form[0].stock = 9;
  const res = await save(productId, form, { color: "x".repeat(81) });
  assert.equal(res.status, 400);
  assert.match(res.data.message, /Renk/);
  assert.deepEqual(await stocks(productId), { M: 5 });
});

test("güncellemeden önce açılmış eski yönetim paneli sekmesi stoğu ezemez, sayfayı yenilemesi istenir", async () => {
  const productId = await seedProduct([["M", 5]]);
  const form = (await openForm(productId)).map(({ loadedStock, ...row }) => row); // eski panel loadedStock göndermez
  assert.equal((await hold(productId, "M")).status, 200);
  form[0].stock = 5;
  const res = await save(productId, form, { description: "eski sekmeden" });
  assert.equal(res.status, 409);
  assert.equal(res.data.code, "STALE_FORM");
  assert.deepEqual(await stocks(productId), { M: 4 });
  assert.notEqual((await Products.findOne({ _id: productId })).description, "eski sekmeden");
});
