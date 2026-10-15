const test = require("node:test");
const assert = require("node:assert/strict");
const nodemailer = require("nodemailer");

const sent = [];
nodemailer.createTransport = () => ({ sendMail: async (payload) => { sent.push(payload); return {}; } });
process.env.MAIL_FROM = "magaza@oldscks.local";
process.env.MAIL_PASS = "test";

const NewsletterSubscriber = require("../models/NewsletterSubscriber");
NewsletterSubscriber.find = () => ({
  select: () => ({
    lean: async () => [
      { email: "ilk@ornek.com" },
      { email: "ikinci@ornek.com" },
      { email: "ILK@ornek.com" },
    ],
  }),
});
const { sendNewsletterNewBlog } = require("../utils/mailer");

test("bülten e-postasında aboneler Kime alanında görünmez, yalnız gizli alıcıdır", async () => {
  await sendNewsletterNewBlog({ _id: "b1", title: "Yeni yazı", content: "İçerik" }, "https://www.oldscks.com");
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].to, ["magaza@oldscks.local"]);
  assert.deepEqual(sent[0].bcc, ["ilk@ornek.com", "ikinci@ornek.com"]);
});
