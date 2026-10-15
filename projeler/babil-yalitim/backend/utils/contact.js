const { sanitizePlainText } = require("./text");
const { isValidEmail } = require("./blog");

function validateContactPayload(payload = {}) {
  const trap = sanitizePlainText(payload.company || payload.website || "", 120);
  if (trap) {
    const error = new Error("Geçersiz istek.");
    error.status = 400;
    throw error;
  }

  const name = sanitizePlainText(payload.name, 80);
  const email = String(payload.email || "").trim().toLowerCase();
  const message = sanitizePlainText(payload.message, 3000);

  if (!name || !email || !message) {
    const error = new Error("Ad, e-posta ve mesaj alanları zorunludur.");
    error.status = 400;
    throw error;
  }

  if (!isValidEmail(email)) {
    const error = new Error("Geçerli bir e-posta adresi giriniz.");
    error.status = 400;
    throw error;
  }

  return { name, email, message };
}

function buildContactMail({ name, email, message, origin }) {
  const safeOrigin = sanitizePlainText(origin || "", 250);
  const lines = [
    "Yeni iletişim formu mesajı",
    "",
    `Ad Soyad: ${name}`,
    `E-posta: ${email}`,
    safeOrigin ? `Kaynak: ${safeOrigin}` : null,
    "",
    "Mesaj:",
    message,
  ].filter(Boolean);

  return {
    subject: `Site Iletisim Formu - ${name}`,
    text: lines.join("\n"),
    html: [
      "<h2>Yeni iletisim formu mesaji</h2>",
      `<p><strong>Ad Soyad:</strong> ${name}</p>`,
      `<p><strong>E-posta:</strong> ${email}</p>`,
      safeOrigin ? `<p><strong>Kaynak:</strong> ${safeOrigin}</p>` : "",
      `<p><strong>Mesaj:</strong></p><p>${message.replace(/\n/g, "<br />")}</p>`,
    ].join(""),
  };
}

module.exports = {
  validateContactPayload,
  buildContactMail,
};
