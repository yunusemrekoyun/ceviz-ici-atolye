// Uygulama olaylarının e-posta bildirimleri — hepsi kuyruk üzerinden.
// Kuyruk/Redis hatası asıl akışı (başvuru, moderasyon) DÜŞÜRMEZ: try/catch.
import { prisma } from './prisma';
import { pushNotification } from './notifications';
import { emailQueue, type EmailJobData } from './queue';

async function adminAddress(): Promise<string | null> {
  if (process.env.ADMIN_EMAIL) return process.env.ADMIN_EMAIL;
  const sc = await prisma.siteContent
    .findUnique({ where: { id: 1 }, select: { contactEmail: true } })
    .catch(() => null);
  return sc?.contactEmail ?? null;
}

async function enqueue(job: EmailJobData) {
  try {
    await emailQueue.add(job.kind, job);
  } catch (e) {
    console.error('[notify] e-posta kuyruğa eklenemedi:', e);
  }
}

function siteUrl(path: string): string {
  const base = process.env.SITE_URL ?? process.env.BETTER_AUTH_URL ?? '';
  return base ? `${base.replace(/\/$/, '')}${path}` : path;
}

export async function notifyAdminNewApplication(title: string, district: string) {
  const to = await adminAddress();
  if (!to) return;
  await enqueue({
    kind: 'notify',
    to,
    subject: 'Yeni ilan başvurusu',
    heading: 'Yeni ilan başvurusu',
    body: `"${title}" (${district}) için yeni bir başvuru geldi. İncelemek için paneli açın.`,
    ctaUrl: siteUrl('/admin'),
    ctaLabel: 'Başvuruyu İncele',
  });
}

export async function notifyAdminResubmission(title: string) {
  const to = await adminAddress();
  if (!to) return;
  await enqueue({
    kind: 'notify',
    to,
    subject: 'Başvuru güncellendi',
    heading: 'Başvuru güncellendi',
    body: `"${title}" başvurusu düzeltilip yeniden gönderildi; yeniden incelemenizi bekliyor.`,
    ctaUrl: siteUrl('/admin'),
    ctaLabel: 'Yeniden İncele',
  });
}

export async function notifyAdminPriceRequest(title: string, requestedPrice: string) {
  const to = await adminAddress();
  if (!to) return;
  await enqueue({
    kind: 'notify',
    to,
    subject: 'Fiyat güncelleme talebi',
    heading: 'Fiyat güncelleme talebi',
    body: `"${title}" ilanının sahibi fiyatın ${requestedPrice} olarak güncellenmesini talep etti.`,
    ctaUrl: siteUrl('/admin'),
    ctaLabel: 'Talebi Görüntüle',
  });
}

/** E-posta + zil ikilisinin alıcısı */
export type Recipient = { id: string; email: string };

/** Şikayet bildirimi — admin'e; yazışma içeriği İLETİLMEZ. */
export async function notifyComplaintAdmin(reporterName: string, reason: string) {
  const to = await adminAddress();
  if (!to) return;
  await enqueue({
    kind: 'notify',
    to,
    subject: 'Yeni şikayet',
    heading: 'Yeni şikayet',
    body: `${reporterName} bir görüşmeyi şikayet etti:\n\n${reason.slice(0, 500)}`,
    ctaUrl: siteUrl('/admin/sikayetler'),
    ctaLabel: 'Şikayeti Görüntüle',
  });
}

/** Yeni sohbet başlatıldığında karşı tarafa tek e-posta (devamı zilde). */
export async function notifyNewMessage(
  to: string,
  senderName: string,
  listingTitle: string,
  path: string,
) {
  await enqueue({
    kind: 'notify',
    to,
    subject: 'Yeni mesajınız var',
    heading: 'Yeni mesajınız var',
    body: `${senderName}, "${listingTitle}" ilanı hakkında size mesaj gönderdi.`,
    ctaUrl: siteUrl(path),
    ctaLabel: 'Mesajı Görüntüle',
  });
}

