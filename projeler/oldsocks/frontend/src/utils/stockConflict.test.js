import test from "node:test";
import assert from "node:assert/strict";
import { applyStockConflict } from "./stockConflict.js";

test("dokunulmamış satır güncel stoğu gösterir, değiştirilen satırda girilen değer kalır", () => {
  const rows = [
    { id: "r1", _id: "m", size: "M", stock: 5, loadedStock: 5 },
    { id: "r2", _id: "l", size: "L", stock: 8, loadedStock: 5 },
    { id: "r3", size: "XL", stock: 2 },
  ];
  const next = applyStockConflict(rows, [
    { _id: "m", size: "M", stock: 4 },
    { _id: "l", size: "L", stock: 4 },
  ]);
  assert.deepEqual(next, [
    { id: "r1", _id: "m", size: "M", stock: 4, loadedStock: 4 },
    { id: "r2", _id: "l", size: "L", stock: 8, loadedStock: 4 },
    { id: "r3", size: "XL", stock: 2 },
  ]);
});

test("bozuk yanıt satırları değiştirmez", () => {
  const rows = [{ id: "r1", _id: "m", size: "M", stock: 5, loadedStock: 5 }];
  assert.deepEqual(applyStockConflict(rows, null), rows);
});
