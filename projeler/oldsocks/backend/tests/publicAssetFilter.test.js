const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { stripPrivateAssetFields } = require("../middleware/publicAssetFilter");

const rawAsset = () => ({
  _id: "a1",
  kind: "image",
  purpose: "category_image",
  status: "ready",
  createdBy: "admin-id",
  original: { fileName: "IMG_0001.jpg", stagingKey: "staging/x", checksumSha256: "abc" },
  processing: { errorMessage: null },
  backup: { status: "not_configured" },
  manifestKey: "assets/x/manifest.json",
  trashKey: "",
  metadata: { width: 1200, height: 1500 },
  variants: [{ name: "w640", key: "category_image/a1/w640.webp", url: "https://media/x/w640.webp", format: "webp", mime: "image/webp", width: 640, height: 800, bytes: 1000 }],
});

test("gömülü medya belgesinden iç alanlar çıkar, varyant URL'leri kalır", () => {
  const out = stripPrivateAssetFields([{ name: "Ürün", category: { name: "Kat", imageAsset: rawAsset() } }]);
  const asset = out[0].category.imageAsset;
  assert.deepEqual(Object.keys(asset).sort(), ["_id", "kind", "metadata", "purpose", "status", "variants"]);
  assert.deepEqual(asset.variants[0], { name: "w640", url: "https://media/x/w640.webp", format: "webp", mime: "image/webp", width: 640, height: 800 });
  assert.equal(out[0].category.name, "Kat");
});

test("medya belgesine benzemeyen nesneler ve publicAsset biçimi değişmez", () => {
  const media = { id: "a1", kind: "image", purpose: "product_image", url: "u", sources: [{ url: "u" }] };
  const input = { price: 100, media: { images: [media] }, createdBy: "kalır" };
  assert.deepEqual(stripPrivateAssetFields(input), input);
});

test("ObjectId ve tarih JSON biçimine res.json gibi çevrilir", () => {
  const id = new mongoose.Types.ObjectId();
  const at = new Date("2026-09-27T10:00:00Z");
  const out = stripPrivateAssetFields({ _id: id, at });
  assert.equal(JSON.stringify(out), JSON.stringify({ _id: id, at }));
});
