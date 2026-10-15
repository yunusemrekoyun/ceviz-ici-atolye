// src/lib/richText.js
export function isLikelyHTML(s = "") {
  // çok basit bir tespit: <tag> görüyor muyuz?
  return /<\/?[a-z][\s\S]*>/i.test(s);
}

export function escapeHtml(s = "") {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function textToHtmlParagraphs(s = "") {
  // 1) HTML'e kaçır
  const safe = escapeHtml(s.trim());
  if (!safe) return "";

  // 2) \r\n normalle
  const norm = safe.replace(/\r\n/g, "\n");

  // 3) çift satır sonunu <p> bloklarına çevir
  const blocks = norm.split(/\n{2,}/).map((block) => {
    // tek satır sonlarını <br> yap
    const withBr = block.replace(/\n/g, "<br>");
    return `<p>${withBr}</p>`;
  });

  return blocks.join("\n");
}

export function coerceToHtml(s = "") {
  // Eğer kullanıcı HTML yazmışsa aynen bas; değilse paragraflaştır
  return isLikelyHTML(s) ? s : textToHtmlParagraphs(s);
}
