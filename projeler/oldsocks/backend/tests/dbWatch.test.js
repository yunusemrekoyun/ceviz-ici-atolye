const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { startDbWatch } = require("../services/dbWatch");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test("bağlantı süre içinde dönmezse tek adrese uyarı, dönünce düzelme e-postası gider", async () => {
  const connection = Object.assign(new EventEmitter(), { readyState: 0 });
  const sent = [];
  const stop = startDbWatch({ connection, send: async (mail) => sent.push(mail), to: "sahip@test.local", afterMs: 30 });
  connection.emit("disconnected");
  connection.emit("disconnected");
  await wait(60);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "sahip@test.local");
  assert.match(sent[0].subject, /ulaşılamıyor/);
  connection.readyState = 1;
  connection.emit("connected");
  assert.equal(sent.length, 2);
  assert.match(sent[1].subject, /düzeldi/);
  stop();
});

test("kısa kopmada e-posta gitmez", async () => {
  const connection = Object.assign(new EventEmitter(), { readyState: 0 });
  const sent = [];
  const stop = startDbWatch({ connection, send: async (mail) => sent.push(mail), to: "sahip@test.local", afterMs: 50 });
  connection.emit("disconnected");
  await wait(10);
  connection.readyState = 1;
  connection.emit("connected");
  await wait(70);
  assert.equal(sent.length, 0);
  stop();
});
