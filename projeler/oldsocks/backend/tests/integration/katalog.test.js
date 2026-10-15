const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const zlib = require("node:zlib");
const mongoose = require("mongoose");
const { startTestServer } = require("./helpers");

let server;

// fetch Accept-Encoding'i kendisi yönetir; ham yanıt için düşük seviyeli istek.
function rawGet(pathName, headers = {}, method = "GET") {
  const url = new URL(pathName, server.base);
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method, headers }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on("error", reject);
    req.end();
  });
}

test.before(async () => {
  server = await startTestServer();
  const db = mongoose.connection;
  const assetId = new mongoose.Types.ObjectId();
  await db.collection("mediaassets").insertOne({
    _id: assetId,
    kind: "image",
    purpose: "product_image",
    status: "ready",
    createdBy: new mongoose.Types.ObjectId(),
    original: { fileName: "musteri-adi-telefon.jpg", stagingKey: "staging/x", checksumSha256: "abc" },
    manifestKey: "product_image/x/manifest.json",
    variants: [{ name: "w640", kind: "image", format: "webp", key: "product_image/x/w640.webp", url: "", mime: "image/webp", bytes: 10, width: 640, height: 800 }],
  });
  const categoryId = new mongoose.Types.ObjectId();
  await db.collection("categories").insertOne({ _id: categoryId, name: "Kat", parent: null, archivedAt: null, imageAsset: assetId });
  await db.collection("products").insertOne({
    name: "Katalog ürünü", images: [], imageAssets: [assetId], price: 100, originalPrice: 100, discount: 0,
    category: categoryId, color: "", sizes: [{ size: "M", stock: 2 }], description: "", parentProductId: null,
    archivedAt: null, createdAt: new Date(), updatedAt: new Date(),
  });
});

test.after(async () => {
  await server?.stop();
});

test("ürün listesi ETag ile döner, aynı ETag ile 304 alır", async () => {
  const first = await rawGet("/api/v1/products?view=compact");
  assert.equal(first.status, 200);
  assert.match(first.headers.etag, /^W\/"/);
  const again = await rawGet("/api/v1/products?view=compact", { "If-None-Match": first.headers.etag });
  assert.equal(again.status, 304);
  assert.equal(again.body.length, 0);
});

test("brotli ve gzip çıktısı açıldığında düz JSON ile aynıdır", async () => {
  const plain = await rawGet("/api/v1/products?view=compact", { "Accept-Encoding": "identity" });
  const br = await rawGet("/api/v1/products?view=compact", { "Accept-Encoding": "br, gzip" });
  const gz = await rawGet("/api/v1/products?view=compact", { "Accept-Encoding": "gzip" });
  assert.equal(br.headers["content-encoding"], "br");
  assert.equal(gz.headers["content-encoding"], "gzip");
  assert.equal(plain.headers["content-encoding"], undefined);
  assert.deepEqual(zlib.brotliDecompressSync(br.body), plain.body);
  assert.deepEqual(zlib.gunzipSync(gz.body), plain.body);
  const list = JSON.parse(plain.body);
  assert.equal(list[0].name, "Katalog ürünü");
});

test("hazır yanıt yolunda da iç medya alanları sızmaz", async () => {
  const res = await rawGet("/api/v1/products?view=compact", { "Accept-Encoding": "identity" });
  const text = res.body.toString();
  for (const secret of ["musteri-adi-telefon.jpg", "stagingKey", "manifestKey", "createdBy", "checksumSha256"]) {
    assert.equal(text.includes(secret), false, secret);
  }
});

test("HEAD isteği gövdesiz 200 döner", async () => {
  const res = await rawGet("/api/v1/products?view=compact", {}, "HEAD");
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 0);
});
