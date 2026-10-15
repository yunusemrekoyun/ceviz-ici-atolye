import { useEffect, useState, useMemo } from "react";
import { ArticleAPI } from "../../lib/api";
import AdminArticleItem from "../components/AdminArticleItem";
import AdminArticleForm from "../components/AdminArticleForm";
import AdminTopBar from "../components/AdminTopBar";

export default function AdminArticlesPage() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");
  const [modal, setModal] = useState({ open: false, initial: null }); // initial=null => create

  const load = async () => {
    setBusy(true);
    setErr("");
    try {
      const data = await ArticleAPI.list();
      setItems(data || []);
    } catch (e) {
      setErr(e.message || "Liste alınamadı");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => {
    return [...items].sort(
      (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
    );
  }, [items]);

  const onCreate = () => setModal({ open: true, initial: null });
  const onEdit = async (article) => {
    try {
      const full = await ArticleAPI.detail(article.slug);
      setModal({ open: true, initial: full });
    } catch (e) {
      alert(e.message || "Makale detayı alınamadı");
    }
  };
  const onClose = () => setModal({ open: false, initial: null });

  const onSaved = () => {
    onClose();
    load();
  };

  const onDelete = async (article) => {
    if (!confirm(`"${article.title}" silinsin mi?`)) return;
    try {
      await ArticleAPI.remove(article.slug);
      await load();
    } catch (e) {
      alert(e.message || "Silme başarısız");
    }
  };

  return (
    <div className="min-h-dvh bg-bg text-foreground">
      <div className="container-x section-y">
        <AdminTopBar />

        {/* Üst bar */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-semibold">Makaleler</h1>
            <p className="text-[13.5px] text-muted">
              Oluştur, güncelle, sil ve listele.
            </p>
          </div>
          <button
            onClick={onCreate}
            className="rounded-[var(--radius-lg)] px-4 py-2 text-[14px] font-semibold text-black shadow-[var(--shadow-soft)] ring-1 transition-opacity hover:opacity-95"
            style={{ backgroundImage: "var(--gradient-accent)" }}
          >
            + Yeni Makale
          </button>
        </div>

        {/* İçerik */}
        {busy ? (
          <div className="rounded-[var(--radius-2xl)] border border-border/60 bg-surface/70 p-6">
            Yükleniyor…
          </div>
        ) : err ? (
          <div className="rounded-[var(--radius-2xl)] border border-red-500/40 bg-red-500/10 p-6 text-red-200">
            {err}
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-[var(--radius-2xl)] border border-border/60 bg-surface/70 p-6">
            Henüz makale yok.{" "}
            <button onClick={onCreate} className="underline">
              Hemen ekle
            </button>
            .
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {sorted.map((it) => (
              <AdminArticleItem
                key={it.slug}
                article={it}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}

        {/* Modal (create/update) */}
        {modal.open && (
          <AdminArticleForm
            initial={modal.initial}
            onClose={onClose}
            onSaved={onSaved}
          />
        )}
      </div>
    </div>
  );
}
