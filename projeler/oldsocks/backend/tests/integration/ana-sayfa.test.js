const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { startTestServer } = require("./helpers");

let server;
const id = () => new mongoose.Types.ObjectId();

test.before(async () => {
  server = await startTestServer();
});

test.after(async () => {
  await server?.stop();
});

test("ana sayfa yalnız bölümlerin ürün havuzlarını ve renk varyantlarını alır", async () => {
  const db = mongoose.connection;
  const root = id();
  const child = id();
  const other = id();
  await db.collection("categories").insertMany([
    { _id: root, name: "Kök", parent: null, archivedAt: null },
    { _id: child, name: "Alt", parent: root, archivedAt: null },
    { _id: other, name: "Diğer", parent: null, archivedAt: null },
  ]);
  const base = { images: [], imageAssets: [], price: 100, originalPrice: 100, discount: 0, description: "", archivedAt: null, updatedAt: new Date() };
  const day = (n) => new Date(Date.UTC(2026, 0, n));
  const products = Array.from({ length: 30 }, (_, i) => ({
    ...base,
    _id: id(),
    name: `Ürün ${i}`,
    category: i % 3 === 0 ? child : i % 3 === 1 ? root : other,
    color: "",
    parentProductId: null,
    sizes: [{ _id: id(), size: "M", stock: 5 }],
    createdAt: day(i + 1),
  }));
  // Ürün 29'un (en yeni) iki renk varyantı var.
  products[29].color = "Siyah";
  const variantA = { ...base, _id: id(), name: "Ürün 29 Beyaz", category: other, color: "Beyaz", parentProductId: products[29]._id, sizes: [], createdAt: day(1) };
  await db.collection("products").insertMany([...products, variantA]);
  await db.collection("storefrontsettings").insertOne({
    key: "main",
    fontPreset: "classic",
    sectionOrder: ["new", "featured", "popular"],
    sections: {
      new: { heading: "Yeni", source: "latest", categoryId: null, productIds: [], shuffle: false, visible: true },
      featured: { heading: "Kök", source: "category", categoryId: root, productIds: [], shuffle: false, visible: true },
      popular: { heading: "Seçme", source: "manual", categoryId: null, productIds: [products[2]._id, products[5]._id], shuffle: false, visible: false },
    },
  });

  const res = await fetch(`${server.base}/api/v1/storefront/home-products`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.deepEqual(Object.keys(data.sections).sort(), ["featured", "new"]);
  assert.equal(data.sections.new[0].name, "Ürün 29");
  assert.ok(data.sections.new.length <= 10);
  // Kategori: kök ve alt kategorideki ürünler, en yeni önce, en çok 12.
  assert.equal(data.sections.featured.length, 12);
  const rootIds = new Set(products.filter((p) => [String(root), String(child)].includes(String(p.category))).map((p) => String(p._id)));
  assert.ok(data.sections.featured.every((p) => rootIds.has(String(p._id))));
  assert.equal(data.sections.new[0].category, undefined);
  // Toplam indirilen ürün, katalogdaki 31 ürünün yalnız bir kısmı.
  const ids = new Set(Object.values(data.sections).flat().map((p) => String(p._id)));
  assert.ok(ids.size < 31);
  const colors = data.variants.map((v) => v.color).sort();
  assert.deepEqual(colors, ["Beyaz", "Siyah"]);
});
