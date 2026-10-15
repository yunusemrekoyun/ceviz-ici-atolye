const test = require("node:test");
const assert = require("node:assert/strict");
const nodemailer = require("nodemailer");

const sent = [];
nodemailer.createTransport = () => ({ sendMail: async (payload) => { sent.push(payload); return {}; } });
process.env.MAIL_FROM = "magaza@oldscks.local";
process.env.MAIL_PASS = "test";
process.env.ADMIN_EMAILS = "yonetici@oldscks.local";

const BackupSettings = require("../models/BackupSettings");
let settings;
const updates = [];
BackupSettings.findOne = () => ({ select: async () => settings });
BackupSettings.updateOne = async (_filter, update) => { updates.push(update); return {}; };
const { alertIfBackupStale } = require("../services/backups/jobs");

const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000);

test("takvim açıkken 26 saatten eski yedek için yöneticiye bir kez uyarı gider", async () => {
  sent.length = 0;
  settings = { enabled: true, lastSuccessAt: hoursAgo(30), lastAlertAt: null };
  await alertIfBackupStale();
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].to, ["yonetici@oldscks.local"]);
  assert.match(sent[0].subject, /Yedek güncel değil/);
  assert.equal(updates.length, 1);
});

test("son uyarıdan 24 saat geçmeden tekrar gönderilmez; takvim kapalıysa hiç gönderilmez", async () => {
  sent.length = 0;
  settings = { enabled: true, lastSuccessAt: hoursAgo(30), lastAlertAt: hoursAgo(2) };
  await alertIfBackupStale();
  settings = { enabled: false, lastSuccessAt: hoursAgo(90), lastAlertAt: null };
  await alertIfBackupStale();
  settings = { enabled: true, lastSuccessAt: hoursAgo(3), lastAlertAt: null };
  await alertIfBackupStale();
  assert.equal(sent.length, 0);
});
