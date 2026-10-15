import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { retrieveCheckoutForm } from '@/lib/payments/iyzico';
import { sendReservationConfirmationEmail } from '@/lib/reservations/confirmation';
import { consumeCoupon } from '@/lib/loyalty/coupons';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';

function getAppUrl() {
  return process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_BASE_URL?.trim() || '/';
}

function buildReturnUrl(paymentId: string) {
  try {
    const url = new URL(getAppUrl());
    url.searchParams.set('payment', paymentId);
    return url.toString();
  } catch {
    return `/?payment=${encodeURIComponent(paymentId)}`;
  }
}

function getParentOrigin() {
  const raw = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (!raw) return '*';

  try {
    return new URL(raw).origin;
  } catch {
    return '*';
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value?: Date | null) {
  if (!value) return '';
  return value.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function maskEmail(email?: string | null) {
  if (!email) return '';
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const visible = name.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(name.length - 2, 1))}@${domain}`;
}

interface CallbackView {
  paymentId: string | null;
  status: 'paid' | 'failed';
  message: string;
  confirmationId?: string;
  roomName?: string;
  checkInDate?: Date | null;
  checkOutDate?: Date | null;
  amount?: number;
  email?: string | null;
  qrDataUrl?: string | null;
}

function renderCallbackPage(view: CallbackView) {
  const payload = JSON.stringify({
    type: 'garden-payment-callback',
    paymentId: view.paymentId,
    status: view.status,
    message: view.message,
  }).replace(/</g, '\\u003c');
  const targetOrigin = JSON.stringify(getParentOrigin()).replace(/</g, '\\u003c');
  const homeUrl = escapeHtml(getAppUrl());
  const returnUrl = view.paymentId
    ? JSON.stringify(buildReturnUrl(view.paymentId)).replace(/</g, '\\u003c')
    : null;

  const accent = '#34d399';
  const isPaid = view.status === 'paid';

  const successBody = isPaid
    ? `
    <div style="display:flex;flex-direction:column;align-items:center;gap:18px;">
      ${view.qrDataUrl ? `
      <div style="background:#ffffff;padding:14px;border-radius:18px;box-shadow:0 10px 40px rgba(0,0,0,.35);">
        <img src="${view.qrDataUrl}" width="200" height="200" alt="Check-in QR" style="display:block;border-radius:8px;"/>
      </div>` : ''}
      ${view.confirmationId ? `
      <div style="text-align:center;">
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.4);">Onay Kodu</p>
        <p style="margin:0;font-size:30px;font-weight:800;letter-spacing:.12em;color:${accent};font-family:ui-monospace,Menlo,monospace;">${escapeHtml(view.confirmationId)}</p>
      </div>` : ''}
      <p style="margin:0;max-width:340px;text-align:center;font-size:13px;line-height:1.6;color:rgba(255,255,255,.65);">
        QR kodu veya onay kodunu resepsiyonda göstererek check-in yapabilirsiniz.
      </p>
      <div style="width:100%;max-width:360px;border-top:1px solid rgba(255,255,255,.1);padding-top:16px;display:grid;gap:10px;">
        ${view.roomName ? row('Oda', escapeHtml(view.roomName)) : ''}
        ${view.checkInDate ? row('Giriş', escapeHtml(formatDate(view.checkInDate))) : ''}
        ${view.checkOutDate ? row('Çıkış', escapeHtml(formatDate(view.checkOutDate))) : ''}
        ${typeof view.amount === 'number' ? row('Ödenen', `₺${view.amount.toLocaleString('tr-TR')}`) : ''}
      </div>
      ${view.email ? `
      <p style="margin:0;font-size:12px;text-align:center;color:rgba(255,255,255,.5);">
        Onay e-postası <strong style="color:rgba(255,255,255,.75);">${escapeHtml(maskEmail(view.email))}</strong> adresine gönderildi.
      </p>` : ''}
    </div>`
    : `
    <p style="margin:0;max-width:340px;text-align:center;font-size:13px;line-height:1.6;color:rgba(255,255,255,.65);">
      ${escapeHtml(view.message)}
    </p>`;

  function row(label: string, value: string) {
    return `<div style="display:flex;justify-content:space-between;gap:16px;font-size:13px;">
      <span style="color:rgba(255,255,255,.45);">${label}</span>
      <span style="color:rgba(255,255,255,.9);font-weight:600;text-align:right;">${value}</span>
    </div>`;
  }

  const iconColor = isPaid ? accent : '#f87171';
  const iconBg = isPaid ? 'rgba(52,211,153,.12)' : 'rgba(248,113,113,.12)';
  const iconBorder = isPaid ? 'rgba(52,211,153,.35)' : 'rgba(248,113,113,.35)';
  const icon = isPaid
    ? `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`
    : `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  const title = isPaid ? 'Ödeme alındı, rezervasyon onaylandı' : 'Ödeme tamamlanamadı';

  return new NextResponse(`<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${isPaid ? 'Rezervasyon Onayı' : 'Ödeme'}</title>
  <script>
    // Runs during head parse, before the body paints — so the top-level redirect
    // happens with no visible flash of this fallback page.
    (function () {
      var inIframe = false;
      try { inIframe = window.parent && window.parent !== window; } catch (_) { inIframe = true; }
      if (inIframe) {
        // Embedded flow: let the parent app advance to its in-app confirmation.
        try { window.parent.postMessage(${payload}, ${targetOrigin}); } catch (_) {}
      } else ${returnUrl ? `{
        // Top-level 3DS redirect: return to the app so it can show the themed
        // confirmation (with QR) inside the reservation screen.
        window.location.replace(${returnUrl});
      }` : `{}`}
    })();
  </script>
</head>
<body style="margin:0;min-height:100vh;background:#07100f;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;display:grid;place-items:center;padding:24px;box-sizing:border-box;">
  <main style="width:100%;max-width:440px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:32px 28px;box-shadow:0 20px 60px rgba(0,0,0,.4);">
    <div style="display:flex;flex-direction:column;align-items:center;gap:14px;margin-bottom:24px;">
      <div style="width:60px;height:60px;border-radius:18px;display:grid;place-items:center;background:${iconBg};border:1px solid ${iconBorder};">${icon}</div>
      <h1 style="font-size:20px;line-height:1.3;margin:0;text-align:center;font-weight:700;">${title}</h1>
    </div>
    ${successBody}
    <a href="${homeUrl}" style="margin-top:26px;display:block;text-align:center;text-decoration:none;background:${isPaid ? accent : 'rgba(255,255,255,.08)'};color:${isPaid ? '#07100f' : '#fff'};font-weight:700;font-size:14px;padding:14px;border-radius:14px;">
      Anasayfaya Dön
    </a>
  </main>
</body>
</html>`, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function failureResponse(paymentId: string | null, message: string) {
  return renderCallbackPage({ paymentId, status: 'failed', message });
}

async function readToken(request: NextRequest) {
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token');
  if (queryToken) return queryToken;

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => null);
    return typeof body?.token === 'string' ? body.token : null;
  }

  const form = await request.formData().catch(() => null);
  const formToken = form?.get('token');
  return typeof formToken === 'string' ? formToken : null;
}

