import { Queue } from 'bullmq';
import { redisConnection } from './redis';

export const EMAIL_QUEUE_NAME = 'email';

export type EmailJobData =
  | { kind: 'verify-email'; to: string; url: string; name?: string }
  | { kind: 'reset-password'; to: string; url: string; name?: string }
  // Genel bildirim: konu + başlık + gövde (+ opsiyonel CTA) — markalı şablonla gider
  | {
      kind: 'notify';
      to: string;
      subject: string;
      heading: string;
      body: string;
      ctaUrl?: string;
      ctaLabel?: string;
    }
  // Talep formu: admin'e alan tablosu, talep sahibine kısa teyit
  | {
      kind: 'lead-admin';
      to: string;
      lead: {
        name: string;
        phone: string;
        email?: string;
        budget?: string;
        district?: string;
        purpose?: string;
        note?: string;
      };
    }
  | { kind: 'lead-confirm'; to: string; name: string };

export type EmailJobName = EmailJobData['kind'];

export const emailQueue = new Queue<EmailJobData, void, EmailJobName>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

// Medya işleme: yüklenen orijinalden sharp varyantları / ffmpeg posteri üretir
export const MEDIA_QUEUE_NAME = 'media';

export type MediaJobData = { mediaId: string };

export const mediaQueue = new Queue<MediaJobData>(MEDIA_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});
