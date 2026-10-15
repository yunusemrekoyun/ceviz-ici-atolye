import test from "node:test";
import assert from "node:assert/strict";
import { isChunkLoadError } from "./chunkErrors.js";

test("tarayıcıların sayfa parçası yükleme hataları tanınır", () => {
  assert.equal(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: https://oldscks.com/assets/ShopPage-abc.js")), true);
  assert.equal(isChunkLoadError(new TypeError("Importing a module script failed.")), true);
  assert.equal(isChunkLoadError(new TypeError("error loading dynamically imported module")), true);
  assert.equal(isChunkLoadError({ name: "ChunkLoadError", message: "Loading chunk 12 failed." }), true);
});

test("sıradan hatalar sürüm güncellemesi sanılmaz", () => {
  assert.equal(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'map')")), false);
  assert.equal(isChunkLoadError(null), false);
});
