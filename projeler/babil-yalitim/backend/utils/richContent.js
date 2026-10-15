const { JSDOM } = require("jsdom");

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeLineBreaks = (value = "") =>
  String(value).replace(/\r\n?/g, "\n").trim();

const LINK_ONLY_BLOCK_RE = /^\[([^\]\n]+)\]\((https?:\/\/.+)\)$/i;

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

const getYouTubeEmbedUrl = (input = "") => {
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

const isUrlOnlyBlock = (block = "") =>
  /^https?:\/\/[^\s<>"']+$/i.test(String(block).trim());

const buildIframe = (embedUrl) =>
  `<iframe src="${embedUrl}" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;

const buildRichContentHtml = (input = "") => {
  const source = normalizeLineBreaks(input);
  if (!source) return "";

  const blocks = source.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

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

const injectHeadingIds = (html = "") => {
  if (!html) return "";

  const dom = new JSDOM(`<body>${html}</body>`);
  const { document } = dom.window;
  const headings = Array.from(document.querySelectorAll("h2, h3"));
  const seen = new Set();

  headings.forEach((node) => {
    const base = node.textContent
      .toLowerCase()
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .replace(/\s+/g, "-") || "bolum";
    let slug = base;
    let index = 2;

    while (seen.has(slug)) {
      slug = `${base}-${index++}`;
    }

    seen.add(slug);
    node.setAttribute("id", slug);
  });

  return document.body.innerHTML;
};

module.exports = {
  buildRichContentHtml,
  getYouTubeEmbedUrl,
  injectHeadingIds,
};
