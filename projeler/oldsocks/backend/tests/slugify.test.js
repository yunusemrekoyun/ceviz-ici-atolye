const test = require("node:test");
const assert = require("node:assert/strict");

const { slugify } = require("../utils/slugify");

test("Türkçe blog başlıkları okunabilir URL kimliğine çevrilir", () => {
  assert.equal(
    slugify("Vintage Parçaları Günlük Stile Uyarlamanın 5 Yolu"),
    "vintage-parcalari-gunluk-stile-uyarlamanin-5-yolu"
  );
  assert.equal(slugify("  Şık & Özgün Ürünler  "), "sik-ozgun-urunler");
});
