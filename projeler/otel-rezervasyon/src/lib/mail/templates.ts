export interface MailAction {
  label: string;
  url: string;
}

export interface BrandedMailInput {
  title: string;
  preview?: string;
  intro: string;
  lines?: string[];
  action?: MailAction;
  footer?: string;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderLines(lines: string[] = []) {
  return lines.map((line) => `<p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.7;">${escapeHtml(line)}</p>`).join('');
}

export function renderBrandedMail(input: BrandedMailInput) {
  const text = [
    input.title,
    '',
    input.intro,
    ...(input.lines ?? []),
    input.action ? `${input.action.label}: ${input.action.url}` : '',
    input.footer ?? '',
  ]
    .filter(Boolean)
    .join('\n');

  const preview = input.preview ? escapeHtml(input.preview) : escapeHtml(input.intro);
  const action = input.action
    ? `<a href="${escapeHtml(input.action.url)}" style="display:inline-block;margin-top:6px;padding:12px 18px;border-radius:8px;background:#0f172a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">${escapeHtml(input.action.label)}</a>`
    : '';

  const html = `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preview}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:#0f172a;color:#ffffff;">
                <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#cbd5e1;">Kütahya Garden Otel</div>
                <h1 style="margin:8px 0 0;font-size:24px;line-height:1.25;">${escapeHtml(input.title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.7;">${escapeHtml(input.intro)}</p>
                ${renderLines(input.lines)}
                ${action}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.6;">
                ${escapeHtml(input.footer ?? 'Bu e-posta Kütahya Garden Otel sistemi tarafından otomatik gönderilmiştir.')}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { html, text };
}
