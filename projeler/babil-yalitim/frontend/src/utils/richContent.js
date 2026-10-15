const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeLineBreaks = (value = "") =>
  String(value).replace(/\r\n?/g, "\n").trim();

const decodeHtmlEntities = (value = "") =>
  String(value)
    .replace(/&#(\d+);/g, (_, code) => {
      const numeric = Number.parseInt(code, 10);
      return Number.isNaN(numeric) ? _ : String.fromCodePoint(numeric);
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      const numeric = Number.parseInt(code, 16);
      return Number.isNaN(numeric) ? _ : String.fromCodePoint(numeric);
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

const stripTags = (value = "") => String(value).replace(/<[^>]+>/g, "");

const LINK_ONLY_BLOCK_RE = /^\[([^\]\n]+)\]\((https?:\/\/.+)\)$/i;
const SIMPLE_EDIT_TAGS = new Set(["p", "br", "a", "iframe"]);

const buildLinkBlock = (label, url) => {
  const safeUrl = escapeHtml(url);
  const safeLabel = escapeHtml(label);
  return `<p><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeLabel}</a></p>`;
};

const parseLinkOnlyBlock = (block = "") => {
  const match = normalizeLineBreaks(block).match(LINK_ONLY_BLOCK_RE);
  if (!match) return null;

  const [, rawLabel, rawUrl] = match;
  const label = rawLabel.trim();
  const url = rawUrl.trim();
  if (!label || !url) return null;
  return { label, url };
};

const serializeEditableLink = (href = "", text = "") => {
  const cleanHref = decodeHtmlEntities(href).trim();
  const cleanText = decodeHtmlEntities(stripTags(text)).trim();
  if (!cleanHref) return "";
  return !cleanText || cleanText === cleanHref
    ? cleanHref
    : `[${cleanText}](${cleanHref})`;
};

const toEditableParagraph = (block = "") => {
  const inner = block
    .replace(/^<p\b[^>]*>/i, "")
    .replace(/<\/p>$/i, "")
    .trim();

  if (!inner) return "";

  const anchorOnlyMatch = inner.match(
    /^<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>$/i
  );
  if (anchorOnlyMatch) {
    return serializeEditableLink(anchorOnlyMatch[1], anchorOnlyMatch[2]);
  }

  const normalized = inner.replace(/<br\s*\/?>/gi, "\n").trim();
  if (/<\/?[a-z][\s\S]*>/i.test(normalized)) return null;

  return decodeHtmlEntities(normalized)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .trim();
};

const toEditableIframe = (block = "") => {
  const src = block.match(/<iframe\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i)?.[1];
  return src ? decodeHtmlEntities(src).trim() : null;
};

export const toPlainRichContent = (input = "") => {
  const source = normalizeLineBreaks(input);
  if (!source) return "";

  return decodeHtmlEntities(
    source
      .replace(
        /<iframe\b[^>]*\bsrc=["']([^"']+)["'][^>]*>[\s\S]*?<\/iframe>/gi,
        (_, src) => `\n${src}\n`
      )
      .replace(
        /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
        (_, href, text) => {
          const label = decodeHtmlEntities(stripTags(text))
            .replace(/\s+/g, " ")
            .trim();
          const url = decodeHtmlEntities(href).trim();
          return label || url;
        }
      )
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<(li)\b[^>]*>/gi, "• ")
      .replace(/<\/(p|div|section|article|blockquote|li|ul|ol|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
};

export const toRichContentExcerpt = (input = "", maxLen = 160) => {
  const text = toPlainRichContent(input)
    .replace(/\s*\n+\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";
  return text.length <= maxLen
    ? text
    : `${text.slice(0, maxLen - 1).trimEnd()}…`;
};

export const getYouTubeEmbedUrl = (input = "") => {
  const value = String(input || "").trim();
  if (!value) return "";

  const iframeMatch = value.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  const candidate = iframeMatch?.[1] || value;

  try {
    const url = new URL(candidate);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();

    if (host === "youtu.be") {
      const id = url.pathname.replace(/\//g, "").trim();
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : "";
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v");
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : "";
      }

      const shortsMatch = url.pathname.match(/^\/shorts\/([^/?#]+)/i);
      if (shortsMatch?.[1]) {
        return `https://www.youtube-nocookie.com/embed/${shortsMatch[1]}`;
      }

      const embedMatch = url.pathname.match(/^\/embed\/([^/?#]+)/i);
      if (embedMatch?.[1]) {
        return `https://www.youtube-nocookie.com/embed/${embedMatch[1]}`;
      }
    }

    if (host === "youtube-nocookie.com") {
      const embedMatch = url.pathname.match(/^\/embed\/([^/?#]+)/i);
      if (embedMatch?.[1]) {
        return `https://www.youtube-nocookie.com/embed/${embedMatch[1]}`;
      }
    }
  } catch {
    return "";
  }

  return "";
};

export const isUrlOnlyBlock = (block = "") =>
  /^https?:\/\/[^\s<>"']+$/i.test(String(block).trim());

const buildIframe = (embedUrl) =>
  `<iframe src="${embedUrl}" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;

export const buildRichContentHtml = (input = "") => {
  const source = normalizeLineBreaks(input);
  if (!source) return "";

  const blocks = source
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks
    .map((block) => {
      const embedUrl = getYouTubeEmbedUrl(block);
      if (embedUrl) return buildIframe(embedUrl);

      const linkOnlyBlock = parseLinkOnlyBlock(block);
      if (linkOnlyBlock) {
        return buildLinkBlock(linkOnlyBlock.label, linkOnlyBlock.url);
      }

      if (isUrlOnlyBlock(block)) {
        return buildLinkBlock(block, block);
      }

      if (/<\/?[a-z][\s\S]*>/i.test(block)) {
        return block;
      }

      return `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`;
    })
    .join("\n");
};

export const toEditableRichContent = (input = "") => {
  const source = normalizeLineBreaks(input);
  if (!source || !/<\/?[a-z][\s\S]*>/i.test(source)) return source;

  const tags = Array.from(source.matchAll(/<\/?([a-z][a-z0-9-]*)\b/gi)).map(
    (match) => match[1].toLowerCase()
  );

  if (tags.some((tag) => !SIMPLE_EDIT_TAGS.has(tag))) {
    return source;
  }

  const blockPattern = /<p\b[^>]*>[\s\S]*?<\/p>|<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi;
  const blocks = source.match(blockPattern);
  if (!blocks?.length) return source;

  const remainder = source.replace(blockPattern, "").replace(/\s+/g, "");
  if (remainder) return source;

  const editableBlocks = [];

  for (const block of blocks) {
    const nextValue = /^<iframe\b/i.test(block)
      ? toEditableIframe(block)
      : toEditableParagraph(block);

    if (nextValue === null) {
      return source;
    }

    if (nextValue) {
      editableBlocks.push(nextValue);
    }
  }

  return editableBlocks.join("\n\n").trim();
};
