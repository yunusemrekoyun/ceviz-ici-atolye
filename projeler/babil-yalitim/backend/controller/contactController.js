const nodemailer = require("nodemailer");
const { buildContactMail, validateContactPayload } = require("../utils/contact");

let cachedTransporter;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === "1"
    : port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error("SMTP_USER ve SMTP_PASS tanimli olmalidir.");
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return cachedTransporter;
}

exports.submitContactForm = async (req, res) => {
  try {
    const payload = validateContactPayload(req.body || {});
    const transporter = getTransporter();
    const recipient = process.env.CONTACT_TO_EMAIL || process.env.SMTP_USER;
    const senderAddress = process.env.CONTACT_FROM_EMAIL || process.env.SMTP_USER;

    if (!recipient) {
      return res.status(500).json({
        message: "CONTACT_TO_EMAIL veya SMTP_USER tanimli olmali.",
      });
    }

    const mail = buildContactMail({
      ...payload,
      origin: req.get("origin") || req.get("referer") || "",
    });

    await transporter.sendMail({
      from: `"Website Form" <${senderAddress}>`,
      to: recipient,
      replyTo: payload.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    return res.status(201).json({
      message: "Mesajiniz iletildi. En kisa surede donus yapacagiz.",
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      message: error.message || "Mesaj gonderilemedi.",
    });
  }
};