export async function notifyOwnerApproved(owner: Recipient, title: string) {
  await pushNotification(owner.id, {
    title: 'Başvurunuz onaylandı',
    body: `"${title}" için ekibimiz çekim planlayacak.`,
    href: '/hesap/ilanlarim',
  });
  await enqueue({
    kind: 'notify',
    to: owner.email,
    subject: 'Başvurunuz onaylandı',
    heading: 'Başvurunuz onaylandı',
    body: `"${title}" başvurunuz onaylandı. Ekibimiz fotoğraf ve drone çekimi için sizinle iletişime geçecek; çekim tamamlanınca ilanınız yayına alınacak.`,
    ctaUrl: siteUrl('/hesap/ilanlarim'),
    ctaLabel: 'İlanlarımı Gör',
  });
}

export async function notifyOwnerRejected(owner: Recipient, title: string, reason: string) {
  await pushNotification(owner.id, {
    title: 'Başvurunuz yayınlanamadı',
    body: reason,
    href: '/hesap/ilanlarim',
  });
  await enqueue({
    kind: 'notify',
    to: owner.email,
    subject: 'Başvurunuz hakkında',
    heading: 'Başvurunuz yayınlanamadı',
    body: `"${title}" başvurunuz şu nedenle reddedildi:\n\n${reason}\n\nBilgileri düzeltip yeniden gönderebilirsiniz.`,
    ctaUrl: siteUrl('/hesap/ilanlarim'),
    ctaLabel: 'Düzelt ve Yeniden Gönder',
  });
}

export async function notifyOwnerPublished(owner: Recipient, title: string, slug: string) {
  await pushNotification(owner.id, {
    title: 'İlanınız yayında',
    body: `"${title}" yayına alındı.`,
    href: `/ilan/${slug}`,
  });
  await enqueue({
    kind: 'notify',
    to: owner.email,
    subject: 'İlanınız yayında',
    heading: 'İlanınız yayında',
    body: `"${title}" ilanınız yayına alındı. Alıcılar artık ilanınızı görüntüleyebilir.`,
    ctaUrl: siteUrl(`/ilan/${slug}`),
    ctaLabel: 'İlanı Görüntüle',
  });
}

export async function notifyOwnerPriceApplied(owner: Recipient, title: string, newPrice: string) {
  await pushNotification(owner.id, {
    title: 'Fiyatınız güncellendi',
    body: `"${title}" için yeni fiyat: ${newPrice}.`,
    href: '/hesap/ilanlarim',
  });
  await enqueue({
    kind: 'notify',
    to: owner.email,
    subject: 'Fiyat güncellendi',
    heading: 'Fiyatınız güncellendi',
    body: `"${title}" ilanınızın fiyatı ${newPrice} olarak güncellendi.`,
  });
}

export async function notifyOwnerPriceRejected(owner: Recipient, title: string) {
  await pushNotification(owner.id, {
    title: 'Fiyat talebiniz uygulanamadı',
    body: `"${title}" için ilettiğiniz talep uygulanmadı.`,
    href: '/hesap/ilanlarim',
  });
  await enqueue({
    kind: 'notify',
    to: owner.email,
    subject: 'Fiyat talebiniz hakkında',
    heading: 'Fiyat talebiniz uygulanamadı',
    body: `"${title}" ilanınız için ilettiğiniz fiyat güncelleme talebi uygulanmadı. Detay için bizimle iletişime geçebilirsiniz.`,
  });
}

export async function notifyLeadAdmin(lead: {
  name: string;
  phone: string;
  email?: string;
  budget?: string;
  district?: string;
  purpose?: string;
  note?: string;
}) {
  const to = await adminAddress();
  if (!to) return;
  await enqueue({ kind: 'lead-admin', to, lead });
}

export async function notifyLeadConfirm(to: string, name: string) {
  await enqueue({ kind: 'lead-confirm', to, name });
}
