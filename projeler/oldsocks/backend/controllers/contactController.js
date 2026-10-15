// backend/controllers/contactController.js
const { sendContactMail } = require("../utils/mailer");
const {
  clampText,
  hasFilledHoneypot,
  isValidEmailAddress,
  normalizeEmailAddress,
  sanitizeHeaderValue,
} = require("../utils/email");

exports.sendContactMessage = async (req, res) => {
  try {
    const { name, email, subject, message, website } = req.body || {};
    if (hasFilledHoneypot(website)) {
      return res.json({ ok: true, message: "Mesaj gönderildi." });
    }

    const normalizedEmail = normalizeEmailAddress(email);
    const safeName = clampText(name, 120);
    const safeSubject = sanitizeHeaderValue(subject, 140);
    const safeMessage = String(message || "").trim().slice(0, 5000);

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: "Lütfen tüm alanları doldurun." });
    }
    if (!isValidEmailAddress(normalizedEmail)) {
      return res.status(400).json({ message: "Geçerli bir e-posta girin." });
    }
    if (safeName.length < 2) {
      return res.status(400).json({ message: "Ad alanı çok kısa." });
    }
    if (safeSubject.length < 3) {
      return res.status(400).json({ message: "Konu alanı çok kısa." });
    }
    if (safeMessage.length < 10) {
      return res.status(400).json({ message: "Mesaj alanı çok kısa." });
    }

    await sendContactMail({
      name: safeName,
      email: normalizedEmail,
      subject: safeSubject,
      message: safeMessage,
    });
    return res.json({ ok: true, message: "Mesaj gönderildi." });
  } catch (err) {
    console.error("contactController/sendContactMessage", err);
    return res
      .status(500)
      .json({ message: "Mesaj gönderilirken bir hata oluştu." });
  }
};
