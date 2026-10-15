// E-posta sunucusu hata verirken: denemeler seyrekleşir, stok ayrımı yine zamanında bırakılır.
const test = require("node:test");
const assert = require("node:assert/strict");
const net = require("node:net");
const crypto = require("node:crypto");
const mongoose = require("mongoose");
const { startTestServer } = require("./helpers");

let server;
let smtp;
let smtpMode = "reject"; // reject: bağlantıyı hemen kapatır; silent: hiç yanıt vermez
let Orders;
let Products;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function paidOrder() {
  const _id = new mongoose.Types.ObjectId();
  await Orders.insertOne({
    _id,
    orderNumber: String(1e9 + Math.floor(Math.random() * 9e9)),
    guest: { firstName: "Mail", lastName: "Müşteri", email: `mail-${crypto.randomBytes(3).toString("hex")}@tekrar.test` },
    items: [{ productId: new mongoose.Types.ObjectId(), name: "Çorap", price: 100, qty: 1, size: "M" }],
    totalPrice: 100,
    address: { title: "Ev", mainaddress: "Adres", street: "Sk", city: "Kütahya" },
    conversationId: crypto.randomBytes(16).toString("hex").toUpperCase(),
    status: "paid",
    stockUpdated: true,
    paymentReceivedAt: new Date(Date.now() - 5000),
    orderMailSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return _id;
}

test.before(async () => {
  smtp = net.createServer((socket) => {
    if (smtpMode === "reject") socket.destroy();
    // silent: bağlantı açık kalır, karşılama hiç gelmez
  });
  await new Promise((r) => smtp.listen(0, "127.0.0.1", r));
  server = await startTestServer({
    SMTP_HOST: "127.0.0.1",
    SMTP_PORT: String(smtp.address().port),
    ORDER_MAIL_SWEEP_MS: "200",
    ORDER_MAIL_SWEEP_GRACE_MS: "0",
  });
  Orders = mongoose.connection.collection("orders");
  Products = mongoose.connection.collection("products");
});

test.after(async () => {
  await server?.stop();
  smtp?.close();
});

test("gönderilemeyen sipariş e-postası her taramada değil, giderek seyrekleşen aralıklarla denenir", async () => {
  const id = await paidOrder();
  // İlk deneme bitene kadar bekle (makine yüklüyse gecikebilir), sonra ~7 tarama daha.
  for (let i = 0; i < 40 && !((await Orders.findOne({ _id: id }))?.mailAttempts >= 1); i += 1) await wait(200);
  await wait(1500);
  const order = await Orders.findOne({ _id: id });
  assert.equal(order.orderMailSentAt, null);
  assert.equal(order.mailAttempts, 1);
  const minutes = (order.mailRetryAt - Date.now()) / 60000;
  assert.ok(minutes > 4 && minutes <= 5, String(minutes));
});

test("e-posta sunucusu yanıt vermezken süresi dolan stok ayrımı yine bırakılır", async () => {
  smtpMode = "silent";
  await paidOrder(); // e-posta döngüsü bu siparişte takılır
  await wait(400);
  const productId = new mongoose.Types.ObjectId();
  await Products.insertOne({
    _id: productId, name: "Ayrım ürünü", images: [], imageAssets: [], price: 100, originalPrice: 100, discount: 0,
    category: new mongoose.Types.ObjectId(), sizes: [{ _id: new mongoose.Types.ObjectId(), size: "M", stock: 0 }],
    description: "", parentProductId: null, archivedAt: null, createdAt: new Date(), updatedAt: new Date(),
  });
  const holdId = new mongoose.Types.ObjectId();
  await Orders.insertOne({
    _id: holdId,
    orderNumber: String(1e9 + Math.floor(Math.random() * 9e9)),
    guest: { firstName: "Ayrım", lastName: "Müşteri", email: "ayrim@tekrar.test" },
    items: [{ productId, name: "Ayrım ürünü", price: 100, qty: 1, size: "M" }],
    totalPrice: 100,
    address: { title: "Ev", mainaddress: "Adres", street: "Sk", city: "Kütahya" },
    conversationId: crypto.randomBytes(16).toString("hex").toUpperCase(),
    status: "pending",
    stockUpdated: true,
    stockReservedUntil: new Date(Date.now() - 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  let released = false;
  for (let i = 0; i < 15 && !released; i += 1) {
    await wait(200);
    released = (await Orders.findOne({ _id: holdId })).status === "cancelled";
  }
  assert.equal(released, true);
  assert.equal((await Products.findOne({ _id: productId })).sizes[0].stock, 1);
});
