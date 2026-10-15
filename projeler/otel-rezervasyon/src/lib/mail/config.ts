export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  appPassword: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  missing: string[];
  isConfigured: boolean;
}

function firstEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }

  return '';
}

function readBoolean(value: string | undefined, fallback: boolean) {
  if (!value) return fallback;

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function readPort(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getMailConfig(): MailConfig {
  const host = firstEnv('MAIL_HOST', 'SMTP_HOST') || 'smtp.gmail.com';
  const port = readPort(firstEnv('MAIL_PORT', 'SMTP_PORT'), 465);
  const secure = readBoolean(firstEnv('MAIL_SECURE', 'SMTP_SECURE'), port === 465);
  const user = firstEnv('MAIL_USER', 'SMTP_USER', 'GMAIL_USER');
  const appPassword = firstEnv('MAIL_APP_PASSWORD', 'MAIL_PASSWORD', 'SMTP_PASS', 'GMAIL_APP_PASSWORD');
  const fromEmail = firstEnv('MAIL_FROM_EMAIL', 'SMTP_FROM_EMAIL') || user;
  const fromName = firstEnv('MAIL_FROM_NAME', 'SMTP_FROM_NAME') || 'Kütahya Garden Otel';
  const replyTo = firstEnv('MAIL_REPLY_TO', 'SMTP_REPLY_TO') || undefined;
  const missing = [
    ['MAIL_USER', user],
    ['MAIL_APP_PASSWORD', appPassword],
    ['MAIL_FROM_EMAIL', fromEmail],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  return {
    host,
    port,
    secure,
    user,
    appPassword,
    fromEmail,
    fromName,
    replyTo,
    missing,
    isConfigured: missing.length === 0,
  };
}
