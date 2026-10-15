import { useEffect, useMemo, useState } from "react";
import { DecisionAPI } from "../../lib/api";
import AdminDecisionItem from "../components/AdminDecisionItem";
import AdminDecisionForm from "../components/AdminDecisionForm";
import AdminTopBar from "../components/AdminTopBar";

export default function AdminDecisionsPage() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");
  const [modal, setModal] = useState({ open: false, initial: null }); // null => create

  const load = async () => {
    setBusy(true);
    setErr("");
    try {
      const data = await DecisionAPI.list();
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
    // önce tarih (karar tarihi), sonra createdAt
    return [...items].sort(
      (a, b) =>
        new Date(b.date || b.createdAt || 0) -
        new Date(a.date || a.createdAt || 0)
    );
  }, [items]);

  const onCreate = () => setModal({ open: true, initial: null });
  const onEdit = async (d) => {
    try {
      const full = await DecisionAPI.detail(d.slug);
      setModal({ open: true, initial: full });
    } catch (e) {
      alert(e.message || "Kayıt detayı alınamadı");
    }
  };
  const onClose = () => setModal({ open: false, initial: null });

  const onSaved = () => {
    onClose();
    load();
  };

  const onDelete = async (d) => {
    if (!confirm(`"${d.title}" silinsin mi?`)) return;
    try {
      await DecisionAPI.remove(d.slug);
      await load();
    } catch (e) {
      alert(e.message || "Silme başarısız");
    }
  };

  return (
    <div className="min-h-dvh bg-bg text-foreground">
      <div className="container-x section-y">
        <AdminTopBar />

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-semibold">Yargıtay Kararları</h1>
            <p className="text-[13.5px] text-muted">
              Oluştur, güncelle, sil ve listele.
            </p>
          </div>
          <button
            onClick={onCreate}
            className="rounded-[var(--radius-lg)] px-4 py-2 text-[14px] font-semibold text-black shadow-[var(--shadow-soft)] ring-1 transition-opacity hover:opacity-95"
            style={{ backgroundImage: "var(--gradient-accent)" }}
          >
            + Yeni Karar
          </button>
        </div>

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
            Henüz kayıt yok.{" "}
            <button onClick={onCreate} className="underline">
              Hemen ekle
            </button>
            .
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {sorted.map((it) => (
              <AdminDecisionItem
                key={it.slug}
                decision={it}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}

        {modal.open && (
          <AdminDecisionForm
            initial={modal.initial}
            onClose={onClose}
            onSaved={onSaved}
          />
        )}
      </div>
    </div>
  );
}
