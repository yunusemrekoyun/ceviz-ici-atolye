// backend/utils/sanitizeHtml.js
const { JSDOM } = require("jsdom");

// Basit HTML temizleyici: tehlikeli tag/atribütleri kaldırır.
// Ağır bir kütüphane kullanmadan temel XSS yüzeyini daraltır.
// İhtiyaç halinde DOMPurify server-side varyantı tercih edilebilir.
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "blockquote",
  "code",
  "pre",
  "img",
  "a",
  "iframe",
]);

const ALLOWED_ATTRS = {
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "title"],
  iframe: [
    "src",
    "title",
    "allow",
    "allowfullscreen",
    "referrerpolicy",
    "loading",
    "frameborder",
  ],
};

const isAllowedIframeSrc = (value = "") => {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    return (
      (host === "youtube.com" || host === "youtube-nocookie.com") &&
      /^\/embed\/[^/?#]+/i.test(url.pathname)
    );
  } catch {
    return false;
  }
};

function sanitizeHtml(input = "") {
  if (!input || typeof input !== "string") return "";
  const dom = new JSDOM(`<body>${input}</body>`);
  const { document } = dom.window;

  const walker = document.createTreeWalker(document.body, 1 | 4, null);
  const toRemove = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeType === 1) {
      const tag = node.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        toRemove.push(node);
        continue;
      }
      // attrs
      for (const attr of Array.from(node.attributes)) {
        const attrName = attr.name.toLowerCase();
        const allowList = ALLOWED_ATTRS[tag] || [];
        if (!allowList.includes(attrName)) {
          node.removeAttribute(attr.name);
          continue;
        }
        // href/src javascript: temizle
        const val = attr.value || "";
        if (/^javascript:/i.test(val)) {
          node.removeAttribute(attr.name);
        }
        if (tag === "iframe" && attrName === "src" && !isAllowedIframeSrc(val)) {
          toRemove.push(node);
        }
        if (attrName === "target" && val === "_self") {
          // izin ver
        }
        if (attrName === "rel" && !val) {
          node.setAttribute("rel", "noopener noreferrer");
        }
      }
      if (tag === "a" && !node.getAttribute("rel")) {
        node.setAttribute("rel", "noopener noreferrer");
      }
    }
  }

  toRemove.forEach((n) => n.remove());
  return document.body.innerHTML;
}

module.exports = sanitizeHtml;
