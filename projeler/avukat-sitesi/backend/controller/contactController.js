// controller/contactController.js
import { getMailer } from "../config/mailer.js";

function sanitize(s, max = 1000) {
  return String(s || "")
    .trim()
    .slice(0, max);
}

function validate(body) {
  const errors = [];
  const name = sanitize(body.name, 120);
  const email = sanitize(body.email, 200);
  const phone = sanitize(body.phone, 50);
  const subject = sanitize(body.subject, 200);
  const message = sanitize(body.message, 5000);

  if (!name) errors.push("İsim gerekli.");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push("Geçerli bir e-posta girin.");
  if (!subject) errors.push("Konu gerekli.");
  if (!message) errors.push("Mesaj gerekli.");

  return {
    ok: errors.length === 0,
    errors,
    data: { name, email, phone, subject, message },
  };
}

export const contactController = {
  async send(req, res, next) {
    try {
      const v = validate(req.body || {});
      if (!v.ok) return res.status(400).json({ error: v.errors.join(" ") });

      const { name, email, phone, subject, message } = v.data;

      const TO = process.env.CONTACT_TO || process.env.SMTP_USER;
      const FROM = process.env.CONTACT_FROM || process.env.SMTP_USER;

      const html = `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6;">
          <h2 style="margin:0 0 12px">Yeni İletişim Formu</h2>
          <table style="border-collapse:collapse">
            <tr><td style="padding:4px 8px;font-weight:600">İsim</td><td style="padding:4px 8px">${escapeHtml(
              name
            )}</td></tr>
            <tr><td style="padding:4px 8px;font-weight:600">E-posta</td><td style="padding:4px 8px">${escapeHtml(
              email
            )}</td></tr>
            ${
              phone
                ? `<tr><td style="padding:4px 8px;font-weight:600">Telefon</td><td style="padding:4px 8px">${escapeHtml(
                    phone
                  )}</td></tr>`
                : ""
            }
            <tr><td style="padding:4px 8px;font-weight:600">Konu</td><td style="padding:4px 8px">${escapeHtml(
              subject
            )}</td></tr>
          </table>
          <hr style="margin:16px 0;border:none;border-top:1px solid #ddd" />
          <div>
            <div style="font-weight:600;margin-bottom:6px">Mesaj</div>
            <div>${escapeHtmlMultiline(message)}</div>
          </div>
        </div>
      `;

      const text =
        `Yeni İletişim Formu\n` +
        `İsim: ${name}\n` +
        `E-posta: ${email}\n` +
        (phone ? `Telefon: ${phone}\n` : "") +
        `Konu: ${subject}\n\n` +
        `Mesaj:\n${message}`;

      const mailer = getMailer();
      await mailer.sendMail({
        from: FROM, // gönderen
        to: TO, // alıcı (sen)
        subject: `📮 İletişim: ${subject}`,
        text,
        html,
        replyTo: email, // “Yanıtla” dediğinde kullanıcıya döner
      });

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function escapeHtmlMultiline(s) {
  return escapeHtml(s).replace(/\n/g, "<br/>");
}
