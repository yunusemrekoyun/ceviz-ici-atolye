import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api";
import ToastAlert from "../../components/ui/ToastAlert";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

export default function AnnouncementBarPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [form, setForm] = useState({
    enabled: false,
    text: "",
    bgColor: "#000000",
    textColor: "#ffffff",
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/announcement-bar/admin");
        if (!alive) return;
        if (data) {
          setForm({
            enabled: !!data.enabled,
            text: data.text || "",
            bgColor: data.bgColor || "#000000",
            textColor: data.textColor || "#ffffff",
          });
        }
      } catch (e) {
        console.error("Duyuru bilgisi alınamadı:", e);
        // 404 vs
        // yoksa sorun değil; ilk kayıt oluşturulacak
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const previewStyles = useMemo(
    () => ({
      background: form.bgColor || "#000",
      color: form.textColor || "#fff",
    }),
    [form.bgColor, form.textColor]
  );

  const onChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!form.text.trim()) {
      setToast({ type: "error", msg: "Metin boş olamaz." });
      return;
    }
    try {
      setSaving(true);
      const payload = {
        text: form.text.trim(),
        enabled: !!form.enabled,
        bgColor: form.bgColor || "#000000",
        textColor: form.textColor || "#ffffff",
      };
      await api.put("/announcement-bar/admin", payload);
      setToast({ type: "success", msg: "Duyuru kaydedildi." });
    } catch (err) {
      setToast({
        type: "error",
        msg:
          err?.response?.data?.message || "Duyuru kaydedilirken hata oluştu.",
      });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    try {
      setSaving(true);
      await api.delete("/announcement-bar/admin");
      setForm({
        enabled: false,
        text: "",
        bgColor: "#000000",
        textColor: "#ffffff",
      });
      setToast({ type: "success", msg: "Duyuru kaldırıldı." });
    } catch (err) {
      setToast({
        type: "error",
        msg: err?.response?.data?.message || "Duyuru silinirken hata oluştu.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-xl border bg-white p-6">Yükleniyor…</div>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Canlı Önizleme */}
      <section className="rounded-xl border bg-white overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Canlı Önizleme</h2>
          <p className="text-sm text-gray-500">
            Bu bant sitenin en üstünde görünecek.
          </p>
        </div>
        <div className="p-0">
          <div
            className="w-full text-center px-4 py-3 text-sm md:text-base"
            style={previewStyles}
          >
            {form.text?.trim() || "Örnek duyuru metni"}
          </div>
          {!form.enabled && (
            <div className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-t border-amber-100">
              Not: Duyuru şu an <b>kapalı</b> (enabled=false). Kaydettikten
              sonra açabilirsiniz.
            </div>
          )}
        </div>
      </section>

      {/* Form */}
      <form
        onSubmit={onSave}
        className="rounded-xl border bg-white p-4 sm:p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Duyuru Ayarları</h2>
          <label className="inline-flex items-center gap-2 text-sm select-none">
            <input
              type="checkbox"
              name="enabled"
              checked={form.enabled}
              onChange={onChange}
            />
            Göster (enabled)
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Metin *</label>
          <input
            type="text"
            name="text"
            value={form.text}
            onChange={onChange}
            placeholder="Örn. Tüm siparişlerde ücretsiz kargo!"
            className="w-full border px-3 py-2 rounded-lg"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Arka Plan Rengi
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                name="bgColor"
                value={form.bgColor}
                onChange={onChange}
                className="w-12 h-10 p-0 border rounded"
                aria-label="Arka plan rengi seç"
              />
              <input
                type="text"
                name="bgColor"
                value={form.bgColor}
                onChange={onChange}
                className="flex-1 border px-3 py-2 rounded-lg"
                placeholder="#000000"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Varsayılan: #000000 (siyah)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Metin Rengi
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                name="textColor"
                value={form.textColor}
                onChange={onChange}
                className="w-12 h-10 p-0 border rounded"
                aria-label="Metin rengi seç"
              />
              <input
                type="text"
                name="textColor"
                value={form.textColor}
                onChange={onChange}
                className="flex-1 border px-3 py-2 rounded-lg"
                placeholder="#ffffff"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Varsayılan: #ffffff (beyaz)
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={saving}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-60"
          >
            Kaldır
          </button>
          <button
            type="submit"
            disabled={saving || !form.text.trim()}
            className={`px-4 py-2 rounded-lg text-white ${
              saving
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Duyuruyu Kaldır"
        message="Duyuruyu tamamen kaldırmak istiyor musunuz?"
        confirmLabel="Kaldır"
        tone="danger"
        loading={saving}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={async () => {
          setDeleteConfirmOpen(false);
          await onDelete();
        }}
      />

      {toast && <ToastAlert {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
