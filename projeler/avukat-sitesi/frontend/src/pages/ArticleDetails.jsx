// src/pages/ArticleDetail.jsx
import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArticleAPI } from "../lib/api";
import { coerceToHtml } from "../lib/richText";

// NOTE: Göreli URL -> tam URL
function resolveUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  const path = String(url).replace(/^\/+/, "");
  return base ? `${base}/${path}` : `/${path}`;
}

export default function ArticleDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [article, setArticle] = useState(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setBusy(true);
      setErr("");
      try {
        const data = await ArticleAPI.detail(slug); // /api/articles/:slug
        if (!alive) return;
        setArticle(data || null);
        if (data?.title) document.title = `${data.title} | Suphi Veysanoğlu`;
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (e) {
        if (alive) setErr(e.message || "İçerik bulunamadı");
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  if (busy) {
    return (
      <section className="section-y">
        <div className="container-x">
          <div className="rounded-[var(--radius-2xl)] border border-border/60 bg-surface-2/70 p-6">
            Yükleniyor…
          </div>
        </div>
      </section>
    );
  }

  if (err || !article) {
    return (
      <section className="section-y">
        <div className="container-x">
          <div className="rounded-[var(--radius-2xl)] border border-border/60 bg-surface-2/70 p-6">
            <h1 className="text-md font-semibold">İçerik bulunamadı</h1>
            <p className="mt-2 text-sm text-muted">
              Aradığınız makale kaldırılmış ya da adresi değişmiş olabilir.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => navigate(-1)}
                className="rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-1.5 text-sm"
              >
                Geri dön
              </button>
              <Link
                to="/makaleler"
                className="rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-1.5 text-sm"
              >
                Tüm makaleler
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const rawImg =
    (article.image && (article.image.url || article.image.secure_url)) ||
    (typeof article.image === "string" ? article.image : "");
  const img = resolveUrl(rawImg); // NOTE: URL normalize

  return (
    <article className="section-y">
      <div className="container-x">
        {/* Breadcrumb */}
        <nav className="mb-4 text-xs text-muted">
          <Link className="hover:underline" to="/">
            Ana sayfa
          </Link>
          <span className="mx-2 opacity-60">/</span>
          <Link className="hover:underline" to="/makaleler">
            Makaleler
          </Link>
          <span className="mx-2 opacity-60">/</span>
          <span className="text-foreground/90">{article.title}</span>
        </nav>

        {/* Başlık */}
        <header className="mb-5">
          <h1 className="text-[30px] md:text-[34px] font-semibold tracking-[-0.01em]">
            {article.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
            <time
              dateTime={article.publishedAt}
              className="rounded border border-border/60 bg-surface px-2 py-0.5"
            >
              {article.publishedAt
                ? new Date(article.publishedAt).toLocaleDateString("tr-TR")
                : "Tarih yakında"}
            </time>
            {Array.isArray(article.tags) && article.tags.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {article.tags.map((t) => (
                  <li
                    key={t}
                    className="rounded border border-border/60 bg-surface px-2 py-0.5"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </header>

        {/* Kapak görseli — %75 genişlikte, 16:9 kutuda, contain */}
        {img && (
          <div className="mb-6 flex justify-center">
            <div className="w-3/4 overflow-hidden rounded-[var(--radius-2xl)] ring-1 ring-[color:var(--color-accent)]/30 shadow-[var(--shadow-soft)]">
              <div className="aspect-[16/9] bg-[color:var(--color-surface)]/40 flex items-center justify-center">
                <img
                  src={img}
                  alt={article.imageAlt || article.title}
                  className="max-h-full max-w-full object-contain"
                  loading="eager"
                  decoding="async"
                />
              </div>
            </div>
          </div>
        )}

        {/* İçerik gövdesi (HTML) — uzun metinler taşmasın */}
        <div
          className="
            prose prose-invert max-w-none
            break-words 
            prose-p:my-4 prose-li:my-1 prose-headings:mt-6
            prose-a:text-[color:var(--color-accent)]
          "
          dangerouslySetInnerHTML={{
            __html: coerceToHtml(article.content || ""),
          }}
        />

        {/* Alt aksiyonlar */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/makaleler"
            className="rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-1.5 text-sm"
          >
            ← Tüm makaleler
          </Link>
        </div>
      </div>
    </article>
  );
}
