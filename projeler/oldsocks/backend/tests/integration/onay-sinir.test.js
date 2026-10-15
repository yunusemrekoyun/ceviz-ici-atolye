const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const mongoose = require("mongoose");
const { startTestServer, postJson } = require("./helpers");

let server;

test.before(async () => {
  server = await startTestServer();
});

test.after(async () => {
  await server?.stop();
});

test("onay gecikince sonuç sayfasının sık sorgusu sınıra takılmaz; kimlik tahmini sınırlanır", async () => {
  const conversationId = crypto.randomBytes(16).toString("hex").toUpperCase();
  await mongoose.connection.collection("orders").insertOne({
    orderNumber: String(1e9 + Math.floor(Math.random() * 9e9)),
    conversationId,
    status: "pending",
    guest: { firstName: "Onay", lastName: "Müşteri", email: "onay@test.local" },
    items: [{ productId: new mongoose.Types.ObjectId(), name: "Çorap", price: 10, qty: 1, size: "M" }],
    totalPrice: 10,
    address: { title: "Ev", mainaddress: "Adres", street: "Sk", city: "Kütahya" },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  for (let i = 0; i < 30; i += 1) {
    const res = await postJson(server.base, "/api/v1/orders/confirm", { conversationId });
    assert.equal(res.status, 409, `istek ${i + 1}`);
    assert.equal(res.data.state, "pending");
  }

  let limited = false;
  for (let i = 0; i < 25 && !limited; i += 1) {
    const res = await postJson(server.base, "/api/v1/orders/confirm", { conversationId: `YOK${i}` });
    limited = res.status === 429;
  }
  assert.equal(limited, true);
});
