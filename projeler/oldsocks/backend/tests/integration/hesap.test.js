const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { startTestServer, postJson, mailsTo } = require("./helpers");

let server;
const run = crypto.randomBytes(4).toString("hex");
const password = `Hesap-${run}!aA1`;

async function registerAndLogin(email) {
  const reg = await postJson(server.base, "/api/v1/auth/register", { firstName: "Hesap", lastName: "Deneme", email, password });
  assert.equal(reg.status, 201, JSON.stringify(reg.data));
  const login = await postJson(server.base, "/api/v1/auth/login", { email, password });
  assert.equal(login.status, 200);
  return login.data.accessToken;
}

async function putMe(token, body) {
  const res = await fetch(`${server.base}/api/v1/users/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

test.before(async () => {
  server = await startTestServer();
});

test.after(async () => {
  await server?.stop();
});

test("e-posta değişikliği mevcut şifreyi ister ve eski adrese bildirim gönderir", async () => {
  const oldEmail = `eski-${run}@test.local`;
  const token = await registerAndLogin(oldEmail);
  assert.equal((await putMe(token, { email: `yeni-${run}@test.local` })).status, 400);
  assert.equal((await putMe(token, { email: `yeni-${run}@test.local`, currentPassword: "yanlis" })).status, 400);
  const ok = await putMe(token, { email: `yeni-${run}@test.local`, currentPassword: password });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.email, `yeni-${run}@test.local`);
  const mails = await mailsTo(oldEmail);
  assert.ok(mails.some((m) => m.Subject === "E-posta adresiniz değiştirildi"));
});

test("yalnız telefon güncellemesi şifre istemez", async () => {
  const token = await registerAndLogin(`telefon-${run}@test.local`);
  const res = await putMe(token, { phone: "+905551112233" });
  assert.equal(res.status, 200);
  assert.equal(res.data.phone, "+905551112233");
});

test("şifre sıfırlama bağlantısı token'ı # kısmında taşır", async () => {
  const email = `sifirla-${run}@test.local`;
  await registerAndLogin(email);
  const res = await postJson(server.base, "/api/v1/auth/forgot-password", { email });
  assert.equal(res.status, 200);
  const [mail] = await mailsTo(email);
  assert.ok(mail, "sıfırlama e-postası gelmedi");
  assert.match(mail.Text, /\/reset-password#token=/);
  assert.doesNotMatch(mail.Text, /reset-password\?token=/);
});

test("aynı hesaba 5 hatalı denemeden sonra doğru şifre de beklemeye takılır; diğer hesaplar etkilenmez", async () => {
  const email = `kilit-${run}@test.local`;
  const other = `diger-${run}@test.local`;
  await registerAndLogin(email);
  await registerAndLogin(other);
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await postJson(server.base, "/api/v1/auth/login", { email, password: "yanlis-sifre" })).status, 401);
  }
  const locked = await postJson(server.base, "/api/v1/auth/login", { email, password });
  assert.equal(locked.status, 429);
  assert.match(locked.data.message, /dakika sonra/);
  assert.equal((await postJson(server.base, "/api/v1/auth/login", { email: other, password })).status, 200);
});

test("olmayan hesapta yanıt süresi var olan hesaba yakındır (hesap varlığı süreden anlaşılmaz)", async () => {
  const email = `zaman-${run}@test.local`;
  await registerAndLogin(email);
  const time = async (addr) => {
    const t = performance.now();
    await postJson(server.base, "/api/v1/auth/login", { email: addr, password: "yanlis" });
    return performance.now() - t;
  };
  const existing = await time(email);
  const missing = await time(`yok-${run}@test.local`);
  assert.ok(missing > existing * 0.5, `olmayan: ${missing.toFixed(1)} ms, var olan: ${existing.toFixed(1)} ms`);
});

test("aynı adrese saatte en fazla 3 sıfırlama e-postası gider; yanıt değişmez", async () => {
  const email = `butce-${run}@test.local`;
  await registerAndLogin(email);
  // Saldırgan her isteği farklı bir IP'den atar; IP sınırı devreye girmez.
  for (let i = 0; i < 5; i += 1) {
    const res = await postJson(server.base, "/api/v1/auth/forgot-password", { email }, { "X-Forwarded-For": `10.9.8.${i + 1}` });
    assert.equal(res.status, 200);
  }
  await new Promise((r) => setTimeout(r, 500));
  assert.equal((await mailsTo(email)).length, 3);
});

test("bot tuzağı dolu kayıt hesap açmaz ama başarılı görünür", async () => {
  const email = `bot-${run}@test.local`;
  const res = await postJson(server.base, "/api/v1/auth/register", {
    firstName: "Bot", lastName: "Deneme", email, password, website: "http://spam.example",
  });
  assert.equal(res.status, 201);
  const login = await postJson(server.base, "/api/v1/auth/login", { email, password });
  assert.equal(login.status, 401);
});
