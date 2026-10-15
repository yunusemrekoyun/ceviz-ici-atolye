const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { startTestServer } = require("./helpers");

let server;

test.before(async () => {
  server = await startTestServer({ SITE_URL: "https://www.oldscks.test" });
});

test.after(async () => {
  await server?.stop();
});

test("site haritası satıştaki ürünleri ve yayındaki yazıları listeler", async () => {
  const live = new mongoose.Types.ObjectId();
  const archived = new mongoose.Types.ObjectId();
  const base = { images: [], imageAssets: [], price: 100, originalPrice: 100, discount: 0, category: new mongoose.Types.ObjectId(), sizes: [], description: "", parentProductId: null, createdAt: new Date(), updatedAt: new Date("2026-09-20") };
  await mongoose.connection.collection("products").insertMany([
    { ...base, _id: live, name: "Satıştaki", archivedAt: null },
    { ...base, _id: archived, name: "Arşivde", archivedAt: new Date() },
  ]);
  await mongoose.connection.collection("blogs").insertMany([
    { title: "Yayında", slug: "yayinda-yazi", status: "published", updatedAt: new Date() },
    { title: "Taslak", slug: "taslak-yazi", status: "draft", updatedAt: new Date() },
  ]);

  const res = await fetch(`${server.base}/sitemap.xml`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /application\/xml/);
  const xml = await res.text();
  assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.match(xml, new RegExp(`<loc>https://www\\.oldscks\\.test/product-details/${live}</loc><lastmod>2026-09-20</lastmod>`));
  assert.doesNotMatch(xml, new RegExp(String(archived)));
  assert.match(xml, /<loc>https:\/\/www\.oldscks\.test\/blog\/yayinda-yazi<\/loc>/);
  assert.doesNotMatch(xml, /taslak-yazi/);
  assert.match(xml, /<loc>https:\/\/www\.oldscks\.test\/shop<\/loc>/);
});
