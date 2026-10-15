const test = require("node:test");
const assert = require("node:assert/strict");
const { compactProductListItem } = require("../services/catalogResponses");

test("vitrin listesi ürün ve görsel alanlarını korurken ham medya kayıtlarını çıkarır", () => {
  const original = {
    _id: "product-1",
    name: "Ürün",
    price: 250,
    sizes: [{ size: "M", stock: 3 }],
    images: ["https://media.example/product.webp"],
    media: { images: [{ url: "https://media.example/product.webp", sources: [] }] },
    imageAssetIds: ["asset-1"],
    videoAssetId: null,
    imageAssets: [{ _id: "asset-1", original: { fileName: "source.heic" } }],
    videoAsset: null,
  };

  const compact = compactProductListItem(original);
  assert.equal(compact.name, original.name);
  assert.deepEqual(compact.sizes, original.sizes);
  assert.deepEqual(compact.media, original.media);
  assert.deepEqual(compact.imageAssetIds, original.imageAssetIds);
  assert.equal(Object.hasOwn(compact, "imageAssets"), false);
  assert.equal(Object.hasOwn(compact, "videoAsset"), false);
  assert.deepEqual(original.imageAssets, [{ _id: "asset-1", original: { fileName: "source.heic" } }]);
});
