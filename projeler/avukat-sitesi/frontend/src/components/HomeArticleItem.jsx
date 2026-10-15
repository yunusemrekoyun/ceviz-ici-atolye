import { Link } from "react-router-dom";

function normalize(item) {
  const img =
    (item.image && (item.image.url || item.image.secure_url)) ||
    (typeof item.image === "string" ? item.image : "") ||
    null;

  return {
    id: item._id || item.id,
    title: item.title || "Başlık",
    summary: item.summary || "",
    date: item.publishedAt || "",
    tags: Array.isArray(item.tags) ? item.tags : [],
    slug: item.slug || "",
    image: img,
    imageAlt: item.imageAlt || item.title || "",
  };
}

export default function HomeArticleItem({ item }) {
  const a = normalize(item);
  const placeholder = "/img/placeholder.png";
  const imgSrc = a.image || placeholder;

  return (
    <article
      className="
        overflow-hidden rounded-[var(--radius-2xl)]
        border border-border/60
        bg-[color:var(--color-surface-2)]/80
        shadow-[var(--shadow-soft)]
        transition-colors hover:bg-[color:var(--color-surface-2)]/95
      "
    >
      <Link to={`/makaleler/${a.slug}`} className="block">
        <div className="relative aspect-[16/9] w-full">
          <img
            src={imgSrc}
            alt={a.imageAlt || a.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-center transition-transform duration-500 ease-out hover:scale-[1.03]"
          />

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

      <div className="p-4">
        {a.tags.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-xs text-muted">
            {a.tags.slice(0, 3).map((t) => (
              <li
                key={t}
                className="rounded border border-border/60 bg-surface px-2 py-0.5"
              >
                {t}
              </li>
            ))}
          </ul>
        )}

        <h3 className="mt-3 text-[16px] font-semibold leading-[1.25]">
          <Link to={`/makaleler/${a.slug}`} className="hover:underline">
            {a.title}
          </Link>
        </h3>

        {a.summary && (
          <p className="mt-2 line-clamp-3 text-[13.5px] leading-6 text-[color:var(--color-muted)]">
            {a.summary}
          </p>
        )}

        <div className="mt-3">
          <Link
            to={`/makaleler/${a.slug}`}
            className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-2"
          >
            Devamını oku
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="M13 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}
