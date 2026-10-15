// src/components/articles/ArticleItem.jsx
import { Link } from "react-router-dom";

// Göreli görsel URL'lerini tam yola çevirir (ayrı dosya yok)
function resolveUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  const path = String(url).replace(/^\/+/, "");
  return base ? `${base}/${path}` : `/${path}`;
}

function normalize(item) {
  const rawImg =
    (item.image && (item.image.url || item.image.secure_url)) ||
    (typeof item.image === "string" ? item.image : "") ||
    item.cover ||
    null;

  return {
    id: item._id || item.id,
    title: item.title || item.heading || "Başlık",
    excerpt: item.summary || item.excerpt || "",
    date: item.publishedAt || item.date || "",
    tags: Array.isArray(item.tags) ? item.tags : [],
    slug: item.slug || "",
    image: resolveUrl(rawImg),
    imageAlt: item.imageAlt || item.alt || item.title || "",
  };
}

export default function ArticleItem({ item }) {
  const a = normalize(item);

  // ✅ placeholder path
  const placeholder = "/img/placeholder.png";
  const imgSrc = a.image || placeholder;

  return (
    <article
      className="
        overflow-hidden
        rounded-[var(--radius-2xl)]
        border border-border/60
        bg-surface
        shadow hover:shadow-lg transition-shadow
      "
    >
      <Link to={`/makaleler/${a.slug}`} className="block">
        {/* KAPAK: 16:9 sabit kutu */}
        <div className="relative aspect-[16/9] w-full bg-muted/10 flex items-center justify-center">
          <img
            src={imgSrc}
            alt={a.imageAlt || a.title}
            loading="lazy"
            decoding="async"
            className="max-h-full max-w-full object-contain"
          />

          {/* Tarih etiketi */}
          <div className="pointer-events-none absolute right-3 top-3">
            <time
              dateTime={a.date}
              className="rounded border border-border/60 bg-surface/90 px-2 py-0.5 text-xs text-muted backdrop-blur"
            >
              {a.date
                ? new Date(a.date).toLocaleDateString("tr-TR")
                : "Tarih yakında"}
            </time>
          </div>
        </div>
      </Link>

      {/* İÇ GÖVDE */}
      <div className="p-4">
        {a.tags.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-[11px] md:text-xs text-muted">
            {a.tags.map((t) => (
              <li
                key={t}
                className="rounded border border-border/60 bg-surface px-2 py-0.5"
              >
                {t}
              </li>
            ))}
          </ul>
        )}

        <h3 className="mt-2 text-base md:text-lg font-semibold leading-[1.25]">
          <Link to={`/makaleler/${a.slug}`} className="hover:underline">
            {a.title}
          </Link>
        </h3>

        {a.excerpt && (
          <p className="mt-2 line-clamp-2 md:line-clamp-3 text-xs md:text-sm leading-[1.7] text-[color:var(--color-muted)]">
            {a.excerpt}
          </p>
        )}

        <div className="mt-3 flex justify-between items-center">
          <span className="text-[11px] md:text-xs text-foreground/70"></span>
          <Link
            to={`/makaleler/${a.slug}`}
            className="text-sm font-medium text-[color:var(--color-accent)] hover:underline"
          >
            Devam →
          </Link>
        </div>
      </div>
    </article>
  );
}
