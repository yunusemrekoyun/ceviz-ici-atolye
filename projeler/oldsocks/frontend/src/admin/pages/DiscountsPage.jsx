// src/pages/admin/DiscountsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api";
import {
  FaPercent,
  FaTrash,
  FaPowerOff,
  FaPlus,
  FaSearch,
  FaEdit,
} from "react-icons/fa";
import ToastAlert from "../../components/ui/ToastAlert";
import Window from "../../components/ui/Window"; // ✅ EKLENDİ

const cx = (...cls) => cls.filter(Boolean).join(" ");

export default function DiscountsPage() {
  /* -------- list state -------- */
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState([]);

  /* -------- toast -------- */
  const [toast, setToast] = useState(null);
  const notify = (msg, type = "info") => setToast({ msg, type });

  /* -------- form state -------- */
  const [openForm, setOpenForm] = useState(false);
  const [mode, setMode] = useState("create"); // "create" | "edit"
  const [editingId, setEditingId] = useState(null);
  const emptyForm = {
    title: "",
    discountRate: 0,
    selectionType: "product", // "product" | "category" | "subcategory"
    targetIds: [],
    isActive: false,
  };
  const [form, setForm] = useState(emptyForm);

  /* -------- targets -------- */
  const [products, setProducts] = useState([]);
  const [rootCats, setRootCats] = useState([]); // children populated
  const [search, setSearch] = useState("");

  /* -------- delete confirm (modal) -------- */
  const [confirmRule, setConfirmRule] = useState(null); // ✅ EKLENDİ

  const resetForm = () => {
    setForm(emptyForm);
    setMode("create");
    setEditingId(null);
    setSearch("");
  };

  /* -------- fetch list -------- */
  const fetchRules = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/discounts");
      setRules(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      notify("İndirimler alınamadı.", "error");
    } finally {
      setLoading(false);
    }
  };

  /* -------- fetch targets -------- */
  useEffect(() => {
    api
      .get("/products")
      .then(({ data }) => setProducts(Array.isArray(data) ? data : []))
      .catch((e) => console.error("products fetch", e));

    api
      .get("/categories")
      .then(({ data }) => setRootCats(Array.isArray(data) ? data : []))
      .catch((e) => console.error("categories fetch", e));

    fetchRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allSubCats = useMemo(
    () =>
      rootCats.flatMap((r) =>
        (r.children || []).map((c) => ({ ...c, parentName: r.name }))
      ),
    [rootCats]
  );

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const s = search.toLowerCase();
    return products.filter((p) => (p.name || "").toLowerCase().includes(s));
  }, [products, search]);

  /* -------- helpers -------- */
  const toggleId = (id) => {
    setForm((f) => {
      const has = f.targetIds.includes(id);
      return {
        ...f,
        targetIds: has
          ? f.targetIds.filter((x) => x !== id)
          : [...f.targetIds, id],
      };
    });
  };

  const openCreate = () => {
    resetForm();
    setMode("create");
    setOpenForm(true);
  };

  const openEdit = (rule) => {
    setMode("edit");
    setEditingId(rule._id);
    setForm({
      title: rule.title || "",
      discountRate: Number(rule.discountRate || 0),
      selectionType: rule.selectionType || "product",
      targetIds: (rule.targetIds || []).map(String),
      isActive: Boolean(rule.isActive),
    });
    setOpenForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return notify("İndirim adı zorunlu.", "error");
    if (!(form.discountRate > 0 && form.discountRate < 100))
      return notify("İndirim yüzdesi 0'dan büyük, 100'den küçük olmalı.", "error");
    if (form.targetIds.length === 0)
      return notify("En az bir hedef seçmelisiniz.", "error");

    const payload = {
      title: form.title.trim(),
      discountRate: Number(form.discountRate),
      selectionType: form.selectionType,
      targetIds: form.targetIds,
      isActive: Boolean(form.isActive),
    };

    try {
      if (mode === "create") {
        await api.post("/discounts", payload);
        notify("İndirim kuralı oluşturuldu.", "success");
      } else {
        await api.put(`/discounts/${editingId}`, payload);
        notify("İndirim kuralı güncellendi.", "success");
      }
      setOpenForm(false);
      resetForm();
      await fetchRules();
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 409) {
        const ids = err?.response?.data?.conflictingProductIds || [];
        notify(
          `Çakışan aktif indirim(ler) var. Etkilenen ürün sayısı: ${ids.length}`,
          "error"
        );
      } else {
        notify(err?.response?.data?.message || "İşlem tamamlanamadı.", "error");
      }
    }
  };

  /* -------- activate/deactivate -------- */
  const toggleRule = async (r, next) => {
    try {
      await api.put(`/discounts/${r._id}/toggle`, { isActive: next });
      notify(
        next ? "İndirim aktif edildi." : "İndirim pasifleştirildi.",
        "success"
      );
      await fetchRules();
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 409) {
        notify(
          "Çakışan aktif indirim(ler) var. Önce diğerlerini kapatın ya da kapsamı değiştirin.",
          "error"
        );
      } else {
        notify("İndirim güncellenemedi.", "error");
      }
    }
  };

  /* -------- delete flow (modal + toast) -------- */
  const askDelete = (rule) => setConfirmRule(rule); // ✅ native confirm yerine modal tetikler

  const actuallyDelete = async () => {
    if (!confirmRule) return;
    try {
      await api.delete(`/discounts/${confirmRule._id}`);
      notify("İndirim silindi.", "success");
      await fetchRules();
    } catch (e) {
      console.error(e);
      notify("İndirim silinemedi.", "error");
    } finally {
      setConfirmRule(null);
    }
  };

  /* -------- UI -------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-semibold">İndirimler</h1>
          <p className="text-sm text-gray-500">
            Ürün / kategori bazlı toplu indirimleri yönetin.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800"
        >
          <FaPlus /> <span className="hidden xs:inline">Yeni İndirim</span>
        </button>
      </div>

      {/* List (scrollable on mobile) */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2">İndirim</th>
                <th className="text-left px-4 py-2">Yüzde</th>
                <th className="text-left px-4 py-2">Hedef</th>
                <th className="text-left px-4 py-2">Durum</th>
                <th className="text-right px-4 py-2">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    Yükleniyor…
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    Kural bulunamadı.
                  </td>
                </tr>
              ) : (
                rules.map((r, idx) => {
                  const activeNow = Boolean(r.isActive);
                  const targetBadge =
                    r.selectionType === "product"
                      ? "Ürün"
                      : r.selectionType === "category"
                      ? "Kategori + Altları"
                      : "Alt Kategori";
                  return (
                    <tr
                      key={r._id}
                      className={idx % 2 ? "bg-white" : "bg-gray-50/50"}
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium break-words">{r.title}</div>
                        <div className="text-xs text-gray-500">
                          Uygulanan ürün: {r.appliedProducts?.length || 0}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">
                          <FaPercent className="-mt-0.5" /> {r.discountRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs">
                          {targetBadge}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={cx(
                            "inline-flex items-center px-2 py-1 rounded-full text-xs",
                            activeNow
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-200 text-gray-700"
                          )}
                        >
                          {activeNow ? "Aktif" : "Pasif"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {/* Düzenle */}
                          <button
                            onClick={() => openEdit(r)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            title="Düzenle"
                          >
                            <FaEdit className="text-xs" />
                            <span className="hidden md:inline">Düzenle</span>
                          </button>

                          {/* Aç/Kapat */}
                          <button
                            onClick={() => toggleRule(r, !r.isActive)}
                            className={cx(
                              "inline-flex items-center gap-2 px-3 py-1.5 rounded-md focus:outline-none focus:ring-2",
                              r.isActive
                                ? "bg-gray-700 hover:bg-gray-800 text-white focus:ring-gray-400"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-400"
                            )}
                            title={r.isActive ? "Pasifleştir" : "Aktifleştir"}
                          >
                            <FaPowerOff className="text-xs" />
                            <span className="hidden md:inline">
                              {r.isActive ? "Kapat" : "Aç"}
                            </span>
                          </button>

                          {/* Sil */}
                          <button
                            onClick={() => askDelete(r)} // ✅ modal aç
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white focus:outline-none focus:ring-2 focus:ring-red-400"
                            title="Sil"
                          >
                            <FaTrash className="text-xs" />
                            <span className="hidden md:inline">Sil</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {openForm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-2 sm:p-4">
          <div className="w-full max-w-[1000px] sm:rounded-2xl bg-white shadow-xl overflow-hidden h-[95vh] sm:h-auto sm:max-h-[90vh] flex flex-col">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold">
                {mode === "create" ? "Yeni İndirim" : "İndirimi Düzenle"}
              </h2>
              <button
                onClick={() => {
                  setOpenForm(false);
                  resetForm();
                }}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Kapat
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-5 overflow-auto"
            >
              {/* sol: temel */}
              <div className="lg:col-span-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    İndirim adı
                  </label>
                  <input
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                    placeholder="Örn. Yaz Fırsatı %20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Yüzde
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.discountRate}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        discountRate: Number(e.target.value),
                      }))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Hedef türü
                  </label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.selectionType}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        selectionType: e.target.value,
                        targetIds: [],
                      }))
                    }
                  >
                    <option value="product">Ürün</option>
                    <option value="category">Kategori (altları dahil)</option>
                    <option value="subcategory">Alt Kategori</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="active"
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isActive: e.target.checked }))
                    }
                  />
                  <label htmlFor="active" className="text-sm">
                    {mode === "create" ? "Hemen Aktif" : "Aktif"}
                  </label>
                </div>
              </div>

              {/* sağ: hedef seçimi */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  {form.selectionType === "product"
                    ? "Ürün Seçimi"
                    : form.selectionType === "category"
                    ? "Kategori Seçimi (root)"
                    : "Alt Kategori Seçimi"}
                </label>

                {/* search (ürün için) */}
                {form.selectionType === "product" && (
                  <div className="mb-2 flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="relative flex-1">
                      <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        placeholder="Ürün ara…"
                        className="w-full border rounded-lg pl-9 pr-3 py-2"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-xs px-2 py-1 rounded border"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            targetIds: [...new Set([...f.targetIds, ...filteredProducts.map((p) => String(p._id))])],
                          }))
                        }
                      >
                        Görünenleri Seç
                      </button>
                      <button
                        type="button"
                        className="text-xs px-2 py-1 rounded border"
                        onClick={() => {
                          const visibleIds = new Set(filteredProducts.map((p) => String(p._id)));
                          setForm((f) => ({
                            ...f,
                            targetIds: f.targetIds.filter((id) => !visibleIds.has(String(id))),
                          }));
                        }}
                      >
                        Görünenleri Kaldır
                      </button>
                      <button
                        type="button"
                        className="text-xs px-2 py-1 rounded border"
                        onClick={() =>
                          setForm((f) => ({ ...f, targetIds: [] }))
                        }
                      >
                        Tümünü Temizle
                      </button>
                    </div>
                  </div>
                )}

                <div className="h-[52vh] sm:h-72 md:h-80 overflow-y-auto rounded-lg border p-3 space-y-1">
                  {form.selectionType === "product" &&
                    (filteredProducts.length ? (
                      filteredProducts.map((p) => (
                        <label
                          key={p._id}
                          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={form.targetIds.includes(p._id)}
                            onChange={() => toggleId(p._id)}
                          />
                          <span className="text-sm truncate">{p.name}</span>
                          <span className="ml-auto text-xs text-gray-500 truncate">
                            {p.category?.name || ""}
                          </span>
                        </label>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 px-2 py-1">
                        Sonuç yok
                      </div>
                    ))}

                  {form.selectionType === "category" &&
                    (rootCats.length ? (
                      rootCats.map((c) => (
                        <label
                          key={c._id}
                          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={form.targetIds.includes(c._id)}
                            onChange={() => toggleId(c._id)}
                          />
                          <span className="text-sm truncate">{c.name}</span>
                          <span className="ml-auto text-xs text-gray-500">
                            Alt: {c.children?.length || 0}
                          </span>
                        </label>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 px-2 py-1">
                        Kategori bulunamadı
                      </div>
                    ))}

                  {form.selectionType === "subcategory" &&
                    (allSubCats.length ? (
                      allSubCats.map((c) => (
                        <label
                          key={c._id}
                          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={form.targetIds.includes(c._id)}
                            onChange={() => toggleId(c._id)}
                          />
                          <span className="text-sm truncate">{c.name}</span>
                          <span className="ml-auto text-xs text-gray-500 truncate">
                            Üst: {c.parentName}
                          </span>
                        </label>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 px-2 py-1">
                        Alt kategori bulunamadı
                      </div>
                    ))}
                </div>

                <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-md border"
                    onClick={() => {
                      setOpenForm(false);
                      resetForm();
                    }}
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-800"
                  >
                    {mode === "create" ? "Kaydet" : "Güncelle"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal (Window ile, CategoriesPage ile tutarlı) */}
      {confirmRule && (
        <Window title="Onayla" onClose={() => setConfirmRule(null)}>
          <div className="space-y-5 text-sm">
            <p>
              Bu indirimi silmek istediğinize emin misiniz?
              <br />
              <span className="font-medium">“{confirmRule.title}”</span>
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => setConfirmRule(null)}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Vazgeç
              </button>
              <button
                onClick={actuallyDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Sil
              </button>
            </div>
          </div>
        </Window>
      )}

      {/* Toast */}
      {toast && (
        <ToastAlert
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={4000}
        />
      )}
    </div>
  );
}
