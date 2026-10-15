import { Link } from "react-router-dom";

function normalize(d) {
  const img =
    (d.image && (d.image.url || d.image.secure_url)) ||
    (typeof d.image === "string" ? d.image : "") ||
    null;

  return {
    id: d._id || d.id,
    title: d.title || "Karar",
    slug: d.slug || "",
    date: d.date || d.publishedAt || "",
    chamber: d.chamber || d.court || "",
    caseNo: d.caseNo || d.esasNo || "",
    decisionNo: d.decisionNo || d.kararNo || "",
    summary: d.summary || "",
    tags: Array.isArray(d.tags) ? d.tags : [],
    image: img,
    imageAlt: d.imageAlt || d.title || "Karar görseli",
  };
}

export default function HomeDecisionItem({ item }) {
  const d = normalize(item);
  const placeholder = "/img/placeholder.png";
  const imgSrc = d.image || placeholder;

  return (
    <article
      className="
        overflow-hidden
        rounded-[var(--radius-2xl)]
        border border-border/60
        bg-surface/80
        shadow-[var(--shadow-soft)]
        transition
        hover:bg-surface-2/80
      "
    >
      {/* Üst şerit (Daire + Tarih) */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2 text-[12px] text-muted">
        <span className="inline-flex items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <path d="M14 5l5 5-9 9H5v-5l9-9z" />
            <path d="M15 6l3 3" />
          </svg>
          {d.chamber || "Daire"}
        </span>
        <time className="rounded border border-border/60 bg-surface px-2 py-0.5">
          {d.date ? new Date(d.date).toLocaleDateString("tr-TR") : "Tarih"}
        </time>
      </div>

      {/* Gövde */}
      <Link to={`/kararlar/${d.slug}`} className="block">
        <div className="relative aspect-[16/9] w-full">
          <img
            src={imgSrc}
            alt={d.imageAlt}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-center transition-transform duration-500 ease-out hover:scale-[1.03]"
          />
        </div>

        <div className="p-4">
          <div className="text-[12px] text-muted">
            {d.caseNo && <span>Esas: {d.caseNo}</span>}
            {d.caseNo && d.decisionNo && <span className="mx-2">•</span>}
            {d.decisionNo && <span>Karar: {d.decisionNo}</span>}
          </div>

          <h3 className="mt-1 line-clamp-2 text-[17px] font-semibold leading-[1.25]">
            {d.title}
          </h3>

          {d.summary && (
            <p className="mt-2 line-clamp-2 text-[14px] text-[color:var(--color-muted)]">
              {d.summary}
            </p>
          )}

          {d.tags.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2 text-[12px] text-muted">
              {d.tags.slice(0, 4).map((t) => (
                <li
                  key={t}
                  className="rounded border border-border/60 bg-surface px-2 py-0.5"
                >
                  {t}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 inline-flex items-center gap-2 text-[13px] text-foreground/85">
            <span>Detaya git</span>
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
          </div>
        </div>
      </Link>
    </article>
  );
}
