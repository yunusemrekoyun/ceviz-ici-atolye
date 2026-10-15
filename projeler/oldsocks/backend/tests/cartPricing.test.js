const test = require("node:test");
const assert = require("node:assert/strict");

const {
  HttpError,
  buildAggregatedItems,
} = require("../services/cartPricingService");

const PRODUCT_ID = "64b000000000000000000001";

test("sepet satırları aynı ürün ve beden için güvenle birleştirilir", () => {
  const result = buildAggregatedItems([
    { id: PRODUCT_ID, size: " M ", qty: 1, color: "istemci-rengi" },
    { productId: PRODUCT_ID, size: "M", qty: 2 },
  ]);

  assert.equal(result.size, 1);
  assert.deepEqual(result.get(`${PRODUCT_ID}:::M`), {
    id: PRODUCT_ID,
    size: "M",
    qty: 3,
  });
});

test("geçersiz ürün kimliği ve kesirli veya aşırı adet reddedilir", () => {
  for (const item of [
    { id: "gecersiz", qty: 1 },
    { id: PRODUCT_ID, qty: 1.5 },
    { id: PRODUCT_ID, qty: 1001 },
  ]) {
    assert.throws(
      () => buildAggregatedItems([item]),
      (error) => error instanceof HttpError && error.status === 400
    );
  }
});

test("istemci tek istekte sınırsız sepet satırı gönderemez", () => {
  const tooMany = Array.from({ length: 101 }, () => ({
    id: PRODUCT_ID,
    qty: 1,
  }));

  assert.throws(
    () => buildAggregatedItems(tooMany),
    (error) => error instanceof HttpError && error.status === 400
  );
});
