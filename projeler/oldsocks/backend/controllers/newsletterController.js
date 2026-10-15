const NewsletterSubscriber = require("../models/NewsletterSubscriber");
const {
  hasFilledHoneypot,
  isValidEmailAddress,
  normalizeEmailAddress,
} = require("../utils/email");

exports.subscribe = async (req, res) => {
  try {
    if (hasFilledHoneypot(req.body.website)) {
      return res.json({ message: "Abonelik kaydedildi." });
    }

    const email = normalizeEmailAddress(req.body.email);
    if (!isValidEmailAddress(email)) {
      return res.status(400).json({ message: "Geçerli bir e-posta girin." });
    }

    // upsert: varsa dokunma, yoksa oluştur
    await NewsletterSubscriber.findOneAndUpdate(
      { email },
      { $setOnInsert: { email } },
      { upsert: true, new: true }
    );

    return res.json({ message: "Abonelik kaydedildi." });
  } catch (err) {
    return res.status(200).json({ message: "Abonelik kaydedildi." });
  }
};

// (opsiyonel) admin listele
exports.list = async (req, res) => {
  const subs = await NewsletterSubscriber.find().sort({ createdAt: -1 });
  res.json(subs);
};
