import nodemailer, { type Transporter } from 'nodemailer';
import { getMailConfig, type MailConfig } from './config';

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
  cid?: string;
}

export interface SendMailInput {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: MailAttachment[];
}

export interface SendMailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
}

export class MailConfigurationError extends Error {
  constructor(readonly missing: string[]) {
    super(`Mail configuration is incomplete: ${missing.join(', ')}`);
  }
}

let cachedTransporter: Transporter | null = null;
let cachedTransporterKey: string | null = null;

function getTransporter(config: MailConfig) {
  const key = `${config.host}:${config.port}:${config.secure}:${config.user}`;

  if (cachedTransporter && cachedTransporterKey === key) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.appPassword,
    },
    tls: {
      minVersion: 'TLSv1.2',
    },
  });
  cachedTransporterKey = key;

  return cachedTransporter;
}

function assertMailConfigured(config: MailConfig) {
  if (!config.isConfigured) {
    throw new MailConfigurationError(config.missing);
  }
}

function formatAddress(name: string, email: string) {
  const safeName = name.replace(/"/g, '\\"');

  return `"${safeName}" <${email}>`;
}

function normalizeAddressList(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'address' in item && typeof item.address === 'string') {
        return item.address;
      }

      return '';
    })
    .filter(Boolean);
}

export function isMailConfigured() {
  return getMailConfig().isConfigured;
}

export async function verifyMailConnection() {
  const config = getMailConfig();
  assertMailConfigured(config);

  return getTransporter(config).verify();
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const config = getMailConfig();
  assertMailConfigured(config);

  const info = await getTransporter(config).sendMail({
    from: formatAddress(config.fromName, config.fromEmail),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo ?? config.replyTo,
    attachments: input.attachments,
  });

  return {
    messageId: info.messageId,
    accepted: normalizeAddressList(info.accepted),
    rejected: normalizeAddressList(info.rejected),
  };
}
