// src/admin/pages/ShippingMethodsPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../../api";
import ToastAlert from "../../components/ui/ToastAlert";

/* Basit onay diyaloğu (silme için) */
function ConfirmDialog({ open, title, message, onCancel, onConfirm, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-5">
        <h4 className="text-lg font-semibold text-gray-800">{title}</h4>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800"
            disabled={loading}
          >
            İptal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Siliniyor…" : "Evet, Sil"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ShippingMethodsPage() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  // form state (sadece ad + ücret)
  const [editing, setEditing] = useState(null); // {_id, ...} | null
  const [form, setForm] = useState({ name: "", fee: "" });

  // eşik yönetimi için alt kart state’i
  const [thresholdTarget, setThresholdTarget] = useState(null);
  const [thresholdMode, setThresholdMode] = useState("view"); // view | edit | create
  const [thresholdInput, setThresholdInput] = useState("");
  const [thresholdSaving, setThresholdSaving] = useState(false);

  // silme onayı
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // toast
  const [toast, setToast] = useState(null);
  const showToast = useCallback(
    (type, title, message) =>
      setToast({ type, title, message, id: Date.now() }),
    []
  );
  const thresholdTargetRef = useRef(thresholdTarget);

  useEffect(() => {
    thresholdTargetRef.current = thresholdTarget;
  }, [thresholdTarget]);

  const totalCount = useMemo(() => methods.length, [methods]);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/shipping");
      setMethods(Array.isArray(data) ? data : []);
      const currentThresholdTarget = thresholdTargetRef.current;
      if (currentThresholdTarget) {
        const updated = (Array.isArray(data) ? data : []).find(
          (m) => m._id === currentThresholdTarget._id
        );
        if (updated) {
          setThresholdTarget(updated);
          if (updated.freeShippingThreshold != null) {
            setThresholdMode("view");
            setThresholdInput(String(updated.freeShippingThreshold));
          } else {
            setThresholdMode("create");
            setThresholdInput("");
          }
        }
      }
    } catch (e) {
      showToast("error", "Yükleme Hatası", "Kargo yöntemleri alınamadı.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const resetForm = () => {
    setForm({ name: "", fee: "" });
    setEditing(null);
  };

  // ⛔️ Bir tane varsa, yeni eklemeyi kapat
  const allowCreate = !editing && methods.length === 0;

  const onSubmit = async (e) => {
    e?.preventDefault?.();

    // Ek güvenlik: ikinci eklemeyi tamamen engelle
    if (!editing && methods.length > 0) {
      showToast(
        "warning",
        "Sınır Aşıldı",
        "Zaten tanımlı bir kargo yöntemi var. Yeni eklenemez."
      );
      return;
    }

    const payload = {
      name: form.name.trim(),
      fee: Number(form.fee || 0),
    };
    if (!payload.name) {
      showToast("warning", "Eksik Alan", "Kargo adı zorunludur.");
      return;
    }
    if (Number.isNaN(payload.fee) || payload.fee < 0) {
      showToast(
        "warning",
        "Hatalı Ücret",
        "Kargo ücreti 0 veya daha büyük olmalı."
      );
      return;
    }

    try {
      if (editing?._id) {
        await api.put(`/shipping/${editing._id}`, payload);
        showToast("success", "Güncellendi", "Kargo yöntemi güncellendi.");
      } else {
        await api.post("/shipping", payload);
        showToast("success", "Eklendi", "Yeni kargo yöntemi eklendi.");
      }
      resetForm();
      fetchList();
    } catch (e) {
      console.error(e);
      showToast("error", "Kayıt Hatası", "İşlem gerçekleştirilemedi.");
    }
  };

  const onEdit = (m) => {
    setEditing(m);
    setForm({ name: m.name, fee: String(m.fee ?? "") });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = (m) => setConfirmTarget(m);

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    try {
      setConfirmLoading(true);
      await api.delete(`/shipping/${confirmTarget._id}`);
      showToast("success", "Silindi", `"${confirmTarget.name}" silindi.`);
      if (editing?._id === confirmTarget._id) resetForm();
      if (thresholdTarget?._id === confirmTarget._id) {
        setThresholdTarget(null);
        setThresholdMode("view");
        setThresholdInput("");
      }
      setConfirmTarget(null);
      fetchList();
    } catch (e) {
      console.error(e);
      showToast("error", "Silme Hatası", "Yöntem silinemedi.");
    } finally {
      setConfirmLoading(false);
    }
  };

  // —— EŞİK YÖNETİMİ ——
  const openThresholdManager = (m) => {
    setThresholdTarget(m);
    if (m.freeShippingThreshold != null) {
      setThresholdMode("view");
      setThresholdInput(String(m.freeShippingThreshold));
    } else {
      setThresholdMode("create");
      setThresholdInput("");
    }
    setTimeout(() => {
      const el = document.getElementById("free-shipping-section");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const saveThreshold = async () => {
    if (!thresholdTarget) return;
    const num = Number(thresholdInput);
    if (Number.isNaN(num) || num < 0) {
      showToast(
        "warning",
        "Hatalı Eşik",
        "Ücretsiz kargo eşiği 0 veya daha büyük olmalı."
      );
      return;
    }
    try {
      setThresholdSaving(true);
      await api.put(`/shipping/${thresholdTarget._id}`, {
        freeShippingThreshold: num,
      });
      showToast("success", "Kaydedildi", "Ücretsiz kargo eşiği güncellendi.");
      setThresholdMode("view");
      fetchList();
    } catch (e) {
      console.error(e);
      showToast("error", "Kayıt Hatası", "Eşik kaydedilemedi.");
    } finally {
      setThresholdSaving(false);
    }
  };

  const removeThreshold = async () => {
    if (!thresholdTarget) return;
    try {
      setThresholdSaving(true);
      await api.put(`/shipping/${thresholdTarget._id}`, {
        freeShippingThreshold: null,
      });
      showToast("success", "Kaldırıldı", "Ücretsiz kargo eşiği kaldırıldı.");
      setThresholdMode("create");
      setThresholdInput("");
      fetchList();
    } catch (e) {
      console.error(e);
      showToast("error", "İşlem Hatası", "Eşik kaldırılamadı.");
    } finally {
      setThresholdSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Başlık / üst özet */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Kargo Yöntemleri
          </h1>
          <p className="text-sm text-gray-500">
            Bu projede yalnızca <span className="font-semibold">bir</span> kargo
            yöntemi kullanılabilir. Gerekirse mevcut yöntemi düzenleyebilir veya
            silebilirsin.
          </p>
        </div>
        <div className="text-sm text-gray-600">
          Toplam yöntem: <span className="font-semibold">{totalCount}</span>
        </div>
      </div>

      {/* Form kartı (ad + ücret) */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-5 mb-6">
        <h2 className="text-lg font-medium text-gray-800 mb-3">
          {editing ? "Kargo Yöntemini Düzenle" : "Yeni Kargo Yöntemi Ekle"}
        </h2>

        {!allowCreate && !editing ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 p-3 text-sm">
            Zaten tanımlı bir yöntem var. Yeni eklemek için önce mevcut yöntemi
            silmelisin.
          </div>
        ) : null}

        <form
          onSubmit={onSubmit}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3"
        >
          <div className="sm:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">
              Kargo Adı
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Örn: Hızlı Kargo"
              disabled={!allowCreate && !editing}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Ücret (₺)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
              value={form.fee}
              onChange={(e) => setForm((f) => ({ ...f, fee: e.target.value }))}
              placeholder="Örn: 29.90"
              disabled={!allowCreate && !editing}
            />
          </div>

          <div className="sm:col-span-3 flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={!editing && methods.length > 0}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black transition disabled:opacity-60"
            >
              {editing ? "Güncelle" : "Ekle"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
              >
                İptal
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Liste kartı */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6">
        <div className="p-4 sm:p-5 border-b">
          <h3 className="text-lg font-medium text-gray-800">
            Tanımlı Yöntemler
          </h3>
        </div>

        {loading ? (
          <div className="p-5 text-sm text-gray-500">Yükleniyor…</div>
        ) : methods.length === 0 ? (
          <div className="p-5 text-sm text-gray-500">
            Henüz bir yöntem eklenmemiş.
          </div>
        ) : (
          <div className="divide-y">
            {methods.map((m) => (
              <div
                key={m._id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-base font-semibold text-gray-900 truncate">
                    {m.name}
                  </div>
                  <div className="text-sm text-gray-500 flex flex-wrap items-center gap-2">
                    <span>Ücret: ₺{Number(m.fee).toFixed(2)}</span>
                    {m.freeShippingThreshold != null ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        ₺{Number(m.freeShippingThreshold).toFixed(0)}+ ücretsiz
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        Eşik tanımsız
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(m)}
                    className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm"
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => openThresholdManager(m)}
                    className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm"
                  >
                    Eşiği Yönet
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(m)}
                    className="px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-sm"
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ÜCRETSİZ KARGO EŞİĞİ — ayrı bölüm */}
      <div
        id="free-shipping-section"
        className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-5"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Ücretsiz Kargo Eşiği
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Bir yöntem seçip eşik belirle. Eşik, sepet toplamı bu tutara
          ulaştığında kargonun ücretsiz olmasını sağlar.
        </p>

        {!thresholdTarget ? (
          <div className="text-sm text-gray-500">
            Listeden <span className="font-medium">“Eşiği Yönet”</span>{" "}
            butonuyla bir kargo yöntemi seç.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm">
              Seçilen yöntem:{" "}
              <span className="font-semibold">{thresholdTarget.name}</span>
            </div>

            {thresholdMode === "view" &&
            thresholdTarget.freeShippingThreshold != null ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
                  Aktif eşik:{" "}
                  <span className="font-semibold">
                    ₺{Number(thresholdTarget.freeShippingThreshold).toFixed(0)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setThresholdMode("edit");
                      setThresholdInput(
                        String(thresholdTarget.freeShippingThreshold)
                      );
                    }}
                    className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm"
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={removeThreshold}
                    disabled={thresholdSaving}
                    className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm disabled:opacity-60"
                  >
                    {thresholdSaving ? "Kaldırılıyor…" : "Kaldır"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Ücretsiz Kargo Eşiği (₺)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={thresholdInput}
                    onChange={(e) => setThresholdInput(e.target.value)}
                    placeholder="Örn: 500"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={saveThreshold}
                    disabled={thresholdSaving}
                    className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black transition disabled:opacity-60"
                  >
                    {thresholdSaving ? "Kaydediliyor…" : "Onayla"}
                  </button>
                  {thresholdMode === "edit" && (
                    <button
                      type="button"
                      onClick={() => {
                        setThresholdMode("view");
                        setThresholdInput(
                          String(thresholdTarget.freeShippingThreshold ?? "")
                        );
                      }}
                      className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
                    >
                      İptal
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Silme Confirm */}
      <ConfirmDialog
        open={!!confirmTarget}
        title="Silme Onayı"
        message={
          confirmTarget
            ? `"${confirmTarget.name}" yöntemini silmek istediğine emin misin?`
            : ""
        }
        loading={confirmLoading}
        onCancel={() => !confirmLoading && setConfirmTarget(null)}
        onConfirm={confirmDelete}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed inset-x-0 bottom-4 flex justify-center px-4 pointer-events-none z-[110]">
          <div className="pointer-events-auto max-w-md w-full">
            <ToastAlert
              key={toast.id}
              type={toast.type}
              title={toast.title}
              message={toast.message}
              onClose={() => setToast(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
