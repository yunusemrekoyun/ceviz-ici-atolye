import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSearchText, searchProducts } from "./productSearch.js";

const products = [
  { _id: "ceket", name: "Siyah Kontrast Yakalı Ceket", color: "Siyah", category: { name: "Ceket", parent: { name: "Dış Giyim" } } },
  { _id: "gomlek", name: "Dodgers 42 Oversize Gömlek", color: "Gri", category: { name: "Gömlek" } },
  { _id: "jean", name: "Bej Wide Leg Jean", color: "Bej", category: { name: "Jean" } },
  { _id: "esofman", name: "Vintage Çizgili Eşofman", color: "Siyah", category: { name: "Eşofman" } },
];
const ids = (list) => list.map((p) => p._id);

test("Türkçe büyük harf ve noktalı İ aranabilir", () => {
  assert.equal(normalizeSearchText("SİYAH YAKALI"), "siyah yakali");
  assert.deepEqual(ids(searchProducts(products, "YAKALI")), ["ceket"]);
  assert.deepEqual(ids(searchProducts(products, "SİYAH")).sort(), ["ceket", "esofman"]);
});

test("Türkçe karakter yazılmadan da bulunur", () => {
  assert.deepEqual(ids(searchProducts(products, "gomlek")), ["gomlek"]);
  assert.deepEqual(ids(searchProducts(products, "cizgili esofman")), ["esofman"]);
});

test("çok kelimeli arama her kelimeyi ister; renk ve kategoriyle de arar", () => {
  assert.deepEqual(ids(searchProducts(products, "siyah ceket")), ["ceket"]);
  assert.deepEqual(ids(searchProducts(products, "gri")), ["gomlek"]);
  assert.deepEqual(ids(searchProducts(products, "dış giyim")), ["ceket"]);
  assert.deepEqual(ids(searchProducts(products, "siyah jean")), []);
});

test("adında geçen ürün önce gelir; boş arama sonuç döndürmez", () => {
  const list = [
    { _id: "renk", name: "Oversize Tişört", color: "Siyah" },
    { _id: "ad", name: "Siyah Tişört", color: "Beyaz" },
  ];
  assert.deepEqual(ids(searchProducts(list, "siyah")), ["ad", "renk"]);
  assert.deepEqual(searchProducts(list, "   "), []);
});
