import nodemailer, { type Transporter } from "nodemailer";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { mailLog } from "@/lib/db/schema";
import { BRAND_NAME } from "@/lib/constants";

export type MailStatus = "sent" | "failed" | "skipped";
export type MailMessage = { to: string; subject: string; text: string; template?: string };

type SmtpConfig = { host: string; port: number; user: string; pass: string; from: string };

function readConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT) || 587;
  const from = process.env.SMTP_FROM?.trim() || `${BRAND_NAME} <${user}>`;
  return { host, port, user, pass, from };
}

export function isMailConfigured(): boolean {
  return readConfig() !== null;
}

const globalForMail = globalThis as unknown as { __gsMailer?: { key: string; transport: Transporter } };

function transporter(config: SmtpConfig): Transporter {
  const key = `${config.host}:${config.port}:${config.user}`;
  if (globalForMail.__gsMailer?.key !== key) {
    globalForMail.__gsMailer = {
      key,
      transport: nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: { user: config.user, pass: config.pass },
        connectionTimeout: 10_000,
        socketTimeout: 15_000,
      }),
    };
  }
  return globalForMail.__gsMailer.transport;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Düz metinden sade bir HTML gövdesi üretir (bağlantılar tıklanabilir olur). */
function toHtml(text: string): string {
  const body = escapeHtml(text)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#a90432">$1</a>')
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1f2937;max-width:560px">${body}<p style="margin:24px 0 0;color:#6b7280;font-size:13px">${escapeHtml(BRAND_NAME)}</p></div>`;
}

function log(message: MailMessage, status: MailStatus, error?: string): void {
  try {
    getDb()
      .insert(mailLog)
      .values({ to: message.to, subject: message.subject, template: message.template ?? null, status, error: error?.slice(0, 500) ?? null })
      .run();
  } catch (err) {
    console.error("[mail] kayıt yazılamadı:", err instanceof Error ? err.message : err);
  }
}

/**
 * E-posta gönderir. SMTP ayarlı değilse göndermez ve "skipped" döner; hata fırlatmaz.
 * Çağıran taraf sonuca göre kullanıcıya alternatif (WhatsApp, admin sıfırlama) sunar.
 */
export async function sendMail(message: MailMessage): Promise<MailStatus> {
  const config = readConfig();
  if (!config) {
    log(message, "skipped", "SMTP ayarlı değil");
    return "skipped";
  }
  try {
    await transporter(config).sendMail({
      from: config.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: toHtml(message.text),
    });
    log(message, "sent");
    return "sent";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[mail] gönderilemedi:", msg);
    log(message, "failed", msg);
    return "failed";
  }
}

export function listMailLog(limit = 50) {
  return getDb().select().from(mailLog).orderBy(desc(mailLog.createdAt), desc(mailLog.id)).limit(limit).all();
}

/* ---------------- Şablonlar ---------------- */

export const mailTemplates = {
  passwordReset: (to: string, name: string, link: string): MailMessage => ({
    to,
    template: "password_reset",
    subject: "Şifre sıfırlama",
    text: `Merhaba ${name},\n\nŞifrenizi sıfırlamak için aşağıdaki bağlantıyı açın. Bağlantı 1 saat geçerlidir ve bir kez kullanılabilir.\n\n${link}\n\nBu isteği siz yapmadıysanız bu e-postayı dikkate almayın.`,
  }),
  invite: (to: string, name: string, link: string): MailMessage => ({
    to,
    template: "invite",
    subject: `${BRAND_NAME} hesabınız`,
    text: `Merhaba ${name},\n\n${BRAND_NAME} için hesabınız oluşturuldu. Şifrenizi belirlemek için aşağıdaki bağlantıyı açın. Bağlantı 7 gün geçerlidir.\n\n${link}`,
  }),
  paymentReminder: (to: string, name: string, student: string, due: string, amount: string): MailMessage => ({
    to,
    template: "payment_reminder",
    subject: "Aidat hatırlatması",
    text: `Merhaba ${name},\n\n${student} için ${amount} tutarındaki aidatın son ödeme günü ${due}. Ödemeyi yaptıktan sonra veli panelinden "Ödeme yaptım" ile bildirebilirsiniz.`,
  }),
};
