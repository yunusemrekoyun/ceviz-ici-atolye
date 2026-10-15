// src/components/HomeDecisions.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DecisionAPI } from "../lib/api";
import HomeDecisionItem from "./HomeDecisionItem";

export default function HomeDecisions() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setBusy(true);
      setErr("");
      try {
        const data = await DecisionAPI.list(); // /api/decisions
        if (alive) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (alive) setErr(e.message || "Kararlar yüklenemedi");
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const latest3 = useMemo(() => {
    const sorted = [...items].sort(
      (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
    );
    return sorted.slice(0, 3);
  }, [items]);

  return (
    <section
      id="kararlar"
      className="section-y border-t border-border/50"
      aria-labelledby="home-decisions-title"
    >
      <div className="container-x">
        {/* Header + sağ üst CTA */}
        <header className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[12px] tracking-[0.18em] text-muted">
              YARGITAY KARARLARI
            </div>
            <h2
              id="home-decisions-title"
              className="mt-1 font-semibold tracking-[-0.01em] text-[26px] sm:text-[28px] md:text-[32px]"
            >
              Öne Çıkan Son Kararlar
            </h2>
            <p className="mt-2 max-w-2xl text-[14px] sm:text-[14.5px] text-foreground/80">
              Son içtihatlardan seçkiler. Tam listeye kararlar sayfasından
              ulaşabilirsiniz.
            </p>
          </div>

          <Link
            to="/kararlar"
            className="inline-flex items-center gap-2 self-start rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-2 text-[14px] font-medium hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-accent/30 md:self-auto"
          >
            Tüm Kararlar
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
        </header>

        {/* Liste */}
        <div className="mt-6">
          {busy ? (
            <div
              role="status"
              aria-live="polite"
              className="min-h-[120px] rounded-[var(--radius-2xl)] border border-border/60 bg-surface/70 p-6"
            >
              Yükleniyor…
            </div>
          ) : err ? (
            <div className="min-h-[120px] rounded-[var(--radius-2xl)] border border-red-500/40 bg-red-500/10 p-6 text-red-200">
              {err}
            </div>
          ) : latest3.length === 0 ? (
            <div className="min-h-[120px] rounded-[var(--radius-2xl)] border border-border/60 bg-surface/70 p-6">
              Henüz yayınlanmış karar yok.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {latest3.map((it) => (
                <HomeDecisionItem key={it._id || it.slug} item={it} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
