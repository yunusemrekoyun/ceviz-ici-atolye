// src/pages/admin/forms/EditProductForm.jsx
import React, { useState, useEffect, useMemo } from "react";
import api from "../../../api";
import ToastAlert from "../../components/ui/ToastAlert";
import { v4 as uuid } from "uuid";
import { useUploadQueue } from "../../context/UploadQueueContext";
import {
  mediaErrorMessage,
  startMediaPreparation,
  uploadMediaFile,
  uploadMediaFiles,
  validateMediaFile,
} from "../../services/mediaUpload";
import { normalizePricing, resolvePricingForSubmit } from "../../utils/pricing";
import { applyStockConflict } from "../../utils/stockConflict";

const Badge = ({ children }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
    {children}
  </span>
);

// küçük yardımcı
const moveIndexToFront = (arr, idx) => {
  if (!Array.isArray(arr) || idx <= 0 || idx >= arr.length) return arr;
  const copy = [...arr];
  const [sel] = copy.splice(idx, 1);
  return [sel, ...copy];
};

export default function EditProductForm({ product, onClose, onSaved }) {
  const [formData, setFormData] = useState({
    name: "",
    originalPrice: "",
    discount: "",
    price: "",
    description: "",
    color: "",
    sizes: [],
  });

  const [mainCat, setMainCat] = useState("");
  const [subCat, setSubCat] = useState("");
  const [cats, setCats] = useState([]);

  // ── Mevcut medya
  const [videoPreview, setVideoPreview] = useState(null); // string | null
  // eslint-disable-next-line no-unused-vars
  const [imagePreviews, setImagePreviews] = useState([]); // string[]
  const [keepExistingImages, setKeepExistingImages] = useState([]); // string[] (server'a gidecek)
  const [keepExistingImageAssetIds, setKeepExistingImageAssetIds] = useState([]);
  const [existingVideoAssetId, setExistingVideoAssetId] = useState(null);
  const [removeExistingVideo, setRemoveExistingVideo] = useState(false);

  // Kapak seçim durumları
  const [existingCoverIndex, setExistingCoverIndex] = useState(-1);
  const [newCoverIndex, setNewCoverIndex] = useState(-1);

  // ── Yeni medya
  const [newVideo, setNewVideo] = useState(null);
  const [newVideoUrl, setNewVideoUrl] = useState(null);
  const [newImages, setNewImages] = useState([]); // File[]
  const [newImageUrls, setNewImageUrls] = useState([]); // string[]

  const [hasChanged, setHasChanged] = useState(false);
  const [isSizeLess, setIsSizeLess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  // Form açıkken stok değiştiyse sunucunun bildirdiği güncel değerler (kaydetmeden önce görülür).
  const [stockNotice, setStockNotice] = useState(null);

  const { addTask, updateTask, removeTask } = useUploadQueue();

  /* ---------------- Fetch + form doldurma ---------------- */
  useEffect(() => {
    const fetchCats = api.get("/categories");
    const fetchProd = api.get(`/products/${product._id}`);

    Promise.all([fetchCats, fetchProd]).then(([cRes, pRes]) => {
      setCats(cRes.data || []);

      const p = pRes.data;
      const isSub = !!p.category?.parent;
      setMainCat(isSub ? p.category.parent._id : p.category._id);
      setSubCat(isSub ? p.category._id : "");

      const pricing = normalizePricing(
        {
          originalPrice: p.originalPrice ?? "",
          discount: p.discount ?? "",
          price: p.price ?? "",
        },
        undefined
      );

      setFormData({
        name: p.name || "",
        originalPrice: pricing.values.originalPrice,
        discount: pricing.values.discount,
        price: pricing.values.price,
        description: p.description || "",
        color: p.color || "",
        // _id + loadedStock: sunucu satırı kimliğiyle eşler; stok form açıkken değiştiyse
        // (satış, ödeme adımında ayrım) yazmaz, güncel değeri bildirir.
        sizes: (p.sizes || []).map((s) => ({ ...s, id: uuid(), loadedStock: s.stock })),
      });
      setIsSizeLess(
        Array.isArray(p.sizes) &&
          p.sizes.length === 1 &&
          !String(p.sizes[0]?.size || "").trim()
      );

      const imgs = p.images || [];
      setImagePreviews(imgs);
      setKeepExistingImages(imgs); // varsayılan: hepsini tut
      setKeepExistingImageAssetIds(p.imageAssetIds || []);
      setExistingVideoAssetId(p.videoAssetId || null);
      setVideoPreview(p.video || null);
      setRemoveExistingVideo(false);

      // kapak: mevcutlardan ilkini varsayılan kapak yap
      setExistingCoverIndex(imgs.length > 0 ? 0 : -1);
      setNewCoverIndex(-1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Yeni seçilen medya için URL yönetimi ---------------- */
  useEffect(() => {
    const urls = newImages.map((f) => URL.createObjectURL(f));
    setNewImageUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [newImages]);

  useEffect(() => {
    if (!newVideo) {
      setNewVideoUrl(null);
      return;
    }
    const url = URL.createObjectURL(newVideo);
    setNewVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [newVideo]);

  /* ---------------- Alt kategori listesi ---------------- */
  const subOptions = useMemo(() => {
    const root = cats.find((c) => c._id === mainCat);
    if (root?.children?.length) return root.children;
    return cats.filter(
      (c) =>
        c.parent === mainCat ||
        (typeof c.parent === "object" && c.parent?._id === mainCat)
    );
  }, [cats, mainCat]);

  /* ---------- Fiyat alanları ---------- */
  const toNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const originalNumber = toNumber(formData.originalPrice);
  const priceNumber = toNumber(formData.price);

  const pricingReady = originalNumber !== null && priceNumber !== null;
  const pricingValid =
    pricingReady &&
    originalNumber >= 0 &&
    priceNumber >= 0 &&
    priceNumber <= originalNumber;
  const hasDiscount =
    pricingReady && priceNumber !== null && originalNumber !== null
      ? priceNumber < originalNumber - 0.005
      : false;
  const original = originalNumber ?? 0;
  const finalPrice = priceNumber ?? 0;

  const numericFieldCount = [
    formData.originalPrice,
    formData.price,
    formData.discount,
  ].reduce((count, val) => {
    if (val === "" || val === null || val === undefined) return count;
    const num = Number(val);
    return Number.isFinite(num) ? count + 1 : count;
  }, 0);

  const canComputePricing = numericFieldCount >= 2;

  const handleComputePricing = () => {
    setToast(null);
    const result = normalizePricing(
      {
        originalPrice: formData.originalPrice,
        discount: formData.discount,
        price: formData.price,
      },
      undefined
    );

    const numbers = result.numbers;
    if (numbers.original === null || numbers.price === null) {
      setToast({
        msg: "Geçerli iki fiyat değeri girin (örn. orijinal + indirimli veya orijinal + indirim).",
        type: "error",
      });
      return;
    }

    setFormData((prev) => ({ ...prev, ...result.values }));
    setHasChanged(true);
  };

  /* ---------------- Handlers ---------------- */
  const updatePricingField = (field, rawValue) => {
    setToast(null);
    setFormData((prev) => ({ ...prev, [field]: rawValue }));
    setHasChanged(true);
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    if (name === "originalPrice" || name === "discount" || name === "price") {
      updatePricingField(name, value);
      return;
    }
    setFormData((p) => ({ ...p, [name]: value }));
    setHasChanged(true);
  };

  const handleSizeChange = (i, key, value) => {
    setFormData((p) => {
      const list = [...p.sizes];
      list[i][key] = key === "stock" ? Number(value) : value;
      return { ...p, sizes: list };
    });
    setHasChanged(true);
  };

  const addSizeRow = () => {
    setFormData((p) => ({
      ...p,
      sizes: [...p.sizes, { id: uuid(), size: "", stock: 0 }],
    }));
    setHasChanged(true);
  };

  const removeSizeRow = (id) => {
    setFormData((p) => ({
      ...p,
      sizes: p.sizes.filter((s) => s.id !== id),
    }));
    setHasChanged(true);
  };

  const onMainCatChange = (id) => {
    setMainCat(id);
    setSubCat("");
    setHasChanged(true);
  };
  const onSubCatChange = (id) => {
    setSubCat(id);
    setHasChanged(true);
  };

  // ── Mevcut görseli kaldır
  const removeExistingImageAt = (idx) => {
    setKeepExistingImageAssetIds((prev) =>
      prev.filter((_, index) => index !== idx)
    );
    setKeepExistingImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      setImagePreviews(next);

      // kapak indeksi düzelt
      if (existingCoverIndex === idx) {
        // silinen kapaktı
        setExistingCoverIndex(next.length ? 0 : -1);
      } else if (existingCoverIndex > idx) {
        // sağdaki indeksler sola kayar
        setExistingCoverIndex(existingCoverIndex - 1);
      }
      return next;
    });
    setHasChanged(true);
  };

  // ── Mevcut videoyu kaldır
  const removeCurrentVideo = () => {
    setRemoveExistingVideo(true);
    setExistingVideoAssetId(null);
    setVideoPreview(null);
    setHasChanged(true);
  };

  // ── Yeni görseli kaldır
  const removeNewImageAt = (idx) => {
    setNewImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);

      // yeni kapak indeksi düzelt
      if (newCoverIndex === idx) {
        setNewCoverIndex(next.length ? 0 : -1);
      } else if (newCoverIndex > idx) {
        setNewCoverIndex(newCoverIndex - 1);
      }
      return next;
    });
    setHasChanged(true);
  };

  // ── Yeni videoyu kaldır
  const removeNewVideo = () => {
    setNewVideo(null);
    setHasChanged(true);
  };

  const hasProductImage =
    keepExistingImageAssetIds.length > 0 || newImages.length > 0;
  const stockRowsValid =
    formData.sizes.length > 0 &&
    formData.sizes.every((row) => {
      const stock = Number(row.stock);
      const sizeValid = isSizeLess || String(row.size || "").trim().length > 0;
      return sizeValid && Number.isSafeInteger(stock) && stock >= 0;
    });
  const formValid = Boolean(
    formData.name.trim() &&
      mainCat &&
      pricingValid &&
      hasProductImage &&
      stockRowsValid
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasProductImage) {
      setToast({
        msg: "Üründe en az bir görsel bırakmalısınız.",
        type: "error",
      });
      return;
    }
    if (!formValid) {
      setToast({
        msg: "Ürün adı, kategori, fiyat, görsel ve geçerli stok bilgilerini tamamlayın.",
        type: "error",
      });
      return;
    }

    setSubmitting(true);

    const pricingResult = resolvePricingForSubmit({
      originalPrice: formData.originalPrice,
      discount: formData.discount,
      price: formData.price,
    });

    if (!pricingResult.valid) {
      setToast({
        msg: "Fiyatı hesaplamak için en az iki alanı doldurup 'Fiyatı Hesapla' butonuna basın.",
        type: "error",
      });
      setSubmitting(false);
      return;
    }

    const { values } = pricingResult;

    // Kapak seçimine göre sıralamaları ayarla
    let orderedNew = [...newImages];

    if (newCoverIndex >= 0 && existingCoverIndex === -1) {
      orderedNew = moveIndexToFront(orderedNew, newCoverIndex);
    }
    // Not: Kapak ikisinden de seçili değilse (ikisi de -1) ya da ikisi birden seçiliyse,
    // hiçbirini zorla öne çekmiyoruz. (UI ikisini aynı anda seçtirmiyor zaten.)

    const taskId = uuid();
    addTask({
      id: taskId,
      name: `Ürün güncelleniyor: ${formData.name || "Ürün"}`,
      progress: 0,
    });

    try {
      const reportProgress = (progress) =>
        updateTask(taskId, {
          progress:
            progress.phase === "processing"
              ? 95
              : progress.phase === "ready"
              ? 100
              : Math.round(progress.percent * 0.9),
          phase: progress.phase,
          status: progress.phase,
        });
      const [newImageAssets, newVideoAsset] = await Promise.all([
        uploadMediaFiles(orderedNew, "product_image", {
          concurrency: 2,
          onProgress: reportProgress,
        }),
        newVideo
          ? uploadMediaFile(newVideo, "product_video", {
              onProgress: reportProgress,
            })
          : Promise.resolve(null),
      ]);
      let orderedKeepIds = [...keepExistingImageAssetIds];
      if (existingCoverIndex >= 0 && newCoverIndex === -1) {
        orderedKeepIds = moveIndexToFront(orderedKeepIds, existingCoverIndex);
      }
      const newIds = newImageAssets.map((asset) => asset.id);
      const finalImageIds =
        newCoverIndex >= 0 && existingCoverIndex === -1
          ? [...newIds, ...orderedKeepIds]
          : [...orderedKeepIds, ...newIds];
      await api.put(`/products/${product._id}`, {
        name: formData.name || "",
        price: values.price,
        originalPrice: values.originalPrice,
        discount: values.discount || "0.00",
        description: formData.description || "",
        color: formData.color || "",
        sizes: formData.sizes || [],
        category: subCat || mainCat,
        imageAssetIds: finalImageIds,
        videoAssetId: newVideoAsset?.id || existingVideoAssetId || null,
      });

      updateTask(taskId, { progress: 100, status: "success" });
      setTimeout(() => removeTask(taskId), 1800);

      setToast({ msg: "Ürün güncellendi", type: "success" });
      setStockNotice(null);
      onSaved();
    } catch (err) {
      console.error("Ürün güncelleme hatası:", err);
      const data = err?.response?.data;
      if (data?.code === "STOCK_CHANGED" && Array.isArray(data.sizes)) {
        setFormData((current) => ({ ...current, sizes: applyStockConflict(current.sizes, data.sizes) }));
        setStockNotice(data.message);
      }
      const message = mediaErrorMessage(
        err,
        err?.response?.data?.message || "Güncelleme hatası"
      );
      updateTask(taskId, {
        progress: 100,
        status: "error",
        errorMsg: message,
      });
      setTimeout(() => removeTask(taskId), 4000);

      setToast({ msg: message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (n) =>
    `₺${Number(n || 0).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  /* ---------------- UI ---------------- */
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* iki kolon: mobile 1, xl 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* SOL: FORM */}
        <div className="space-y-4 bg-white p-4 sm:p-6 rounded-lg shadow-md">
          {/* üst alanlar */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Ürün Adı */}
            <div className="space-y-1 min-w-0">
              <label className="text-sm font-medium">Ürün Adı</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleInput}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Örn. Oversize Tişört"
              />
            </div>

            {/* Renk */}
            <div className="space-y-1 min-w-0">
              <label className="text-sm font-medium">Renk</label>
              <input
                name="color"
                value={formData.color}
                onChange={handleInput}
                maxLength={80}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Örn. Siyah"
              />
            </div>

            {/* Fiyatlar */}
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1 min-w-0">
                <label className="text-sm font-medium">Orijinal Fiyat *</label>
                <input
                  type="number"
                  inputMode="decimal"
                  name="originalPrice"
                  min="0"
                  step="0.01"
                  value={formData.originalPrice}
                  onChange={handleInput}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Örn. 799.90"
                />
              </div>
              <div className="space-y-1 min-w-0">
                <label className="text-sm font-medium">İndirim (%)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  name="discount"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.discount}
                  onChange={handleInput}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Örn. 25"
                />
              </div>
              <div className="space-y-1 min-w-0">
                <label className="text-sm font-medium">İndirimli Fiyat</label>
                <input
                  type="number"
                  inputMode="decimal"
                  name="price"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleInput}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Örn. 599.90"
                />
              </div>
            </div>
            <div className="sm:col-span-2 flex justify-end mt-2">
              <button
                type="button"
                onClick={handleComputePricing}
                disabled={!canComputePricing}
                className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                  canComputePricing
                    ? "border-blue-600 text-blue-600 hover:bg-blue-50"
                    : "border-gray-300 text-gray-400 cursor-not-allowed"
                }`}
              >
                Fiyatı Hesapla
              </button>
            </div>

            {/* Kategori */}
            <div className="space-y-1 min-w-0">
              <label className="text-sm font-medium">Kategori</label>
              <select
                value={mainCat}
                onChange={(e) => onMainCatChange(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="">Seçiniz</option>
                {cats
                  .filter((c) => !c.parent)
                  .map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
              </select>

              {subOptions.length > 0 && (
                <select
                  value={subCat}
                  onChange={(e) => onSubCatChange(e.target.value)}
                  className="w-full mt-2 px-4 py-2 border rounded-lg"
                >
                  <option value="">Alt Kategori Seç</option>
                  {subOptions.map((sc) => (
                    <option key={sc._id} value={sc._id}>
                      {sc.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Açıklama */}
          <div className="min-w-0">
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInput}
              rows={4}
              className="w-full px-4 py-3 border rounded-lg"
              placeholder="Açıklama"
            />
          </div>

          {/* Beden & Stok — mobile-first */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isSizeLess}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsSizeLess(checked);
                  setFormData((current) => ({
                    ...current,
                    sizes: checked
                      ? [
                          {
                            id: uuid(),
                            size: "",
                            stock: current.sizes[0]?.stock || 0,
                          },
                        ]
                      : [],
                  }));
                  setHasChanged(true);
                }}
              />
              Bedensiz ürün (tek stok)
            </label>

            {stockNotice && (
              <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {stockNotice}
              </p>
            )}

            {isSizeLess ? (
              <div>
                <label className="block text-sm font-medium">Toplam Stok *</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={formData.sizes[0]?.stock ?? 0}
                  onChange={(e) => {
                    setFormData((current) => ({
                      ...current,
                      sizes: [
                        {
                          // Satırın kimliği ve açılıştaki stoğu korunur.
                          ...current.sizes[0],
                          id: current.sizes[0]?.id || uuid(),
                          size: "",
                          stock: Number(e.target.value),
                        },
                      ],
                    }));
                    setHasChanged(true);
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            ) : (
              <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <label className="font-medium">Beden & Stok Satırları</label>
              <button
                type="button"
                className="text-blue-600 text-sm self-start sm:self-auto"
                onClick={addSizeRow}
              >
                + Satır Ekle
              </button>
            </div>

            <div className="space-y-2">
              {formData.sizes.map(({ id, size, stock }, i) => (
                <div
                  key={id}
                  className="grid grid-cols-4 gap-2 sm:gap-3 items-center"
                >
                  <input
                    value={size}
                    placeholder="Beden"
                    onChange={(e) =>
                      handleSizeChange(i, "size", e.target.value)
                    }
                    className="col-span-2 px-3 py-2 border rounded-lg"
                  />
                  <input
                    value={stock}
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    placeholder="Stok"
                    onChange={(e) =>
                      handleSizeChange(i, "stock", e.target.value)
                    }
                    className="col-span-1 px-3 py-2 border rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeSizeRow(id)}
                    className="col-span-1 text-red-500 justify-self-end px-3 py-2 rounded hover:bg-red-50"
                    title="Satırı sil"
                    aria-label="Satırı sil"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
              </>
            )}
          </div>

          {/* Yeni Medya Yükleyiciler */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Yeni Video (Opsiyonel)
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const selected = e.target.files[0] || null;
                  try {
                    if (selected) {
                      validateMediaFile(selected, "product_video");
                      startMediaPreparation(selected, "product_video");
                    }
                    setNewVideo(selected);
                    setHasChanged(true);
                  } catch (error) {
                    setToast({ msg: mediaErrorMessage(error), type: "error" });
                    e.target.value = "";
                  }
                }}
                className="block w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Yeni Görseller
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={async (e) => {
                  const { files } = e.target;
                  if (!files || files.length === 0) {
                    setNewImages([]);
                    setNewCoverIndex(-1);
                    setHasChanged(true);
                    return;
                  }
                  const selected = Array.from(files);
                  e.target.value = "";
                  if (
                    selected.length + keepExistingImageAssetIds.length >
                    6
                  ) {
                    setToast({
                      msg: "Bir üründe en fazla 6 görsel olabilir.",
                      type: "error",
                    });
                    return;
                  }
                  try {
                    selected.forEach((file) => {
                      validateMediaFile(file, "product_image");
                      startMediaPreparation(file, "product_image");
                    });
                    setNewImages(selected);
                    // yeni görsel geldiğinde kapak yeni taraftan seçilecekse buna izin ver
                    setNewCoverIndex(-1);
                    setHasChanged(true);
                  } catch (error) {
                    setToast({ msg: mediaErrorMessage(error), type: "error" });
                  }
                }}
                className="block w-full text-sm"
              />
            </div>
          </div>

          {/* Butonlar */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100 w-full sm:w-auto"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={
                !hasChanged || submitting || !formValid
              }
              className={`px-4 py-2 rounded-lg text-white w-full sm:w-auto ${
                !hasChanged || submitting || !formValid
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {submitting ? "Kaydediliyor…" : "Güncelle"}
            </button>
          </div>

          {!hasProductImage && (
            <p className="text-xs text-red-600">
              Üründe en az bir görsel bırakmalısınız.
            </p>
          )}

          {toast && <ToastAlert {...toast} onClose={() => setToast(null)} />}
        </div>

        {/* SAĞ: ÖNİZLEME & MEVCUT/YENİ MEDYA LİSTELERİ */}
        <div className="space-y-4">
          {/* Kart Önizleme — üste aldım ki her zaman görünür olsun */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="p-4">
              <p className="font-medium line-clamp-1">
                {formData.name || "Ürün adı"}
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                {hasDiscount ? (
                  <>
                    <span className="text-xs text-gray-400 line-through">
                      {original ? fmt(original) : "—"}
                    </span>
                    <span className="text-blue-700 font-semibold">
                      {finalPrice ? fmt(finalPrice) : "—"}
                    </span>
                  </>
                ) : (
                  <span className="text-blue-700 font-semibold">
                    {finalPrice
                      ? fmt(finalPrice)
                      : original
                      ? fmt(original)
                      : "Fiyat"}
                  </span>
                )}
                {formData.color && <Badge>{formData.color}</Badge>}
              </div>
            </div>
          </div>

          {/* Mevcut Video */}
          {videoPreview && !removeExistingVideo && !newVideoUrl && (
            <section className="bg-white p-4 sm:p-6 rounded-lg shadow-md relative">
              <label className="block mb-2 font-medium">Mevcut Video</label>
              <div className="relative">
                <video
                  src={videoPreview}
                  controls
                  className="w-full rounded-lg shadow h-56 object-cover"
                />
                <button
                  type="button"
                  onClick={removeCurrentVideo}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center shadow ring-2 ring-white"
                  title="Mevcut videoyu kaldır"
                >
                  −
                </button>
              </div>
            </section>
          )}

          {/* Yeni Video Önizleme */}
          {newVideoUrl && (
            <section className="bg-white p-4 sm:p-6 rounded-lg shadow-md relative">
              <label className="block mb-2 font-medium">Yeni Video</label>
              <div className="relative">
                <video
                  src={newVideoUrl}
                  controls
                  className="w-full rounded-lg shadow h-56 object-cover"
                />
                <button
                  type="button"
                  onClick={removeNewVideo}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center shadow ring-2 ring-white"
                  title="Yeni videoyu kaldır"
                >
                  −
                </button>
              </div>
            </section>
          )}

          {/* Mevcut Görseller */}
          {keepExistingImages.length > 0 && newImageUrls.length === 0 && (
            <section className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
              <label className="block mb-2 font-medium">Mevcut Görseller</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {keepExistingImages.map((src, i) => {
                  const isCover =
                    existingCoverIndex === i && newCoverIndex === -1;
                  return (
                    <div key={`ex-${i}`} className="relative group">
                      <img
                        src={src}
                        alt=""
                        className={`w-full aspect-square object-cover rounded-lg ${
                          isCover ? "ring-2 ring-green-500" : ""
                        }`}
                        loading="lazy"
                      />

                      {/* Kapak yap butonu (sol üst) */}
                      {!isCover && (
                        <button
                          type="button"
                          onClick={() => {
                            setExistingCoverIndex(i);
                            setNewCoverIndex(-1);
                            setHasChanged(true);
                          }}
                          className="absolute top-2 left-2 px-2 py-1 text-[10px] rounded bg-white/90 hover:bg-white shadow"
                          title="Kapak yap"
                        >
                          Kapak yap
                        </button>
                      )}

                      {/* Kapak etiketi + şeffaf overlay */}
                      {isCover && (
                        <>
                          <div className="absolute inset-0 bg-black/10 rounded-lg pointer-events-none" />
                          <span className="absolute top-2 left-2 px-2 py-1 text-[10px] rounded bg-green-600 text-white shadow">
                            Kapak
                          </span>
                        </>
                      )}

                      {/* Sil butonu (sağ üst) */}
                      <button
                        type="button"
                        onClick={() => removeExistingImageAt(i)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center shadow ring-2 ring-white"
                        title="Mevcut görseli kaldır"
                      >
                        −
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Yeni Görseller */}
          {newImageUrls.length > 0 && (
            <section className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
              <label className="block mb-2 font-medium">Yeni Görseller</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {newImageUrls.map((src, i) => {
                  const isCover =
                    newCoverIndex === i && existingCoverIndex === -1;
                  return (
                    <div key={`new-${i}`} className="relative group">
                      <img
                        src={src}
                        alt=""
                        className={`w-full aspect-square object-cover rounded-lg ${
                          isCover ? "ring-2 ring-green-500" : ""
                        }`}
                        loading="lazy"
                      />

                      {/* Kapak yap butonu (sol üst) */}
                      {!isCover && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewCoverIndex(i);
                            setExistingCoverIndex(-1);
                            setHasChanged(true);
                          }}
                          className="absolute top-2 left-2 px-2 py-1 text-[10px] rounded bg-white/90 hover:bg-white shadow"
                          title="Kapak yap"
                        >
                          Kapak yap
                        </button>
                      )}

                      {/* Kapak etiketi + overlay */}
                      {isCover && (
                        <>
                          <div className="absolute inset-0 bg-black/10 rounded-lg pointer-events-none" />
                          <span className="absolute top-2 left-2 px-2 py-1 text-[10px] rounded bg-green-600 text-white shadow">
                            Kapak
                          </span>
                        </>
                      )}

                      {/* Sil butonu (sağ üst) */}
                      <button
                        type="button"
                        onClick={() => removeNewImageAt(i)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center shadow ring-2 ring-white"
                        title="Yeni görseli kaldır"
                      >
                        −
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </form>
  );
}
