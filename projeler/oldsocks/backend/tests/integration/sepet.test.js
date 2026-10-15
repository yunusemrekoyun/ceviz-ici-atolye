const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { startTestServer, postJson } = require("./helpers");

let server;

test.before(async () => {
  server = await startTestServer();
});

test.after(async () => {
  await server?.stop();
});

async function seedProduct({ price = 120, sizes = [{ size: "M", stock: 2 }], archivedAt = null } = {}) {
  const _id = new mongoose.Types.ObjectId();
  await mongoose.connection.collection("products").insertOne({
    _id,
    name: `Sepet ürün ${_id}`,
    images: [],
    imageAssets: [],
    price,
    originalPrice: price + 30,
    discount: 0,
    category: new mongoose.Types.ObjectId(),
    color: "",
    sizes: sizes.map((s) => ({ _id: new mongoose.Types.ObjectId(), ...s })),
    description: "",
    parentProductId: null,
    archivedAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return String(_id);
}

test("sepet kontrolü her satır için güncel fiyat ve stok döner, hata fırlatmaz", async () => {
  const ok = await seedProduct({ price: 99.9 });
  const archived = await seedProduct({ archivedAt: new Date() });
  const res = await postJson(server.base, "/api/v1/cart-campaigns/check", {
    cartItems: [
      { id: ok, size: "M", qty: 1 },
      { id: ok, size: "XL", qty: 1 },
      { id: ok, size: " M ", qty: 5 },
      { id: archived, size: "M", qty: 1 },
      { id: "gecersiz", size: "M", qty: 1 },
    ],
  });
  assert.equal(res.status, 200, JSON.stringify(res.data));
  const [first, noSize, tooMany, gone, invalid] = res.data.items;
  assert.deepEqual(
    { status: first.status, price: first.price, available: first.available, originalPrice: first.originalPrice },
    { status: "ok", price: 99.9, available: 2, originalPrice: 129.9 }
  );
  assert.equal(noSize.status, "size_missing");
  assert.equal(tooMany.status, "insufficient");
  assert.equal(tooMany.size, "M");
  assert.equal(gone.status, "missing");
  assert.equal(invalid.status, "missing");
});

test("sepet kontrolü aşırı büyük veya bozuk girdiyi reddeder", async () => {
  const many = Array.from({ length: 101 }, () => ({ id: "6ab8e4861f01b566cce50f01", size: "M", qty: 1 }));
  assert.equal((await postJson(server.base, "/api/v1/cart-campaigns/check", { cartItems: many })).status, 400);
  assert.equal((await postJson(server.base, "/api/v1/cart-campaigns/check", { cartItems: "x" })).status, 400);
});
