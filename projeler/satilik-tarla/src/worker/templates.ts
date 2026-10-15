// Markalı e-posta şablonu — tablo tabanlı, inline stil (e-posta istemcisi
// uyumluluğu). Palet: koyu çam başlık bandı, fildişi gövde, pirinç CTA.
const PINE = '#1f2a1d';
const PINE_SOFT = '#3d5638';
const IVORY = '#f5f2e9';
const BRASS = '#a8742c';
const INK = '#26231c';
const MUTED = '#6b6558';

export function renderEmail({
  heading,
  body,
  ctaUrl,
  ctaLabel,
}: {
  heading: string;
  body: string;
  ctaUrl?: string;
  ctaLabel?: string;
}): string {
  const cta =
    ctaUrl && ctaLabel
      ? `<tr><td style="padding:8px 32px 28px">
           <a href="${ctaUrl}" style="display:inline-block;background:${BRASS};color:#211505;text-decoration:none;font-weight:600;font-size:15px;padding:13px 28px;border-radius:4px">${ctaLabel}</a>
         </td></tr>`
      : '';
  return `<!doctype html>
<html lang="tr"><body style="margin:0;padding:0;background:${IVORY}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${IVORY};padding:24px 12px">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e4ded1;border-radius:8px;overflow:hidden">
      <tr><td style="background:${PINE};padding:20px 32px">
        <span style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#faf7ef">Kütahya Satılık Tarla</span>
      </td></tr>
      <tr><td style="padding:28px 32px 8px">
        <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.3;color:${PINE_SOFT}">${heading}</h1>
      </td></tr>
      <tr><td style="padding:12px 32px 24px">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:${INK}">${body}</div>
      </td></tr>
      ${cta}
      <tr><td style="padding:16px 32px;border-top:1px solid #ece7da">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${MUTED}">Bu e-posta kutahyasatiliktarla.com tarafından gönderildi.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

/** Basit metni güvenli HTML paragraflarına çevirir. */
export function textToHtml(text: string): string {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

/** Etiket/değer çiftlerini e-posta içi tabloya çevirir (lead bildirimi). */
export function kvTable(rows: [string, string][]): string {
  const tr = rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr>
          <td style="padding:7px 14px 7px 0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${MUTED};white-space:nowrap;vertical-align:top">${k}</td>
          <td style="padding:7px 0;font-size:15px;color:${INK}">${v
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')}</td>
        </tr>`,
    )
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="border-top:1px solid #ece7da;margin-top:4px">${tr}</table>`;
}
