const assert = require("node:assert/strict");
const { test } = require("node:test");
const { timedCache } = require("../services/timedCache");

test("eşzamanlı istekler aynı katalog sorgusunu paylaşır", async () => {
  const cache = timedCache(60_000);
  let queries = 0;
  let finish;
  const load = () => {
    queries += 1;
    return new Promise((resolve) => { finish = resolve; });
  };
  const first = cache.get(load);
  const second = cache.get(load);
  await Promise.resolve();
  assert.equal(queries, 1);
  finish(["product"]);
  assert.deepEqual(await Promise.all([first, second]), [["product"], ["product"]]);
  assert.deepEqual(await cache.get(load), ["product"]);
  assert.equal(queries, 1);
});

test("değişiklik sırasında başlayan eski sorgu yeni önbelleği doldurmaz", async () => {
  const cache = timedCache(60_000);
  let finishOld;
  const old = cache.get(() => new Promise((resolve) => { finishOld = resolve; }));
  await Promise.resolve();
  cache.invalidate();
  assert.equal(await cache.get(async () => "new"), "new");
  finishOld("old");
  assert.equal(await old, "old");
  assert.equal(await cache.get(async () => "wrong"), "new");
});

test("boş sonuç tekrar tekrar veritabanına gitmez", async () => {
  const cache = timedCache(60_000);
  let queries = 0;
  const load = async () => { queries += 1; return null; };
  assert.equal(await cache.get(load), null);
  assert.equal(await cache.get(load), null);
  assert.equal(queries, 1);
});

test("yük durumuna göre süre değişebilir", async () => {
  let ttl = 0;
  const cache = timedCache(() => ttl);
  let queries = 0;
  const load = async () => ++queries;
  assert.equal(await cache.get(load), 1);
  ttl = 60_000;
  assert.equal(await cache.get(load), 2);
  assert.equal(await cache.get(load), 2);
});
