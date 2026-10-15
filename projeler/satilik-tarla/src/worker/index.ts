// Bağımsız process — `npm run worker` (tsx watch) ile çalışır. Next dışında
// olduğu için .env otomatik yüklenmez, bu yüzden dotenv/config ilk satır olmalı.
import 'dotenv/config';
import { Queue, Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { redisConnection } from '../lib/redis';
import {
  EMAIL_QUEUE_NAME,
  MEDIA_QUEUE_NAME,
  type EmailJobData,
  type MediaJobData,
} from '../lib/queue';
import { mailer } from './mailer';
import { kvTable, renderEmail, textToHtml } from './templates';
import { processMedia } from './media';
import { runSavedSearchDigest } from './digest';

const FROM = process.env.SMTP_FROM ?? 'Kütahya Satılık Tarla <no-reply@kutahyasatiliktarla.com>';

function buildMessage(data: EmailJobData): { subject: string; html: string } {
  switch (data.kind) {
    case 'verify-email':
      return {
        subject: 'E-posta adresinizi doğrulayın',
        html: renderEmail({
          heading: `Merhaba ${data.name ?? ''}`,
          body: '<p style="margin:0">Hesabınızı kullanmaya başlamak için e-posta adresinizi doğrulayın.</p>',
          ctaUrl: data.url,
          ctaLabel: 'E-postamı Doğrula',
        }),
      };
    case 'reset-password':
      return {
        subject: 'Şifre sıfırlama talebi',
        html: renderEmail({
          heading: `Merhaba ${data.name ?? ''}`,
          body: '<p style="margin:0">Şifrenizi sıfırlamak için aşağıdaki bağlantıyı kullanın. Talep size ait değilse bu e-postayı yok sayabilirsiniz.</p>',
          ctaUrl: data.url,
          ctaLabel: 'Şifremi Sıfırla',
        }),
      };
    case 'notify':
      return {
        subject: data.subject,
        html: renderEmail({
          heading: data.heading,
          body: textToHtml(data.body),
          ctaUrl: data.ctaUrl,
          ctaLabel: data.ctaLabel,
        }),
      };
    case 'lead-admin':
      return {
        subject: `Yeni arazi talebi — ${data.lead.name}`,
        html: renderEmail({
          heading: 'Yeni arazi talebi',
          body:
            '<p style="margin:0 0 8px">Sitedeki talep formundan yeni bir kayıt geldi:</p>' +
            kvTable([
              ['Ad Soyad', data.lead.name],
              ['Telefon', data.lead.phone],
              ['E-posta', data.lead.email ?? ''],
              ['Bütçe', data.lead.budget ?? ''],
              ['İlçe', data.lead.district ?? ''],
              ['Amaç', data.lead.purpose ?? ''],
              ['Not', data.lead.note ?? ''],
            ]),
        }),
      };
    case 'lead-confirm':
      return {
        subject: 'Talebinizi aldık',
        html: renderEmail({
          heading: `Merhaba ${data.name}`,
          body: '<p style="margin:0">Arazi talebiniz bize ulaştı. Ekibimiz kriterlerinize uygun ilanları derleyip en kısa sürede sizinle iletişime geçecek.</p>',
        }),
      };
    default: {
      const exhaustive: never = data;
      throw new Error(`Bilinmeyen e-posta türü: ${JSON.stringify(exhaustive)}`);
    }
  }
}

const worker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  async (job) => {
    const to = job.data.to;
    const { subject, html } = buildMessage(job.data);
    await mailer.sendMail({ from: FROM, to, subject, html });
  },
  { connection: redisConnection, concurrency: 5 },
);

worker.on('completed', (job) =>
  console.log(`[worker] ${job.data.kind} → ${job.data.to} (job ${job.id}) gönderildi`),
);
worker.on('failed', (job, err) => console.error(`[worker] job ${job?.id} başarısız:`, err));

// Medya işleme worker'ı — sharp CPU-yoğun olduğundan düşük eşzamanlılık
const prisma = new PrismaClient();

// Varyantlar DB'ye yazılınca public cache'in beklemesin diye app'e haber ver
const APP_URL = process.env.INTERNAL_APP_URL ?? process.env.SITE_URL ?? 'http://localhost:3000';

async function revalidateListing(slug: string) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return;
  try {
    await fetch(`${APP_URL}/api/revalidate`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ slug }),
    });
  } catch (err) {
    console.warn('[worker] revalidate çağrısı başarısız:', err);
  }
}

const mediaWorker = new Worker<MediaJobData>(
  MEDIA_QUEUE_NAME,
  async (job) => {
    const result = await processMedia(prisma, job.data.mediaId);
    if (result?.slug) await revalidateListing(result.slug);
  },
  { connection: redisConnection, concurrency: 2 },
);

mediaWorker.on('completed', (job) =>
  console.log(`[worker] medya ${job.data.mediaId} işlendi (job ${job.id})`),
);
mediaWorker.on('failed', (job, err) =>
  console.error(`[worker] medya job ${job?.id} başarısız:`, err),
);

// Kayıtlı arama özeti: her sabah 08:00 Türkiye saati (v0.5 kararı)
const DIGEST_QUEUE = 'digest';
const digestQueue = new Queue(DIGEST_QUEUE, { connection: redisConnection });
await digestQueue.upsertJobScheduler(
  'saved-search-daily',
  { pattern: '0 8 * * *', tz: 'Europe/Istanbul' },
  { name: 'daily' },
);

const digestWorker = new Worker(
  DIGEST_QUEUE,
  async () => {
    const result = await runSavedSearchDigest(prisma);
    console.log(`[worker] özet: ${result.sent}/${result.searches} kayıtlı aramaya e-posta`);
  },
  { connection: redisConnection, concurrency: 1 },
);
digestWorker.on('failed', (job, err) =>
  console.error(`[worker] özet job ${job?.id} başarısız:`, err),
);

console.log(
  '[worker] başlatıldı — kuyruklar:',
  EMAIL_QUEUE_NAME,
  '+',
  MEDIA_QUEUE_NAME,
  '+',
  DIGEST_QUEUE,
);
