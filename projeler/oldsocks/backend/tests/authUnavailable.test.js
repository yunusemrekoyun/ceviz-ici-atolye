const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-erisim-sirri";
process.env.JWT_REFRESH_SECRET = "test-yenileme-sirri";

const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");
const { refresh } = require("../controllers/authController");

function fakeRes() {
  const res = { statusCode: 200, body: null, cleared: [] };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.clearCookie = (name) => { res.cleared.push(name); return res; };
  res.cookie = () => res;
  return res;
}

function withFindById(impl, fn) {
  const original = User.findById;
  User.findById = impl;
  return Promise.resolve(fn()).finally(() => { User.findById = original; });
}

const dbDown = () => ({ select: () => Promise.reject(new Error("connection closed")) });

test("veritabanı hatasında token doğrulaması 503 döner, oturum geçersiz sayılmaz", async () => {
  const token = jwt.sign({ userId: "6ab8e4861f01b566cce50f6b", tokenVersion: 0 }, process.env.JWT_SECRET);
  const res = fakeRes();
  let nextCalled = false;
  await withFindById(dbDown, () => verifyToken({ headers: { authorization: `Bearer ${token}` } }, res, () => { nextCalled = true; }));
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 503);
});

test("geçersiz token hâlâ 403 döner", async () => {
  const res = fakeRes();
  await verifyToken({ headers: { authorization: "Bearer bozuk.token.degeri" } }, res, () => {});
  assert.equal(res.statusCode, 403);
});

test("veritabanı hatasında yenileme 503 döner ve yenileme çerezini silmez", async () => {
  const refreshToken = jwt.sign({ userId: "6ab8e4861f01b566cce50f6b", tokenVersion: 0 }, process.env.JWT_REFRESH_SECRET);
  const res = fakeRes();
  await withFindById(dbDown, () => refresh({ cookies: { refreshToken } }, res));
  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.cleared, []);
});

test("geçersiz yenileme token'ı 403 döner ve çerezi siler", async () => {
  const res = fakeRes();
  await refresh({ cookies: { refreshToken: "bozuk" } }, res);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.cleared, ["refreshToken"]);
});
