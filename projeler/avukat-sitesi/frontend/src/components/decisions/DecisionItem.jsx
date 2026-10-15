import { Link } from "react-router-dom";

// URL düzeltici (ayrı dosya yok)
function resolveUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  const path = String(url).replace(/^\/+/, "");
  return base ? `${base}/${path}` : `/${path}`;
}

export default function DecisionItem({ item }) {
  const coverSrc =
    resolveUrl(
      item?.image?.url || item?.image || item?.imageUrl || item?.cover
    ) || null;

  // ✅ placeholder
  const placeholder = "/img/placeholder.png";
  const imgSrc = coverSrc || placeholder;

  return (
    <article className="rounded-[var(--radius-2xl)] border border-border/60 bg-surface shadow hover:shadow-lg transition-shadow overflow-hidden">
      {/* KART KAPAĞI — TIKLANABİLİR (DETAYA GÖTÜRÜR) */}
      <Link
        to={`/kararlar/${item.slug}`}
        aria-label={(item?.title || "Karar") + " detayına git"}
        className="block group"
      >
        <div className="aspect-[16/9] bg-muted/10 flex items-center justify-center overflow-hidden">
          <img
            src={imgSrc}
            alt={item.title || "Karar görseli"}
            loading="lazy"
            decoding="async"
            className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
      </Link>

      <div className="p-4 md:p-4">
        <div className="flex justify-between items-center text-[11px] md:text-xs text-muted mb-2">
          <span>{item.daire}</span>
          <time dateTime={item.date}>
            {item.date ? new Date(item.date).toLocaleDateString("tr-TR") : ""}
          </time>
        </div>

        <h3 className="text-base md:text-lg font-semibold mb-1.5">
          {item.title}
        </h3>

        <p className="line-clamp-2 md:line-clamp-3 text-xs md:text-sm text-muted">
          {item.summary}
        </p>

        <div className="mt-3 flex justify-between items-center">
          <span className="text-[11px] md:text-xs text-foreground/70">
            Esas: {item.esasNo} • Karar: {item.kararNo}
          </span>
          <Link
            to={`/kararlar/${item.slug}`}
            className="text-sm font-medium text-[color:var(--color-accent)] hover:underline"
          >
            Detay →
          </Link>
        </div>
      </div>
    </article>
  );
}
