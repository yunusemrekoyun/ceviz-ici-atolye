const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const fs = require("node:fs");
const path = require("node:path");
const { startTestServer, postJson } = require("./helpers");

let server;
const run = crypto.randomBytes(3).toString("hex");

async function createUser(role, email) {
  const password = `Test-${crypto.randomBytes(6).toString("hex")}!aA1`;
  const _id = new mongoose.Types.ObjectId();
  await mongoose.connection.collection("users").insertOne({
    _id,
    firstName: "Silinecek",
    lastName: role,
    email,
    phone: "+905551112233",
    password: await bcrypt.hash(password, 4),
    role,
    tokenVersion: 0,
    addresses: [{ _id: new mongoose.Types.ObjectId(), title: "Ev", mainaddress: "Gizli adres", street: "Sk", city: "Kütahya" }],
    refreshTokens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const login = await postJson(server.base, "/api/v1/auth/login", { email, password });
  assert.equal(login.status, 200);
  return { _id, password, token: login.data.accessToken };
}

function deleteMe(token, body) {
  return fetch(`${server.base}/api/v1/users/me`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

test.before(async () => {
  server = await startTestServer();
});

test.after(async () => {
  await server?.stop();
});

test("müşteri hesabını silebilir; sipariş kaydı alıcı bilgisiyle kalır, diğer kişisel veriler silinir", async () => {
  const email = `silinecek-${run}@test.local`;
  const user = await createUser("user", email);
  const db = mongoose.connection;
  const orderId = new mongoose.Types.ObjectId();
  await db.collection("orders").insertOne({
    _id: orderId,
    orderNumber: String(1e9 + Math.floor(Math.random() * 9e9)),
    user: user._id,
    guest: null,
    items: [{ productId: new mongoose.Types.ObjectId(), name: "Çorap", price: 100, qty: 1 }],
    totalPrice: 100,
    address: { title: "Ev", mainaddress: "Adres", street: "Sk", city: "Kütahya" },
    conversationId: crypto.randomBytes(12).toString("hex"),
    status: "paid",
    createdAt: new Date(),
  });
  const commentId = new mongoose.Types.ObjectId();
  await db.collection("blogcomments").insertOne({ _id: commentId, author: user._id, blog: new mongoose.Types.ObjectId(), content: "Yorum" });
  await db.collection("blogcommentreplies").insertOne({ comment: commentId, author: new mongoose.Types.ObjectId(), content: "Yanıt" });
  await db.collection("newslettersubscribers").insertOne({ email });

  assert.equal((await deleteMe(user.token, { password: user.password })).status, 400); // onay yok
  assert.equal((await deleteMe(user.token, { password: "yanlis", confirm: true })).status, 403);

  const ok = await deleteMe(user.token, { password: user.password, confirm: true });
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get("set-cookie") || "", /refreshToken=;/);

  assert.equal(await db.collection("users").countDocuments({ _id: user._id }), 0);
  const order = await db.collection("orders").findOne({ _id: orderId });
  assert.equal(order.guest.email, email);
  assert.equal(order.guest.firstName, "Silinecek");
  assert.equal(await db.collection("blogcomments").countDocuments({ author: user._id }), 0);
  assert.equal(await db.collection("blogcommentreplies").countDocuments({ comment: commentId }), 0);
  assert.equal(await db.collection("newslettersubscribers").countDocuments({ email }), 0);

  const login = await postJson(server.base, "/api/v1/auth/login", { email, password: user.password });
  assert.notEqual(login.status, 200);
});

test("yönetici hesabı kendini bu uçtan silemez", async () => {
  const admin = await createUser("admin", `yonetici-${run}@test.local`);
  const res = await deleteMe(admin.token, { password: admin.password, confirm: true });
  assert.equal(res.status, 400);
  assert.equal(await mongoose.connection.collection("users").countDocuments({ _id: admin._id }), 1);
});

test("silinen profil fotoğrafının dosyası herkese açık klasörden kaldırılır", async () => {
  const user = await createUser("user", `foto-${run}@test.local`);
  const db = mongoose.connection;
  const assetId = new mongoose.Types.ObjectId();
  const mediaRoot = server.env.MEDIA_ROOT;
  const dir = path.join(mediaRoot, "assets", "profile_image", String(assetId));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "w320.webp"), "gorsel");
  await db.collection("mediaassets").insertOne({
    _id: assetId,
    purpose: "profile_image",
    kind: "image",
    status: "ready",
    referenceCount: 1,
    createdBy: user._id,
    original: { fileName: "profil.jpg", bytes: 6, mime: "image/jpeg" },
    variants: [],
    createdAt: new Date(),
  });
  await db.collection("mediareferences").insertOne({ asset: assetId, ownerType: "User", ownerId: user._id, field: "avatar", position: 0 });
  await db.collection("userprofilepictures").insertOne({ user: user._id, url: "x", mediaAsset: assetId });

  const res = await fetch(`${server.base}/api/v1/profile-pictures`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${user.token}` },
  });
  assert.equal(res.status, 200);
  assert.equal(fs.existsSync(dir), false, "dosya hâlâ herkese açık klasörde:\n" + server.output().split("\n").filter((l) => /avatar|trash|Error/i.test(l)).join("\n"));
  const asset = await db.collection("mediaassets").findOne({ _id: assetId });
  assert.equal(asset.status, "trashed");
});
