const test = require("node:test");
const assert = require("node:assert/strict");
const { requireHuman, sendTurnstileConfig } = require("../services/turnstile");

function withKeys(fn) {
  return async () => {
    process.env.TURNSTILE_SITE_KEY = "site-key";
    process.env.TURNSTILE_SECRET_KEY = "secret-key";
    try {
      await fn();
    } finally {
      delete process.env.TURNSTILE_SITE_KEY;
      delete process.env.TURNSTILE_SECRET_KEY;
    }
  };
}

async function run(middleware, body) {
  const req = { body, ip: "88.230.1.2" };
  const res = {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.payload = data; return this; },
  };
  let passed = false;
  await middleware(req, res, () => { passed = true; });
  return { passed, res };
}

const answer = (data, ok = true) => async () => ({ ok, status: ok ? 200 : 500, json: async () => data });

test("Anahtarlar tanımlı değilse doğrulama istenmez", async () => {
  const { passed } = await run(requireHuman({ fetchImpl: () => assert.fail("çağrılmamalı") }), {});
  assert.equal(passed, true);
});

test("Açıkken jetonsuz istek reddedilir", withKeys(async () => {
  const { passed, res } = await run(requireHuman({ fetchImpl: () => assert.fail("çağrılmamalı") }), {});
  assert.equal(passed, false);
  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.code, "BOT_CHECK");
}));

test("Cloudflare onaylarsa geçer, reddederse durur", withKeys(async () => {
  let sent;
  const ok = await run(
    requireHuman({ fetchImpl: async (url, init) => { sent = JSON.parse(init.body); return answer({ success: true })(); } }),
    { turnstileToken: "tok" }
  );
  assert.equal(ok.passed, true);
  assert.deepEqual(sent, { secret: "secret-key", response: "tok", remoteip: "88.230.1.2" });

  const bad = await run(requireHuman({ fetchImpl: answer({ success: false, "error-codes": ["invalid-input-response"] }) }), {
    turnstileToken: "tok",
  });
  assert.equal(bad.passed, false);
  assert.equal(bad.res.statusCode, 400);
}));

test("Cloudflare'e ulaşılamazsa müşteri engellenmez", withKeys(async () => {
  const down = await run(requireHuman({ fetchImpl: async () => { throw new Error("ağ yok"); } }), { turnstileToken: "tok" });
  assert.equal(down.passed, true);
  const error = await run(requireHuman({ fetchImpl: answer({}, false) }), { turnstileToken: "tok" });
  assert.equal(error.passed, true);
}));

test("Yapılandırma ucu yalnız iki anahtar birlikteyken site anahtarını verir", async () => {
  const capture = () => ({ headers: {}, body: null, set(k, v) { this.headers[k] = v; }, json(d) { this.body = d; } });
  const off = capture();
  process.env.TURNSTILE_SITE_KEY = "site-key";
  sendTurnstileConfig({}, off);
  delete process.env.TURNSTILE_SITE_KEY;
  assert.deepEqual(off.body, { siteKey: null });

  await withKeys(async () => {
    const on = capture();
    sendTurnstileConfig({}, on);
    assert.deepEqual(on.body, { siteKey: "site-key" });
  })();
});