async function buildSuccessView(
  payment: { id: string },
  reservation: {
    confirmationId: string;
    room: { name: string };
    checkInDate: Date;
    checkOutDate: Date;
    totalPrice: number;
    email: string;
  },
): Promise<CallbackView> {
  const qrDataUrl = await QRCode.toDataURL(reservation.confirmationId, {
    width: 220,
    margin: 1,
    color: { dark: '#07100f', light: '#ffffff' },
  }).catch(() => null);

  return {
    paymentId: payment.id,
    status: 'paid',
    message: 'Rezervasyonunuz onaylandı.',
    confirmationId: reservation.confirmationId,
    roomName: reservation.room.name,
    checkInDate: reservation.checkInDate,
    checkOutDate: reservation.checkOutDate,
    amount: reservation.totalPrice,
    email: reservation.email,
    qrDataUrl,
  };
}

async function handleCallback(request: NextRequest) {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get('paymentId');
  const token = await readToken(request);

  if (!token && !paymentId) {
    return failureResponse(null, 'Ödeme cevabı doğrulanamadı.');
  }

  const payment = await prisma.payment.findFirst({
    where: paymentId
      ? { id: paymentId }
      : { iyzicoToken: token || undefined },
    include: {
      reservation: {
        include: {
          room: { select: { name: true } },
        },
      },
    },
  });

  if (!payment || !payment.iyzicoToken) {
    return failureResponse(paymentId, 'Ödeme kaydı bulunamadı.');
  }

  if (token && payment.iyzicoToken !== token) {
    await writeAuditLog({
      request,
      action: 'payment.callback_token_mismatch',
      entityType: 'payment',
      entityId: payment.id,
      summary: `Ödeme token uyuşmazlığı: #${payment.reservation.confirmationId}`,
    });

    return failureResponse(payment.id, 'Ödeme güvenlik doğrulaması başarısız.');
  }

  if (payment.status === 'paid' && payment.reservation.status === 'confirmed') {
    return renderCallbackPage(await buildSuccessView(payment, payment.reservation));
  }

  try {
    const result = await retrieveCheckoutForm(payment.iyzicoToken, payment.conversationId);
    const paidPrice = Number(result.paidPrice ?? 0);
    const amountMatches = Math.round(paidPrice) === payment.amount;
    const tokenMatches = !result.token || result.token === payment.iyzicoToken;
    const success = result.status === 'success'
      && result.paymentStatus === 'SUCCESS'
      && tokenMatches
      && amountMatches
      && (result.fraudStatus === undefined || result.fraudStatus === 1);

    if (!success) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          iyzicoPaymentId: result.paymentId || undefined,
          errorCode: result.errorCode || undefined,
          errorMessage: result.errorMessage || 'Ödeme iyzico tarafından onaylanmadı.',
          failedAt: new Date(),
        },
      });

      await prisma.reservation.update({
        where: { id: payment.reservationId },
        data: { paymentStatus: 'failed' },
      });

      await writeAuditLog({
        request,
        action: 'payment.failed',
        entityType: 'payment',
        entityId: payment.id,
        summary: `Ödeme başarısız: #${payment.reservation.confirmationId}`,
        after: {
          status: result.status,
          paymentStatus: result.paymentStatus,
          errorCode: result.errorCode,
        },
      });

      return failureResponse(payment.id, 'Ödeme tamamlanamadı. Tekrar deneyebilirsiniz.');
    }

    const shouldSendEmail = payment.reservation.status !== 'confirmed';

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'paid',
          iyzicoPaymentId: result.paymentId || undefined,
          errorCode: null,
          errorMessage: null,
          paidAt: new Date(),
        },
      });

      await tx.reservation.update({
        where: { id: payment.reservationId },
        data: {
          status: 'confirmed',
          paymentStatus: 'paid',
          paymentExpiresAt: null,
        },
      });

      if (payment.reservation.couponCode && payment.reservation.discountAmount > 0) {
        await consumeCoupon(tx, payment.reservation.couponCode, payment.reservation.discountAmount);
      }
    });

    await writeAuditLog({
      request,
      action: 'payment.paid',
      entityType: 'payment',
      entityId: payment.id,
      summary: `Ödeme başarılı ve rezervasyon onaylandı: #${payment.reservation.confirmationId}`,
      after: {
        confirmationId: payment.reservation.confirmationId,
        amount: payment.amount,
        currency: payment.currency,
        iyzicoPaymentId: result.paymentId,
      },
    });

    if (shouldSendEmail) {
      sendReservationConfirmationEmail(payment.reservationId).catch((error) => {
        console.error('Paid reservation confirmation email failed.', error);
      });
    }

    return renderCallbackPage(await buildSuccessView(payment, payment.reservation));
  } catch (error) {
    console.error('Iyzico callback failed.', error);
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'failed',
        errorMessage: 'Ödeme sonucu doğrulanamadı.',
        failedAt: new Date(),
      },
    }).catch(() => null);

    return failureResponse(payment.id, 'Ödeme sonucu doğrulanamadı.');
  }
}

export async function POST(request: NextRequest) {
  return handleCallback(request);
}

export async function GET(request: NextRequest) {
  return handleCallback(request);
}
