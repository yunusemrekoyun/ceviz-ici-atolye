const test = require("node:test");
const assert = require("node:assert/strict");
const { recordFailure, recordSuccess, remainingLockMs } = require("../utils/loginThrottle");

test("5, 10 ve 15 hatalı denemede artan bekleme uygulanır; başarılı giriş sıfırlar", () => {
  const t0 = 1_000_000;
  for (let i = 0; i < 4; i += 1) recordFailure("a@test", t0 + i);
  assert.equal(remainingLockMs("a@test", t0 + 5), 0);
  recordFailure("a@test", t0 + 5);
  assert.ok(remainingLockMs("a@test", t0 + 6) > 55_000);
  for (let i = 0; i < 5; i += 1) recordFailure("a@test", t0 + 10 + i);
  assert.ok(remainingLockMs("a@test", t0 + 20) > 4 * 60_000);
  for (let i = 0; i < 5; i += 1) recordFailure("a@test", t0 + 30 + i);
  assert.ok(remainingLockMs("a@test", t0 + 40) > 14 * 60_000);
  recordSuccess("a@test");
  assert.equal(remainingLockMs("a@test", t0 + 50), 0);
});

test("kilit bir hesaba özeldir ve 15 dakikalık pencere sonunda sayaç sıfırlanır", () => {
  const t0 = 5_000_000;
  for (let i = 0; i < 4; i += 1) recordFailure("b@test", t0);
  assert.equal(remainingLockMs("c@test", t0), 0);
  recordFailure("b@test", t0 + 16 * 60_000);
  assert.equal(remainingLockMs("b@test", t0 + 16 * 60_000 + 1), 0);
});
