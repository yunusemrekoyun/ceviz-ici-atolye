// src/components/articles/Articles.jsx
import { useEffect, useMemo, useState } from "react";
import { ArticleAPI } from "../../lib/api";
import ArticleItem from "./ArticleItem";

export default function Articles() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setBusy(true);
      setErr("");
      try {
        const data = await ArticleAPI.list(); // /api/articles
        if (alive) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (alive) setErr(e.message || "Makaleler yüklenemedi");
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
      ),
    [items]
  );

  if (busy) {
    return (
      <div className="rounded-[var(--radius-2xl)] border border-border/60 bg-surface/70 p-6">
        Yükleniyor…
      </div>
    );
  }
  if (err) {
    return (
      <div className="rounded-[var(--radius-2xl)] border border-red-500/40 bg-red-500/10 p-6 text-red-200">
        {err}
      </div>
    );
  }
  if (sorted.length === 0) {
    return (
      <div className="rounded-[var(--radius-2xl)] border border-border/60 bg-surface/70 p-6">
        Henüz yayınlanmış makale yok.
      </div>
    );
  }

  return (
    // DecisionPage’in grid’i ile aynı: 1 → 2 → 3 sütun, benzer gap
    <div className="grid grid-cols-1 gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((item) => (
        <ArticleItem key={item._id || item.slug} item={item} />
      ))}
    </div>
  );
}