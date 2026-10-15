import test from "node:test";
import assert from "node:assert/strict";
import { pickHomeProducts } from "./homeProductSelection.js";

const pool = ["a", "b", "c", "d", "e"].map((_id) => ({ _id }));

test("karıştırma kapalıysa sunucunun sırası korunur; havuzun tamamı, en çok 12 ürün gösterilir", () => {
  assert.deepEqual(pickHomeProducts(pool, { source: "best_selling", shuffle: false }).map((p) => p._id), ["a", "b", "c", "d", "e"]);
  const big = Array.from({ length: 20 }, (_, i) => ({ _id: String(i) }));
  assert.equal(pickHomeProducts(big, { source: "latest" }).length, 12);
});

test("rastgele modda yalnız havuzdaki ürünler gösterilir", () => {
  const picked = pickHomeProducts(pool.slice(0, 2), { source: "random" }, () => 0);
  assert.deepEqual(new Set(picked.map((p) => p._id)), new Set(["a", "b"]));
  assert.deepEqual(pickHomeProducts(undefined, { source: "latest" }), []);
});
