// config/mailer.js
import nodemailer from "nodemailer";

let transporter = null;

export function getMailer() {
  if (transporter) return transporter;

  const {
    SMTP_HOST = "smtp.gmail.com",
    SMTP_PORT = "465",
    SMTP_SECURE = "true",
    SMTP_USER,
    SMTP_PASS,
  } = process.env;

  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP_USER / SMTP_PASS eksik. .env’i kontrol edin.");
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE).toLowerCase() === "true", // 465=true, 587=false
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
}

export async function verifyMailer() {
  const tx = getMailer();
  try {
    await tx.verify();
    console.log("✅ SMTP transporter hazır (mail gönderilebilir).");
  } catch (e) {
    console.error("❌ SMTP doğrulama başarısız:", e.message);
  }
}
