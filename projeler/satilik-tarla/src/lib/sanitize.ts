import sanitize from 'sanitize-html';

/** Zengin editörden gelen HTML sunucuda temizlenir — yalnız admin yazsa da
 * savunma katmanı ucuz. İzin listesi editör araç çubuğuyla birebir. */
export function sanitizeRichHtml(html: string): string {
  return sanitize(html, {
    allowedTags: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'h2',
      'h3',
      'h4',
      'ul',
      'ol',
      'li',
      'blockquote',
      'hr',
      'a',
      'img',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesAppliedToAttributes: ['href'],
    // img src yalnız kendi medyamız ya da https
    transformTags: {
      a: sanitize.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
    },
    exclusiveFilter: (frame) =>
      frame.tag === 'img' &&
      !(
        String(frame.attribs.src ?? '').startsWith('/m/') ||
        String(frame.attribs.src ?? '').startsWith('https://')
      ),
  });
}

/** Gövde HTML mi, eski düz metin mi? (Geçiş dönemi toleransı.) */
export function isRichHtml(body: string): boolean {
  return /^\s*</.test(body);
}
