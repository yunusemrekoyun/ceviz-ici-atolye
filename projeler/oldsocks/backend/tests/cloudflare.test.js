const test = require("node:test");
const assert = require("node:assert/strict");
const { cloudflareClientIp, edgeCacheOnlyForSite, isCloudflareAddress } = require("../middleware/cloudflare");

function fakeReq({ ip, method = "GET", headers = {} }) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { ip, method, get: (name) => lower[name.toLowerCase()] };
}

function fakeRes() {
  const headers = {};
  return { headers, setHeader: (name, value) => { headers[name.toLowerCase()] = value; } };
}

test("Cloudflare adresleri tanınır, diğerleri tanınmaz", () => {
  assert.equal(isCloudflareAddress("172.70.1.2"), true);
  assert.equal(isCloudflareAddress("::ffff:162.158.10.1"), true);
  assert.equal(isCloudflareAddress("2a06:98c1::5"), true);
  assert.equal(isCloudflareAddress("88.230.1.2"), false);
  assert.equal(isCloudflareAddress("127.0.0.1"), false);
  assert.equal(isCloudflareAddress("bozuk"), false);
});

test("Cloudflare'den gelen isteğin IP'si ziyaretçinin adresi olur", () => {
  const req = fakeReq({ ip: "172.70.1.2", headers: { "CF-Connecting-IP": "88.230.1.2" } });
  cloudflareClientIp(req, {}, () => {});
  assert.equal(req.ip, "88.230.1.2");

  const v6 = fakeReq({ ip: "2400:cb00::1", headers: { "CF-Connecting-IP": "2a02:ff0::7" } });
  cloudflareClientIp(v6, {}, () => {});
  assert.equal(v6.ip, "2a02:ff0::7");
});

test("Doğrudan sunucuya gelen biri CF-Connecting-IP yazarak adresini değiştiremez", () => {
  const req = fakeReq({ ip: "5.6.7.8", headers: { "CF-Connecting-IP": "1.1.1.1" } });
  cloudflareClientIp(req, {}, () => {});
  assert.equal(req.ip, "5.6.7.8");

  const junk = fakeReq({ ip: "172.70.1.2", headers: { "CF-Connecting-IP": "bozuk" } });
  cloudflareClientIp(junk, {}, () => {});
  assert.equal(junk.ip, "172.70.1.2");
});

test("Paylaşılan önbellek yalnız sitenin kendi isteklerine açık", () => {
  const guard = edgeCacheOnlyForSite("https://www.oldscks.com");

  const fromSite = fakeRes();
  guard(fakeReq({ ip: "1.1.1.1", headers: { Origin: "https://www.oldscks.com" } }), fromSite, () => {});
  fromSite.setHeader("Cache-Control", "public, max-age=5, s-maxage=5");
  assert.equal(fromSite.headers["cache-control"], "public, max-age=5, s-maxage=5");

  const noOrigin = fakeRes();
  guard(fakeReq({ ip: "1.1.1.1" }), noOrigin, () => {});
  noOrigin.setHeader("Cache-Control", "public, max-age=5, s-maxage=5");
  assert.equal(noOrigin.headers["cache-control"], "private, max-age=5");

  const other = fakeRes();
  guard(fakeReq({ ip: "1.1.1.1", headers: { Origin: "https://baska.example" } }), other, () => {});
  other.setHeader("Cache-Control", "public, max-age=60");
  assert.equal(other.headers["cache-control"], "private, max-age=60");

  const leading = fakeRes();
  guard(fakeReq({ ip: "1.1.1.1" }), leading, () => {});
  leading.setHeader("Cache-Control", "s-maxage=30, public");
  assert.equal(leading.headers["cache-control"], "private");

  const untouched = fakeRes();
  guard(fakeReq({ ip: "1.1.1.1" }), untouched, () => {});
  untouched.setHeader("Cache-Control", "no-store");
  assert.equal(untouched.headers["cache-control"], "no-store");
});

test("Express arkasında Nginx + Cloudflare zinciriyle hız sınırı ziyaretçi başına sayılır", async () => {
  const express = require("express");
  const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
  const app = express();
  app.set("trust proxy", 1);
  app.use(cloudflareClientIp);
  app.use(rateLimit({ windowMs: 60000, max: 1, keyGenerator: (req) => ipKeyGenerator(req.ip), standardHeaders: true, legacyHeaders: false }));
  app.get("/ip", (req, res) => res.json({ ip: req.ip }));
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/ip`;
  // Nginx'in eklediği son adres Cloudflare sunucusu; ziyaretçi CF-Connecting-IP'de.
  const viaCf = (visitor) =>
    fetch(base, { headers: { "X-Forwarded-For": `${visitor}, 172.70.1.2`, "CF-Connecting-IP": visitor } });
  try {
    const first = await viaCf("88.230.1.2");
    assert.equal(first.status, 200);
    assert.deepEqual(await first.json(), { ip: "88.230.1.2" });
    assert.equal((await viaCf("95.10.1.1")).status, 200, "farklı ziyaretçi aynı Cloudflare adresinden gelse de ayrı sayılır");
    assert.equal((await viaCf("88.230.1.2")).status, 429);
  } finally {
    server.close();
  }
});
