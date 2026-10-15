import QRCode from 'qrcode';
import type { MailAttachment } from './mailer';
import { getMailConfig } from './config';

// ── Helpers ────────────────────────────────────────────────────────────────────

function e(v: string) {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function hotelName() {
  return getMailConfig().fromName || 'Kütahya Garden Otel';
}

function formatPrice(amount: number) {
  return amount.toLocaleString('tr-TR') + ' ₺';
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

const HEADER_BG = '#0f172a';
const ACCENT    = '#10b981';

function emailShell(title: string, previewText: string, bodyContent: string) {
  const hotel = e(hotelName());
  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${e(title)}</title>
</head>
<body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${e(previewText)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="padding:22px 28px;background:${HEADER_BG};">
          <p style="margin:0;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;">${hotel}</p>
          <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;line-height:1.3;">${e(title)}</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:28px;">
          ${bodyContent}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:11px;line-height:1.6;">
          Bu e-posta ${hotel} sistemi tarafından otomatik oluşturulmuştur. Yanıtlamayınız.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function infoRow(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;color:#64748b;font-size:13px;vertical-align:top;white-space:nowrap;padding-right:16px;">${e(label)}</td>
    <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:700;vertical-align:top;">${e(value)}</td>
  </tr>`;
}

// ── 1. E-posta Doğrulama ───────────────────────────────────────────────────────

export function renderVerificationEmail(firstName: string, verifyUrl: string) {
  const name = firstName || 'Değerli Misafirimiz';
  const hotel = hotelName();

  const body = `
    <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.7;">Merhaba ${e(name)},</p>
    <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.7;">
      ${e(hotel)}'e hoş geldiniz! Hesabınızı aktifleştirmek için e-posta adresinizi doğrulamanız gerekiyor.
    </p>
    <div style="margin:24px 0;text-align:center;">
      <a href="${e(verifyUrl)}"
         style="display:inline-block;padding:13px 28px;border-radius:8px;background:${ACCENT};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:.02em;">
        E-postamı Doğrula
      </a>
    </div>
    <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
      Bu bağlantı 24 saat geçerlidir. Bu isteği siz yapmadıysanız yok sayabilirsiniz; hesabınızda herhangi bir değişiklik yapılmaz.
    </p>`;

  const { html } = { html: emailShell('E-postanızı Doğrulayın', `${hotel} hesabınızı doğrulayın.`, body) };
  const text = `${hotel} — E-posta Doğrulama\n\nMerhaba ${name},\n\nHesabınızı doğrulamak için: ${verifyUrl}\n\nBu bağlantı 24 saat geçerlidir.`;
  return { html, text };
}

// ── 2. Rezervasyon Onay E-postası ─────────────────────────────────────────────

export interface ReservationEmailData {
  firstName: string;
  lastName: string;
  email: string;
  confirmationId: string;
  roomName: string;
  checkInDate: string;   // YYYY-MM-DD
  checkOutDate: string;  // YYYY-MM-DD
  nights: number;
  adultsCount: number;
  childrenCount: number;
  checkInTime: string;
  checkOutTime: string;
  subtotal: number;
  totalPrice: number;
  specialRequests?: string | null;
}

export async function renderReservationEmail(data: ReservationEmailData): Promise<{
  html: string;
  text: string;
  attachments: MailAttachment[];
}> {
  const hotel = hotelName();

  // Generate QR code as PNG buffer
  let qrBuffer: Buffer | null = null;
  try {
    qrBuffer = await QRCode.toBuffer(data.confirmationId, {
      errorCorrectionLevel: 'H',
      width: 180,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    });
  } catch { /* silent */ }

  const guests = `${data.adultsCount} Yetişkin${data.childrenCount > 0 ? ` + ${data.childrenCount} Çocuk` : ''}`;
  const priceRows = data.subtotal !== data.totalPrice
    ? `${infoRow('Oda ücreti', formatPrice(data.subtotal))}${infoRow('Toplam', formatPrice(data.totalPrice))}`
    : infoRow('Toplam', formatPrice(data.totalPrice));

  const specialBlock = data.specialRequests
    ? `<div style="margin:20px 0 0;padding:14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;color:#92400e;font-size:13px;line-height:1.6;">
        <strong>Özel İstek:</strong> ${e(data.specialRequests)}
       </div>`
    : '';

  const qrSection = qrBuffer
    ? `<div style="margin:24px 0;text-align:center;padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
        <p style="margin:0 0 12px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;">Check-in Kodunuz</p>
        <img src="cid:reservation-qr@gardenhotel" width="160" height="160" alt="QR Kod" style="display:block;margin:0 auto 14px;border-radius:8px;"/>
        <p style="margin:0;font-family:monospace;font-size:28px;font-weight:900;color:#0f172a;letter-spacing:.3em;">${e(data.confirmationId)}</p>
        <p style="margin:8px 0 0;color:#94a3b8;font-size:12px;">Otele geldiğinizde bu kodu veya QR kodu gösterin</p>
       </div>`
    : `<div style="margin:24px 0;text-align:center;padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
        <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;">Rezervasyon Kodunuz</p>
        <p style="margin:0;font-family:monospace;font-size:28px;font-weight:900;color:#0f172a;letter-spacing:.3em;">${e(data.confirmationId)}</p>
       </div>`;

  const infoBlock = `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px 18px;margin:20px 0 0;">
      <p style="margin:0 0 10px;color:#1e40af;font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;">Bilmeniz Gerekenler</p>
      <ul style="margin:0;padding-left:18px;color:#334155;font-size:13px;line-height:1.8;">
        <li>Giriş (check-in) saat <strong>${e(data.checkInTime)}</strong>'dan itibaren, çıkış (check-out) <strong>${e(data.checkOutTime)}</strong>'a kadardır.</li>
        <li>Resepsiyonda QR kodunuzu veya <strong>${e(data.confirmationId)}</strong> onay kodunuzu göstermeniz yeterlidir.</li>
        <li>Tüm odalarımızda ücretsiz Wi-Fi mevcuttur.</li>
        <li>Kahvaltı seçeneği ve özel istekleriniz için resepsiyonumuzla görüşebilirsiniz.</li>
      </ul>
    </div>`;

  const body = `
    <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">
      Merhaba <strong>${e(data.firstName)} ${e(data.lastName)}</strong>,<br/>
      Rezervasyonunuz başarıyla alındı. Sizi ağırlamaktan mutluluk duyacağız!
    </p>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
      <p style="margin:0 0 12px;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;">Rezervasyon Detayları</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('Oda', data.roomName)}
        ${infoRow('Giriş', `${fmtDate(data.checkInDate)} — ${data.checkInTime}`)}
        ${infoRow('Çıkış', `${fmtDate(data.checkOutDate)} — ${data.checkOutTime}`)}
        ${infoRow('Süre', `${data.nights} Gece`)}
        ${infoRow('Misafir', guests)}
        ${priceRows}
      </table>
    </div>

    ${specialBlock}
    ${qrSection}
    ${infoBlock}

    <p style="margin:22px 0 0;color:#334155;font-size:14px;line-height:1.7;">
      Sizi ${e(hotel)}'de ağırlamak için sabırsızlanıyoruz. İyi yolculuklar dileriz!
    </p>`;

  const html = emailShell(
    'Rezervasyonunuz Onaylandı',
    `${data.confirmationId} kodlu rezervasyonunuz alındı. ${hotel} sizi bekliyor!`,
    body,
  );

  const text = [
    `${hotel} — Rezervasyon Onayı`,
    '',
    `Merhaba ${data.firstName} ${data.lastName},`,
    'Rezervasyonunuz alındı.',
    '',
    `Oda: ${data.roomName}`,
    `Giriş: ${data.checkInDate} ${data.checkInTime}`,
    `Çıkış: ${data.checkOutDate} ${data.checkOutTime}`,
    `${data.nights} gece · ${guests}`,
    `Toplam: ${formatPrice(data.totalPrice)}`,
    '',
    `Rezervasyon kodu: ${data.confirmationId}`,
    '',
    data.specialRequests ? `Özel istek: ${data.specialRequests}` : '',
  ].filter(l => l !== null).join('\n');

  const attachments: MailAttachment[] = qrBuffer
    ? [{ filename: 'rezervasyon-qr.png', content: qrBuffer, contentType: 'image/png', cid: 'reservation-qr@gardenhotel' }]
    : [];

  return { html, text, attachments };
}

// ── 3. Check-in Hoş Geldiniz E-postası ────────────────────────────────────────

export interface CheckinEmailData {
  firstName: string;
  roomName: string;
  checkOutDate: string; // YYYY-MM-DD
  checkOutTime: string;
  confirmationId: string;
}

export function renderCheckinEmail(data: CheckinEmailData) {
  const hotel = hotelName();

  const body = `
    <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">
      Merhaba <strong>${e(data.firstName)}</strong>, ${e(hotel)}'e hoş geldiniz!<br/>
      Check-in işleminiz tamamlandı.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
      <p style="margin:0 0 12px;color:#166534;font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;">Konaklama Bilgileri</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('Oda', data.roomName)}
        ${infoRow('Çıkış', `${fmtDate(data.checkOutDate)} — ${data.checkOutTime}`)}
        ${infoRow('Kod', data.confirmationId)}
      </table>
    </div>
    <p style="margin:0;color:#334155;font-size:14px;line-height:1.7;">
      Konaklamanızın her anının keyifli geçmesini dileriz. Herhangi bir ihtiyacınızda resepsiyonumuzla iletişime geçebilirsiniz.
    </p>`;

  const html = emailShell(
    'Hoş Geldiniz!',
    `${e(data.firstName)}, ${hotel}'e hoş geldiniz. Odanız hazır.`,
    body,
  );

  const text = [
    `${hotel} — Hoş Geldiniz`,
    '',
    `Merhaba ${data.firstName},`,
    'Check-in işleminiz tamamlandı.',
    '',
    `Oda: ${data.roomName}`,
    `Çıkış: ${data.checkOutDate} ${data.checkOutTime}`,
    `Kod: ${data.confirmationId}`,
    '',
    'İyi tatiller dileriz!',
  ].join('\n');

  return { html, text };
}

// ── 4. Konaklama Değerlendirme Daveti ────────────────────────────────────────

export interface ReviewRequestEmailData {
  firstName: string;
  roomName: string;
  confirmationId: string;
  reviewUrl: string;
}

export function renderReviewRequestEmail(data: ReviewRequestEmailData) {
  const hotel = hotelName();

  const body = `
    <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.7;">
      Merhaba <strong>${e(data.firstName)}</strong>,<br/>
      ${e(data.roomName)} konaklamanız için teşekkür ederiz. Kısa değerlendirmeniz, ekibimizin doğru yerde iyileştirme yapmasına yardımcı olur.
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('Rezervasyon', data.confirmationId)}
        ${infoRow('Oda', data.roomName)}
      </table>
    </div>
    <div style="margin:24px 0;text-align:center;">
      <a href="${e(data.reviewUrl)}"
         style="display:inline-block;padding:13px 28px;border-radius:8px;background:${ACCENT};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:.02em;">
        Konaklamamı Değerlendir
      </a>
    </div>
    <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
      Yorumunuz public alanda görünmeden önce otel yönetimi tarafından kontrol edilir.
    </p>`;

  const html = emailShell(
    'Konaklamanızı Değerlendirin',
    `${hotel} konaklamanız hakkında kısa bir yorum bırakabilirsiniz.`,
    body,
  );

  const text = [
    `${hotel} — Konaklamanızı Değerlendirin`,
    '',
    `Merhaba ${data.firstName},`,
    `${data.roomName} konaklamanız için teşekkür ederiz.`,
    `Rezervasyon: ${data.confirmationId}`,
    '',
    `Yorum bırakmak için: ${data.reviewUrl}`,
  ].join('\n');

  return { html, text };
}

// ── 5. İptal / İade Bildirimi ─────────────────────────────────────────────────

export interface CancellationEmailData {
  firstName: string;
  confirmationId: string;
  roomName: string;
  refundAmount?: number;   // in TRY; omit/0 when nothing to refund
  refundFailed?: boolean;  // online refund could not be initiated automatically
}

export function renderCancellationEmail(data: CancellationEmailData) {
  const hotel = hotelName();
  const hasRefund = (data.refundAmount ?? 0) > 0;

  const refundBlock = hasRefund
    ? (data.refundFailed
        ? `<div style="margin:20px 0 0;padding:14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;color:#92400e;font-size:13px;line-height:1.6;">
            <strong>İade:</strong> ${formatPrice(data.refundAmount!)} tutarındaki iadeniz işleme alınmıştır; ekibimiz en kısa sürede tamamlayacaktır.
           </div>`
        : `<div style="margin:20px 0 0;padding:14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;color:#166534;font-size:13px;line-height:1.6;">
            <strong>İade:</strong> ${formatPrice(data.refundAmount!)} tutarındaki iadeniz başlatıldı. Bankanıza yansıma süresi ödeme yönteminize göre değişebilir.
           </div>`)
    : '';

  const body = `
    <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.7;">
      Merhaba <strong>${e(data.firstName)}</strong>,<br/>
      ${e(data.confirmationId)} numaralı rezervasyonunuz iptal edilmiştir.
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('Rezervasyon', data.confirmationId)}
        ${infoRow('Oda', data.roomName)}
        ${infoRow('Durum', 'İptal edildi')}
      </table>
    </div>
    ${refundBlock}
    <p style="margin:20px 0 0;color:#334155;font-size:14px;line-height:1.7;">
      Sizi tekrar ${e(hotel)}'de ağırlamayı dileriz.
    </p>`;

  const html = emailShell('Rezervasyonunuz İptal Edildi', `${data.confirmationId} numaralı rezervasyonunuz iptal edildi.`, body);

  const text = [
    `${hotel} — Rezervasyon İptali`,
    '',
    `Merhaba ${data.firstName},`,
    `${data.confirmationId} numaralı rezervasyonunuz iptal edilmiştir.`,
    `Oda: ${data.roomName}`,
    hasRefund ? `İade tutarı: ${formatPrice(data.refundAmount!)}` : '',
  ].filter(Boolean).join('\n');

  return { html, text };
}

// ── 6. Rezervasyon Değişikliği ────────────────────────────────────────────────

export interface ChangeEmailData {
  firstName: string;
  confirmationId: string;
  roomName: string;
  checkInDate: string;   // YYYY-MM-DD
  checkOutDate: string;  // YYYY-MM-DD
  nights: number;
  totalPrice: number;
  /** Positive = extra collected; negative = refunded; 0 = no change. */
  difference: number;
}

export function renderChangeEmail(data: ChangeEmailData) {
  const hotel = hotelName();
  const diff = data.difference;
  const diffBlock = diff > 0
    ? `<div style="margin:20px 0 0;padding:14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;color:#1e40af;font-size:13px;line-height:1.6;">
        <strong>Ek tahsilat:</strong> ${formatPrice(diff)} tahsil edildi.
       </div>`
    : diff < 0
      ? `<div style="margin:20px 0 0;padding:14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;color:#166534;font-size:13px;line-height:1.6;">
          <strong>İade:</strong> ${formatPrice(Math.abs(diff))} iade edildi.
         </div>`
      : '';

  const body = `
    <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.7;">
      Merhaba <strong>${e(data.firstName)}</strong>,<br/>
      ${e(data.confirmationId)} numaralı rezervasyonunuz güncellendi. Yeni bilgiler:
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${infoRow('Oda', data.roomName)}
        ${infoRow('Giriş', fmtDate(data.checkInDate))}
        ${infoRow('Çıkış', fmtDate(data.checkOutDate))}
        ${infoRow('Süre', `${data.nights} Gece`)}
        ${infoRow('Yeni Toplam', formatPrice(data.totalPrice))}
      </table>
    </div>
    ${diffBlock}
    <p style="margin:20px 0 0;color:#334155;font-size:14px;line-height:1.7;">
      Sizi ${e(hotel)}'de ağırlamayı sabırsızlıkla bekliyoruz.
    </p>`;

  const html = emailShell('Rezervasyonunuz Güncellendi', `${data.confirmationId} numaralı rezervasyonunuz güncellendi.`, body);

  const text = [
    `${hotel} — Rezervasyon Güncellemesi`,
    '',
    `Merhaba ${data.firstName},`,
    `${data.confirmationId} numaralı rezervasyonunuz güncellendi.`,
    `Oda: ${data.roomName}`,
    `Giriş: ${data.checkInDate} · Çıkış: ${data.checkOutDate} · ${data.nights} gece`,
    `Yeni toplam: ${formatPrice(data.totalPrice)}`,
    diff > 0 ? `Ek tahsilat: ${formatPrice(diff)}` : diff < 0 ? `İade: ${formatPrice(Math.abs(diff))}` : '',
  ].filter(Boolean).join('\n');

  return { html, text };
}
