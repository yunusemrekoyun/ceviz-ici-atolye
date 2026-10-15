const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const mongoose = require("mongoose");
const { startTestServer } = require("./helpers");

const INDEX = `<!DOCTYPE html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <title>OLDSOCKS</title>
    <meta
      name="description"
      content="Genel açıklama"
    />
    <meta property="og:site_name" content="OLDSOCKS" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="OLDSOCKS" />
    <script type="module" crossorigin src="/assets/index-TEST.js"></script>
  </head>
  <body><div id="root"></div></body>
</html>
`;

let server;
let indexFile;
const db = () => mongoose.connection;
const id = () => new mongoose.Types.ObjectId();

test.before(async () => {
  indexFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "oldsocks-index-")), "index.html");
  fs.writeFileSync(indexFile, INDEX);
  server = await startTestServer({ SITE_INDEX_HTML: indexFile, SITE_URL: "https://www.oldscks.test" });
});

test.after(async () => {
  await server?.stop();
});

const page = async (productId) => {
  const res = await fetch(`${server.base}/product-details/${productId}`);
  return { res, html: await res.text() };
};
const count = (html, needle) => html.split(needle).length - 1;

test("ürün sayfası paylaşım önizlemesi için ürünün adı, açıklaması ve JPEG görseliyle gelir", async () => {
  const category = id();
  const asset = id();
  const product = id();
  await db().collection("categories").insertOne({ _id: category, name: "Alt", parent: null, archivedAt: null });
  const variant = (name, format, width, mime) => ({
    name, kind: "image", format, key: `product_image/${asset}/${name}.${format === "jpeg" ? "jpg" : format}`,
    url: "", mime, bytes: 1, width, height: Math.round(width * 1.33), durationSeconds: null, bitrate: null,
  });
  await db().collection("mediaassets").insertOne({
    _id: asset, purpose: "product_image", kind: "image", status: "ready", createdBy: id(),
    original: { fileName: "a.jpg", bytes: 1 }, metadata: {}, primaryVariant: "w960", manifestKey: "",
    variants: [variant("w640", "webp", 640, "image/webp"), variant("w960", "webp", 960, "image/webp"), variant("fallback", "jpeg", 1086, "image/jpeg")],
  });
  await db().collection("products").insertOne({
    _id: product, name: 'Kadife "Baggy" <Jean>', description: "", price: 1349.99, originalPrice: 1349.99, discount: 0,
    category, color: "", sizes: [], images: [], imageAssets: [asset], videoAsset: null, video: "",
    parentProductId: null, archivedAt: null,
  });

  const { res, html } = await page(product);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/html/);
  assert.equal(res.headers.get("content-security-policy"), null, "mağaza sayfası API'nin CSP'sini almamalı");
  assert.equal(res.headers.get("cache-control"), "no-cache");

  assert.equal(count(html, "<title>"), 1);
  assert.ok(html.includes("<title>Kadife &quot;Baggy&quot; &lt;Jean&gt; | OLDSOCKS</title>"));
  assert.ok(!html.includes("<Jean>"), "ürün adı kaçırılmadan sayfaya girmemeli");
  assert.equal(count(html, 'property="og:title"'), 1);
  assert.equal(count(html, 'name="description"'), 1);
  assert.ok(html.includes('<meta property="og:type" content="product" />'));
  assert.ok(html.includes("₺1.349,99"), "açıklama yoksa fiyat yazılır");
  assert.ok(html.includes(`<meta property="og:image" content="${server.base}/media/product_image/${asset}/fallback.jpg" />`));
  assert.ok(html.includes(`<meta property="og:url" content="https://www.oldscks.test/product-details/${product}" />`));
  assert.ok(html.includes('<meta property="og:image:type" content="image/jpeg" />'));
  assert.ok(html.includes('src="/assets/index-TEST.js"'), "uygulama betiği yerinde kalmalı");
  assert.ok(html.includes('<meta property="og:site_name" content="OLDSOCKS" />'));
});

test("bulunamayan, arşivlenen ya da bozuk adresli üründe düz sayfa döner", async () => {
  const archived = id();
  await db().collection("products").insertOne({
    _id: archived, name: "Eski", description: "", price: 10, originalPrice: 10, discount: 0, category: id(),
    color: "", sizes: [], images: [], imageAssets: [], parentProductId: null, archivedAt: new Date(),
  });
  for (const target of [id(), archived, "bozuk-adres"]) {
    const { res, html } = await page(target);
    assert.equal(res.status, 200);
    assert.equal(html, INDEX);
  }
});

test("index.html okunamazsa 404 verir; Nginx düz sayfaya döner", async () => {
  fs.rmSync(indexFile);
  const { res } = await page(id());
  assert.equal(res.status, 404);
});
