import test from "node:test";
import assert from "node:assert/strict";
import { selectCartRecommendations } from "./cartRecommendations.js";

const product = (id, category, stock = 2, parentProductId = null) => ({
  _id: id,
  name: id,
  category: { _id: category, parent: { _id: "parent" } },
  parentProductId,
  price: 100,
  sizes: [{ size: "", stock }],
});

test("sepet önerileri stokta olan ilgili ürünleri seçer; sepet ve varyant ailesini dışlar", () => {
  const products = [
    product("cart", "socks"),
    product("cart-variant", "socks", 2, "cart"),
    product("unrelated", "other"),
    product("same", "socks"),
    product("sold-out", "socks", 0),
  ];
  const selected = selectCartRecommendations(products, [{ id: "cart" }]);
  assert.deepEqual(selected.map((item) => item._id), ["same", "unrelated"]);
});

test("panelde seçilen ürünler önce gelir; eksik ve tükenenler otomatik ürünlerle tamamlanır", () => {
  const products = [product("cart", "socks"), product("same", "socks"), product("chosen", "other"), product("sold-out", "other", 0)];
  const selected = selectCartRecommendations(products, [{ id: "cart" }], ["missing", "sold-out", "chosen"]);
  assert.deepEqual(selected.map((item) => item._id), ["chosen", "same"]);
});
