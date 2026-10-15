const test = require("node:test");
const assert = require("node:assert/strict");
const { getClientIp } = require("../utils/clientIp");

test("PayTR IP'si istemcinin yazdığı X-Forwarded-For değerinden değil req.ip'ten alınır", () => {
  const req = { ip: "88.230.1.2", headers: { "x-forwarded-for": "1.2.3.4, 88.230.1.2" } };
  assert.equal(getClientIp(req), "88.230.1.2");
});

test("IPv4-mapped, yerel ve geçersiz adresler normalleşir", () => {
  assert.equal(getClientIp({ ip: "::ffff:10.0.0.5" }), "10.0.0.5");
  assert.equal(getClientIp({ ip: "::1" }), "127.0.0.1");
  assert.equal(getClientIp({ ip: "fe80::1%eth0" }), "fe80::1");
  assert.equal(getClientIp({ ip: "bozuk" }), "127.0.0.1");
});
