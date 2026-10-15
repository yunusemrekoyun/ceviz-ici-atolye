const test = require("node:test");
const assert = require("node:assert/strict");
const { createTrafficMonitor } = require("../services/trafficMonitor");

test("trafik modu yalnızca geçici vitrin önbelleğini uzatır ve normale döner", () => {
  let time = 1_000_000;
  const monitor = createTrafficMonitor(() => time);
  assert.equal(monitor.publicTtlMs(15_000), 15_000);

  const pending = Array.from({ length: 150 }, () => monitor.begin());
  assert.equal(monitor.mode(), "surge");
  assert.equal(monitor.publicTtlMs(15_000), 45_000);
  time += 100;
  for (const finish of pending) finish(200);
  assert.equal(monitor.snapshot().last10Seconds.requests, 150);

  time += 11_000;
  assert.equal(monitor.mode(), "normal");
  assert.equal(monitor.publicTtlMs(15_000), 15_000);
});

test("hata ve hız sınırı sayaçları erişilebilir, tekrar bitirme sayılmaz", () => {
  let time = 1_000_000;
  const monitor = createTrafficMonitor(() => time);
  const failed = monitor.begin();
  time += 25;
  failed(503);
  failed(503);
  monitor.begin()(429);
  assert.deepEqual(monitor.snapshot().last60Seconds, { requests: 2, errors: 1, limited: 1 });
  assert.equal(monitor.snapshot().inFlight, 0);
});

test("veritabanı veya ağ yavaşlarken vitrin önbelleği geçici uzar", () => {
  let time = 1_000_000;
  const monitor = createTrafficMonitor(() => time);
  const pending = Array.from({ length: 10 }, () => monitor.begin());
  time += 450;
  pending.forEach((finish) => finish(200));
  assert.equal(monitor.mode(), "busy");
  assert.equal(monitor.publicTtlMs(15_000), 30_000);
  time += 11_000;
  assert.equal(monitor.mode(), "normal");
});
