import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../../api";
import { FaEdit, FaPowerOff, FaPlus, FaSearch, FaTag, FaTrash } from "react-icons/fa";
import ToastAlert from "../../components/ui/ToastAlert";
import Window from "../../components/ui/Window";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

const cx = (...cls) => cls.filter(Boolean).join(" ");

const DISCOUNT_OPTIONS = [
  { value: "percent", label: "Yüzdelik İndirim" },
  { value: "fixed", label: "TL İndirimi" },
];

const emptyForm = {
  code: "",
  discountType: "percent",
  discountValue: "",
  minimumSubtotal: "",
  expiresAt: "",
  maxUses: "",
  isEnabled: true,
  productIds: [],
};

// datetime-local alanı yerel saati "YYYY-MM-DDTHH:mm" biçiminde bekler.
function toLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function discountTypeLabel(value) {
  return (
    DISCOUNT_OPTIONS.find((option) => option.value === value)?.label || value
  );
}

function fmtTL(value) {
  return `₺${Number(value || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CouponsPage() {
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const [openForm, setOpenForm] = useState(false);
  const [mode, setMode] = useState("create");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [dirty, setDirty] = useState(false);

  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = useCallback(
    (msg, type = "info") => setToast({ msg, type }),
    []
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: couponData }, { data: productData }] = await Promise.all([
        api.get("/coupons"),
        api.get("/products"),
      ]);
      setCoupons(Array.isArray(couponData) ? couponData : []);
      setProducts(Array.isArray(productData) ? productData : []);
    } catch (err) {
      console.error(err);
      notify("Kuponlar alınamadı.", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const productMap = useMemo(
    () => new Map(products.map((product) => [String(product._id), product])),
    [products]
  );

  const filteredCoupons = useMemo(() => {
    if (!search.trim()) return coupons;
    const q = search.trim().toLowerCase();
    return coupons.filter((coupon) => {
      const text = [
        coupon.code,
        discountTypeLabel(coupon.discountType),
        coupon.isEnabled ? "açık" : "kapalı",
      ]
        .join(" ")
        .toLowerCase();
      return text.includes(q);
    });
  }, [coupons, search]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.trim().toLowerCase();
    return products.filter((product) =>
      String(product.name || "").toLowerCase().includes(q)
    );
  }, [productSearch, products]);

  const selectedProducts = useMemo(
    () =>
      form.productIds
        .map((id) => productMap.get(String(id)))
        .filter(Boolean),
    [form.productIds, productMap]
  );
  const selectedVisibleCount = filteredProducts.filter((product) =>
    form.productIds.includes(String(product._id))
  ).length;

  const resetForm = () => {
    setForm(emptyForm);
    setMode("create");
    setEditingId(null);
    setProductSearch("");
    setDirty(false);
    setConfirmCloseOpen(false);
  };

  const requestClose = () => {
    if (dirty) {
      setConfirmCloseOpen(true);
      return;
    }
    setOpenForm(false);
    resetForm();
  };

  const openCreate = () => {
    resetForm();
    setOpenForm(true);
  };

  const openEdit = (coupon) => {
    setMode("edit");
    setEditingId(coupon._id);
    setForm({
      code: coupon.code || "",
      discountType: coupon.discountType || "percent",
      discountValue:
        coupon.discountValue === null || coupon.discountValue === undefined
          ? ""
          : String(coupon.discountValue),
      minimumSubtotal:
        coupon.minimumSubtotal === null || coupon.minimumSubtotal === undefined
          ? ""
          : String(coupon.minimumSubtotal),
      expiresAt: toLocalInput(coupon.expiresAt),
      maxUses: coupon.maxUses ? String(coupon.maxUses) : "",
      isEnabled: Boolean(coupon.isEnabled),
      productIds: (coupon.productIds || []).map(String),
    });
    setProductSearch("");
    setDirty(false);
    setConfirmCloseOpen(false);
    setOpenForm(true);
  };

  const toggleProductId = (productId) => {
    setDirty(true);
    setForm((prev) => {
      const normalizedId = String(productId);
      const has = prev.productIds.includes(normalizedId);
      return {
        ...prev,
        productIds: has
          ? prev.productIds.filter((id) => id !== normalizedId)
          : [...prev.productIds, normalizedId],
      };
    });
  };

  const buildPayload = () => {
    const code = String(form.code || "").trim().toUpperCase();
    if (!code) throw new Error("Kupon kodu zorunludur.");
    if (!form.productIds.length) throw new Error("En az bir ürün seçmelisiniz.");

    const discountValue = Number(form.discountValue);
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      throw new Error("İndirim değeri 0'dan büyük olmalıdır.");
    }

    const minimumSubtotal = Number(form.minimumSubtotal || 0);
    if (!Number.isFinite(minimumSubtotal) || minimumSubtotal < 0) {
      throw new Error("Alt sınır 0 veya daha büyük olmalıdır.");
    }

    if (form.discountType === "percent" && discountValue > 100) {
      throw new Error("Yüzdelik kupon 100'ü aşamaz.");
    }

    const maxUses = form.maxUses === "" ? null : Number(form.maxUses);
    if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) {
      throw new Error("Kullanım sınırı 1 veya daha büyük bir tam sayı olmalıdır.");
    }
    const expiresAt = form.expiresAt ? new Date(form.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new Error("Bitiş tarihini kontrol edin.");
    }

    return {
      code,
      discountType: form.discountType,
      discountValue,
      minimumSubtotal,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      maxUses,
      isEnabled: Boolean(form.isEnabled),
      productIds: form.productIds,
    };
  };

  const submitForm = async (e) => {
    e.preventDefault();

    let payload;
    try {
      payload = buildPayload();
    } catch (err) {
      notify(err.message || "Form doğrulanamadı.", "error");
      return;
    }

    try {
      if (mode === "create") {
        await api.post("/coupons", payload);
        notify("Kupon oluşturuldu.", "success");
      } else {
        await api.put(`/coupons/${editingId}`, payload);
        notify("Kupon güncellendi.", "success");
      }
      setOpenForm(false);
      resetForm();
      await fetchData();
    } catch (err) {
      console.error(err);
      notify(err?.response?.data?.message || "Kupon kaydedilemedi.", "error");
    }
  };

  const toggleEnabled = async (coupon, nextEnabled) => {
    try {
      await api.patch(`/coupons/${coupon._id}/toggle`, { isEnabled: nextEnabled });
      notify(nextEnabled ? "Kupon açıldı." : "Kupon kapatıldı.", "success");
      await fetchData();
    } catch (err) {
      console.error(err);
      notify("Kupon durumu güncellenemedi.", "error");
    }
  };

  const deleteCoupon = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/coupons/${confirmDelete._id}`);
      setConfirmDelete(null);
      notify("Kupon silindi.", "success");
      await fetchData();
    } catch (err) {
      console.error(err);
      notify(err?.response?.data?.message || "Kupon silinemedi.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-semibold">Kuponlar</h1>
          <p className="text-sm text-gray-500">
            Ürüne bağlı indirim kuponlarını yönetin. Kuponlar normal ürün indirimleriyle çalışır,
            sepet kampanyalarıyla birlikte çalışmaz.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-white transition hover:bg-gray-800"
        >
          <FaPlus /> Yeni Kupon
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-4">
          <div className="relative max-w-md">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kod veya tip ile ara..."
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-dark1"
            />
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-gray-500">
              Kuponlar yükleniyor...
            </div>
          ) : filteredCoupons.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-gray-500">
              Kupon bulunamadı.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {filteredCoupons.map((coupon) => {
                const isPercent = coupon.discountType === "percent";
                const valueLabel = isPercent
                  ? `%${Number(coupon.discountValue || 0).toFixed(2)}`
                  : fmtTL(coupon.discountValue || 0);

                return (
                  <div
                    key={coupon._id}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-3 py-1 text-sm font-semibold text-white">
                            <FaTag className="text-xs" />
                            {coupon.code}
                          </span>
                          <span
                            className={cx(
                              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                              coupon.isEnabled
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-gray-200 text-gray-700"
                            )}
                          >
                            {coupon.isEnabled ? "Açık" : "Kapalı"}
                          </span>
                        </div>
                        <div className="mt-3 space-y-1 text-sm text-gray-600">
                          <p>
                            Tip: <b className="text-dark1">{discountTypeLabel(coupon.discountType)}</b>
                          </p>
                          <p>
                            İndirim: <b className="text-dark1">{valueLabel}</b>
                          </p>
                          <p>
                            Alt Sınır: <b className="text-dark1">{fmtTL(coupon.minimumSubtotal || 0)}</b>
                          </p>
                          {coupon.expiresAt && (
                            <p className={new Date(coupon.expiresAt) <= new Date() ? "text-red-700" : undefined}>
                              Bitiş: <b>{new Date(coupon.expiresAt).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}</b>
                            </p>
                          )}
                          {coupon.maxUses && (
                            <p>
                              Kullanım sınırı: <b className="text-dark1">{coupon.maxUses}</b>
                            </p>
                          )}
                          <p>
                            Kapsanan Ürün: <b className="text-dark1">{Array.isArray(coupon.productIds) ? coupon.productIds.length : 0}</b>
                          </p>
                          <p>
                            Oluşturulma: <b className="text-dark1">{new Date(coupon.createdAt).toLocaleString("tr-TR")}</b>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <button
                          type="button"
                          onClick={() => openEdit(coupon)}
                          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                        >
                          <FaEdit className="text-xs" /> Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleEnabled(coupon, !coupon.isEnabled)}
                          className={cx(
                            "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white transition",
                            coupon.isEnabled
                              ? "bg-gray-700 hover:bg-gray-800"
                              : "bg-emerald-600 hover:bg-emerald-700"
                          )}
                        >
                          <FaPowerOff className="text-xs" />
                          {coupon.isEnabled ? "Kapat" : "Aç"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(coupon)}
                          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                        >
                          <FaTrash className="text-xs" /> Sil
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {openForm && (
        <Window
          title={mode === "create" ? "Yeni Kupon" : "Kuponu Düzenle"}
          onClose={requestClose}
          maxWidthClass="sm:max-w-5xl"
          footer={
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={requestClose}
                className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                form="coupon-form"
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                {mode === "create" ? "Kuponu Kaydet" : "Değişiklikleri Kaydet"}
              </button>
            </div>
          }
        >
          <form id="coupon-form" onSubmit={submitForm} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-1">
              <div>
                <label className="mb-1 block text-sm font-medium">Kupon Kodu</label>
                <input
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-dark1"
                  value={form.code}
                  onChange={(e) => {
                    setDirty(true);
                    setForm((prev) => ({
                      ...prev,
                      code: e.target.value.toUpperCase(),
                    }));
                  }}
                  placeholder="Örn. OLD200"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Kupon kodu tüm kullanıcılara açık olur, her kullanıcı yalnızca bir kez kullanabilir.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">İndirim Tipi</label>
                <select
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-dark1"
                  value={form.discountType}
                  onChange={(e) => {
                    setDirty(true);
                    setForm((prev) => ({ ...prev, discountType: e.target.value }));
                  }}
                >
                  {DISCOUNT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  {form.discountType === "percent" ? "İndirim Yüzdesi" : "İndirim Tutarı"}
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-dark1"
                  value={form.discountValue}
                  onChange={(e) => {
                    setDirty(true);
                    setForm((prev) => ({ ...prev, discountValue: e.target.value }));
                  }}
                  placeholder={form.discountType === "percent" ? "15" : "200"}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Alt Sınır (TL)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-dark1"
                  value={form.minimumSubtotal}
                  onChange={(e) => {
                    setDirty(true);
                    setForm((prev) => ({ ...prev, minimumSubtotal: e.target.value }));
                  }}
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Kupon yalnızca kapsanan ürünlerin toplamı bu tutara ulaştığında çalışır.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="coupon-expires" className="mb-1 block text-sm font-medium">Bitiş (isteğe bağlı)</label>
                  <input
                    id="coupon-expires"
                    type="datetime-local"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-dark1"
                    value={form.expiresAt}
                    onChange={(e) => {
                      setDirty(true);
                      setForm((prev) => ({ ...prev, expiresAt: e.target.value }));
                    }}
                  />
                  <p className="mt-1 text-xs text-gray-500">Boş bırakılırsa süresiz.</p>
                </div>
                <div>
                  <label htmlFor="coupon-max-uses" className="mb-1 block text-sm font-medium">Kullanım sınırı (isteğe bağlı)</label>
                  <input
                    id="coupon-max-uses"
                    type="number"
                    min={1}
                    step="1"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-dark1"
                    value={form.maxUses}
                    onChange={(e) => {
                      setDirty(true);
                      setForm((prev) => ({ ...prev, maxUses: e.target.value }));
                    }}
                    placeholder="Sınırsız"
                  />
                  <p className="mt-1 text-xs text-gray-500">Kupon en fazla bu kadar siparişte kullanılabilir. Ödenmiş ve ödeme bekleyen siparişler sayılır.</p>
                </div>
              </div>

              <label className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.isEnabled}
                  onChange={(e) => {
                    setDirty(true);
                    setForm((prev) => ({ ...prev, isEnabled: e.target.checked }));
                  }}
                />
                <span>
                  Kupon aktif olsun. Kapalı kuponlar kullanıcı tarafında görünmez ve uygulanamaz.
                </span>
              </label>

              {!!selectedProducts.length && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-2 text-sm font-medium text-dark1">
                    Seçilen Ürünler ({selectedProducts.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedProducts.slice(0, 10).map((product) => (
                      <span
                        key={product._id}
                        className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs text-dark1 ring-1 ring-inset ring-gray-200"
                      >
                        {product.name}
                      </span>
                    ))}
                    {selectedProducts.length > 10 && (
                      <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs text-dark1 ring-1 ring-inset ring-gray-200">
                        +{selectedProducts.length - 10} ürün daha
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 lg:col-span-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold">Kapsanan Ürünler</h3>
                  <p className="text-sm text-gray-500">
                    Kuponun uygulanacağı ürünleri hızlıca seçin.
                  </p>
                </div>
                <div className="relative w-full sm:max-w-xs">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Ürün ara..."
                    className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-dark1"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!filteredProducts.length || selectedVisibleCount === filteredProducts.length}
                  onClick={() => {
                    setDirty(true);
                    setForm((prev) => ({
                      ...prev,
                      productIds: [...new Set([...prev.productIds, ...filteredProducts.map((product) => String(product._id))])],
                    }));
                  }}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                  Görünenleri seç
                </button>
                <button
                  type="button"
                  disabled={!selectedVisibleCount}
                  onClick={() => {
                    const visibleIds = new Set(filteredProducts.map((product) => String(product._id)));
                    setDirty(true);
                    setForm((prev) => ({ ...prev, productIds: prev.productIds.filter((id) => !visibleIds.has(id)) }));
                  }}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                  Görünenleri kaldır
                </button>
                <span className="ml-auto text-xs text-gray-700">{form.productIds.length} seçili</span>
              </div>

              <div className="grid max-h-[55vh] grid-cols-1 gap-3 overflow-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => {
                  const selected = form.productIds.includes(String(product._id));
                  return (
                    <label
                      key={product._id}
                      className={cx(
                        "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition",
                        selected
                          ? "border-dark1 bg-gray-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleProductId(product._id)}
                        className="mt-1"
                      />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-dark1">
                          {product.name}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {fmtTL(product.price)}
                        </div>
                      </div>
                    </label>
                  );
                })}

                {!filteredProducts.length && (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 sm:col-span-2 xl:col-span-3">
                    Aramaya uygun ürün bulunamadı.
                  </div>
                )}
              </div>
            </div>
          </form>
        </Window>
      )}

      <ConfirmDialog
        open={confirmCloseOpen}
        title="Kaydedilmemiş değişiklikler var"
        message="Bu formda kaydedilmemiş değişiklikler var. Kapatırsanız yaptığınız düzenlemeler kaybolacak."
        confirmLabel="Formu Kapat"
        cancelLabel="Düzenlemeye Devam Et"
        tone="warning"
        onConfirm={() => {
          setConfirmCloseOpen(false);
          setOpenForm(false);
          resetForm();
        }}
        onCancel={() => setConfirmCloseOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Kuponu sil"
        message={
          confirmDelete
            ? `${confirmDelete.code} kodlu kupon kalıcı olarak silinecek.`
            : ""
        }
        confirmLabel="Sil"
        cancelLabel="Vazgeç"
        tone="danger"
        onConfirm={deleteCoupon}
        onCancel={() => setConfirmDelete(null)}
      />

      {toast && (
        <ToastAlert
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
