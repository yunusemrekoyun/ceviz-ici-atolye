// src/pages/DecisionDetail.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { DecisionAPI } from "../lib/api";
import { coerceToHtml } from "../lib/richText";

// NOTE: Ayrı dosya olmadan görsel URL çözümleyici:
function resolveUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  const path = String(url).replace(/^\/+/, "");
  return base ? `${base}/${path}` : `/${path}`;
}

export default function DecisionDetail() {
  const { slug } = useParams();
  const nav = useNavigate();

  const [decision, setDecision] = useState(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await DecisionAPI.detail(slug);
        if (!alive) return;
        setDecision(data);
        if (data?.title) document.title = `${data.title} | Yargıtay Kararları`;
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (e) {
        if (alive) setErr(e.message || "Karar bulunamadı");
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  if (busy) return <div className="p-6">Yükleniyor…</div>;
  if (err || !decision)
    return (
      <div className="p-6">
        <h1 className="text-md font-semibold">İçerik bulunamadı</h1>
        <button onClick={() => nav(-1)} className="mt-3 text-sm underline">
          Geri dön
        </button>
      </div>
    );

  // NOTE: Kapak görselini güvenle çöz
  const coverSrc = resolveUrl(
    decision?.image?.url ||
      decision?.image ||
      decision?.imageUrl ||
      decision?.cover
  );

  return (
    <article className="section-y">
      <div className="container-x">
        {/* Breadcrumb */}
        <nav className="mb-4 text-xs text-muted">
          <Link to="/" className="hover:underline">
            Ana sayfa
          </Link>
          <span className="mx-2">/</span>
          <Link to="/kararlar" className="hover:underline">
            Yargıtay Kararları
          </Link>
          <span className="mx-2">/</span>
          <span>{decision.title}</span>
        </nav>

        <header className="mb-6">
          <h1 className="text-[28px] md:text-[32px] font-bold">
            {decision.title}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {decision.daire} • Esas {decision.esasNo} • Karar {decision.kararNo}{" "}
            •{" "}
            {decision.date
              ? new Date(decision.date).toLocaleDateString("tr-TR")
              : ""}
          </p>
        </header>

        {/* Kapak görseli — Makale Detay ile aynı görünüm (%75, 16:9, altın/accent ring) */}
        {coverSrc && (
          <div className="mb-6 flex justify-center">
            <div className="w-3/4 overflow-hidden rounded-[var(--radius-2xl)] ring-1 ring-[color:var(--color-accent)]/30 shadow-[var(--shadow-soft)]">
              <div className="aspect-[16/9] w-full bg-[color:var(--color-surface)]/40 flex items-center justify-center">
                <img
                  src={coverSrc}
                  alt={decision.imageAlt || decision.title}
                  loading="eager"
                  decoding="async"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>
          </div>
        )}

        {/* İçerik (HTML içindeki img'ler de taşmasın) */}
        <div
          className="
            prose prose-invert max-w-none
            break-words 
            prose-p:my-4 prose-li:my-1 prose-headings:mt-6
            prose-a:text-[color:var(--color-accent)]
            prose-img:my-4 prose-img:rounded-xl prose-img:w-full prose-img:h-auto
            prose-img:max-h-[70vh] prose-img:object-contain
          "
          dangerouslySetInnerHTML={{
            __html: coerceToHtml(decision.content || ""),
          }}
        />

        {/* Alt aksiyon */}
        <div className="mt-8 flex gap-4">
          <Link
            to="/kararlar"
            className="inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white/5 px-3 py-1.5 text-sm font-medium text-white hover:bg-white hover:text-foreground transition"
          >
            ← Tüm Kararlar
          </Link>
        </div>
      </div>
    </article>
  );
}
