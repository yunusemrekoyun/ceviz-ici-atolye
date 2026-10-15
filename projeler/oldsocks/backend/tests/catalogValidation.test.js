const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CatalogValidationError,
  parseProductPricing,
  parseProductSizes,
  requiredText,
} = require("../services/catalogValidation");

test("katalog fiyatları satış fiyatından tutarlı indirim üretir", () => {
  assert.deepEqual(parseProductPricing({ originalPrice: "1000", price: "750" }), {
    originalPrice: 1000,
    price: 750,
    discount: 25,
  });
  assert.deepEqual(parseProductPricing({ originalPrice: 500, price: 500 }), {
    originalPrice: 500,
    price: 500,
    discount: 0,
  });
});

test("geçersiz katalog fiyatları reddedilir", () => {
  assert.throws(
    () => parseProductPricing({ originalPrice: 500, price: 600 }),
    CatalogValidationError
  );
  assert.throws(
    () => parseProductPricing({ originalPrice: "", price: 10 }),
    CatalogValidationError
  );
});

test("bedenli ve bedensiz stok satırları normalize edilir", () => {
  assert.deepEqual(
    parseProductSizes([
      { size: " S ", stock: "3" },
      { size: "M", stock: 0 },
    ]),
    [
      { size: "S", stock: 3 },
      { size: "M", stock: 0 },
    ]
  );
  assert.deepEqual(parseProductSizes([{ size: "", stock: "12" }]), [
    { size: "", stock: 12 },
  ]);
});

test("boş, yinelenen ve ondalıklı stok satırları reddedilir", () => {
  assert.throws(() => parseProductSizes([]), CatalogValidationError);
  assert.throws(
    () =>
      parseProductSizes([
        { size: "M", stock: 1 },
        { size: "m", stock: 2 },
      ]),
    CatalogValidationError
  );
  assert.throws(
    () => parseProductSizes([{ size: "M", stock: 1.5 }]),
    CatalogValidationError
  );
});

test("ürün adı kırpılır ve boş değer reddedilir", () => {
  assert.equal(requiredText("  Denim Ceket  ", "Ürün adı"), "Denim Ceket");
  assert.throws(() => requiredText("   ", "Ürün adı"), CatalogValidationError);
});
