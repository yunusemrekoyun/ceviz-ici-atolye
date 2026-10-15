// src/pages/admin/forms/AddNewColorForm.jsx
import React, { useEffect, useState } from "react";
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

const Badge = ({ children }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
    {children}
  </span>
);

// Yardımcı: bir dizideki elemanı başa taşı
const moveIndexToFront = (arr, idx) => {
  if (!Array.isArray(arr) || idx <= 0 || idx >= arr.length) return arr;
  const copy = [...arr];
  const [sel] = copy.splice(idx, 1);
  return [sel, ...copy];
};

export default function AddNewColorForm({ product, onClose, onSaved }) {
  const [formData, setFormData] = useState({
    name: "",
    originalPrice: "",
    discount: "",
    price: "",
    description: "",
    color: "",
    sizes: [],
  });

  // Yeni seçilen medya
  const [video, setVideo] = useState(null);
  const [images, setImages] = useState([]); // File[]
  const [imageUrls, setImageUrls] = useState([]); // preview urls
  const [newCoverIndex, setNewCoverIndex] = useState(-1);

  // Mevcut (base üründen gelen) medya
  const [existingVideo, setExistV] = useState("");
  const [existingImages, setExistI] = useState([]);
  const [existingVideoAssetId, setExistingVideoAssetId] = useState(null);
  const [existingImageAssetIds, setExistingImageAssetIds] = useState([]);
  const [existingCoverIndex, setExistingCoverIndex] = useState(
    -1 /* base'ten gelir gelmez set edilecek */
  );

  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isSizeLess, setIsSizeLess] = useState(false);

  const { addTask, updateTask, removeTask } = useUploadQueue();

  // Yeni seçilen görseller için preview URL'leri
  useEffect(() => {
    const urls = images.map((f) => URL.createObjectURL(f));
    setImageUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [images]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/products/${product._id}`);
        const pricing = normalizePricing(
          {
            originalPrice: data.originalPrice ?? "",
            discount: data.discount ?? "",
            price: data.price ?? "",
          },
          undefined
        );

        setFormData({
          name: data.name ?? "",
          originalPrice: pricing.values.originalPrice,
          discount: pricing.values.discount,
          price: pricing.values.price,
          description: data.description ?? "",
          color: "",
          sizes: data.sizes?.length
            ? data.sizes.map((row) => ({ ...row, id: uuid() }))
            : [],
        });
        setExistV(data.video || "");
        const exImgs = data.images || [];
        setExistI(exImgs);
        setExistingVideoAssetId(data.videoAssetId || null);
        setExistingImageAssetIds(data.imageAssetIds || []);
        setIsSizeLess(
          Array.isArray(data.sizes) &&
            data.sizes.length === 1 &&
            !String(data.sizes[0]?.size || "").trim()
        );
        setExistingCoverIndex(exImgs.length ? 0 : -1); // varsa ilki kapak
        setNewCoverIndex(-1);
      } catch (err) {
        console.error("Ürün detayları alınamadı:", err);
      }
    })();
  }, [product]);

  /* ---------- Fiyat hesaplama (üçlü) ---------- */
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
        msg: "Fiyatı hesaplamak için geçerli iki alan girin.",
        type: "error",
      });
      return;
    }
    setFormData((prev) => ({ ...prev, ...result.values }));
  };

  const fmt = (n) =>
    `₺${Number(n || 0).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const updatePricingField = (field, rawValue) => {
    setToast(null);
    setFormData((prev) => ({ ...prev, [field]: rawValue }));
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setToast(null);
    if (name === "originalPrice" || name === "discount" || name === "price") {
      updatePricingField(name, value);
      return;
    }
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSizeChange = (i, key, value) =>
    setFormData((p) => {
      const list = [...p.sizes];
      list[i][key] = key === "stock" ? Number(value) : value;
      return { ...p, sizes: list };
    });

  const addSizeRow = () =>
    setFormData((p) => ({
      ...p,
      sizes: [...p.sizes, { id: uuid(), size: "", stock: 0 }],
    }));

  const removeSizeRow = (id) =>
    setFormData((p) => ({ ...p, sizes: p.sizes.filter((s) => s.id !== id) }));

  // ---- Mevcut/yeni medya kaldırma ----
  const removeImageAt = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    if (newCoverIndex === idx) {
      setNewCoverIndex(images.length - 1 > 0 ? 0 : -1);
    } else if (newCoverIndex > idx) {
      setNewCoverIndex((c) => c - 1);
    }
  };
  const clearVideo = () => setVideo(null);

  const removeExistingImageAt = (idx) => {
    setExistingImageAssetIds((prev) => prev.filter((_, i) => i !== idx));
    setExistI((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (existingCoverIndex === idx) {
        setExistingCoverIndex(next.length ? 0 : -1);
      } else if (existingCoverIndex > idx) {
        setExistingCoverIndex((c) => c - 1);
      }
      return next;
    });
  };
  const clearExistingVideo = () => {
    setExistV("");
    setExistingVideoAssetId(null);
  };

  const hasProductImage =
    images.length > 0 || existingImageAssetIds.length > 0;
  const stockRowsValid =
    formData.sizes.length > 0 &&
    formData.sizes.every((row) => {
      const stock = Number(row.stock);
      const sizeValid = isSizeLess || String(row.size || "").trim().length > 0;
      return sizeValid && Number.isSafeInteger(stock) && stock >= 0;
    });
  const formValid = Boolean(
    formData.name.trim() &&
      formData.color.trim() &&
      pricingValid &&
      hasProductImage &&
      stockRowsValid
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.color.trim())
      return setToast({ msg: "Renk alanı zorunludur.", type: "error" });

    if (!hasProductImage) {
      return setToast({
        msg: "Ürün renginde en az bir görsel bulunmalıdır.",
        type: "error",
      });
    }

    if (!stockRowsValid)
      return setToast({
        msg: "Bedenleri ve sıfır veya daha büyük tam sayı stokları tamamlayın.",
        type: "error",
      });

    const pricingResult = resolvePricingForSubmit({
      originalPrice: formData.originalPrice,
      discount: formData.discount,
      price: formData.price,
    });
    if (!pricingResult.valid) {
      return setToast({
        msg: "Fiyatı hesaplamak için en az iki alanı doldurup 'Fiyatı Hesapla' butonuna basın.",
        type: "error",
      });
    }

    // Kapak mantığı:
    // - Yeni görseller varsa: newCoverIndex >= 0 ise o görseli başa çek.
    // - Yeni görsel yoksa ve mevcutlardan kapak seçildiyse: backend mevcut sıralamayı miras alır,
    //   burada sıralamayı değiştiremeyiz. Uyarı amaçlı bir toast gösterebiliriz.
    let orderedNew = [...images];
    if (orderedNew.length > 0 && newCoverIndex >= 0) {
      orderedNew = moveIndexToFront(orderedNew, newCoverIndex);
    }

    const taskId = uuid();
    addTask({
      id: taskId,
      name: `Renk ekleniyor: ${formData.color || "Yeni renk"}`,
      progress: 0,
    });

    try {
      setSubmitting(true);
      const progressHandler = (progress) =>
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
          onProgress: progressHandler,
        }),
        video
          ? uploadMediaFile(video, "product_video", {
              onProgress: progressHandler,
            })
          : Promise.resolve(null),
      ]);
      let keptIds = [...existingImageAssetIds];
      if (orderedNew.length === 0 && existingCoverIndex >= 0) {
        keptIds = moveIndexToFront(keptIds, existingCoverIndex);
      }
      await api.post(`/products/new-color/${product._id}`, {
        name: formData.name || "",
        price: pricingResult.values.price,
        originalPrice: pricingResult.values.originalPrice,
        discount: pricingResult.values.discount || "0.00",
        description: formData.description || "",
        color: formData.color.trim(),
        sizes: isSizeLess
          ? [{ size: "", stock: formData.sizes[0]?.stock || 0 }]
          : formData.sizes,
        imageAssetIds: [
          ...newImageAssets.map((asset) => asset.id),
          ...keptIds,
        ].slice(0, 6),
        videoAssetId: newVideoAsset?.id || existingVideoAssetId || null,
      });

      updateTask(taskId, { progress: 100, status: "success" });
      setTimeout(() => removeTask(taskId), 1800);

      setToast({ msg: "Yeni renk eklendi.", type: "success" });
      onSaved();
    } catch (err) {
      const message = mediaErrorMessage(
        err,
        err?.response?.data?.message || "Yeni renk eklenirken hata oluştu."
      );
      updateTask(taskId, {
        progress: 100,
        status: "error",
        errorMsg: message,
      });
      setTimeout(() => removeTask(taskId), 4000);
      setToast({
        msg: message,
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 bg-white p-6 rounded-lg shadow-md overflow-auto max-h-[calc(100vh-12rem)]"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SOL: FORM */}
        <div className="space-y-4">
          {/* Renk */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Yeni Renk *
            </label>
            <input
              name="color"
              value={formData.color}
              onChange={handleInput}
              maxLength={80}
              placeholder="Örn. Kırmızı"
              className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500"
            />
          </div>

          {/* Fiyatlar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Orijinal Fiyat *
              </label>
              <input
                type="number"
                name="originalPrice"
                min="0"
                step="0.01"
                value={formData.originalPrice}
                onChange={handleInput}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Örn. 699.90"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                İndirim (%)
              </label>
              <input
                type="number"
                name="discount"
                min="0"
                max="100"
                step="0.01"
                value={formData.discount}
                onChange={handleInput}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Örn. 20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                İndirimli Fiyat
              </label>
              <input
                type="number"
                name="price"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleInput}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Örn. 559.90"
              />
            </div>
          </div>
          <div className="flex justify-end mt-2">
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

          {/* Bedensiz toggle */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isSizeLess}
              onChange={(e) => {
                const checked = e.target.checked;
                setIsSizeLess(checked);
                setFormData((p) => ({
                  ...p,
                  sizes: checked
                    ? [
                        {
                          id: uuid(),
                          size: "",
                          stock: p.sizes[0]?.stock || 0,
                        },
                      ]
                    : [],
                }));
              }}
            />
            Bedensiz ürün (tek stok)
          </label>

          {/* Beden & Stok */}
          {isSizeLess ? (
            <div>
              <label className="block text-sm font-medium">Toplam Stok *</label>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={formData.sizes[0]?.stock ?? 0}
                onChange={(e) =>
                  setFormData((current) => ({
                    ...current,
                    sizes: [
                      {
                        id: current.sizes[0]?.id || uuid(),
                        size: "",
                        stock: Number(e.target.value),
                      },
                    ],
                  }))
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">
                  Beden & Stok Satırları
                </label>
                <button
                  type="button"
                  onClick={addSizeRow}
                  className="text-blue-600 text-sm"
                >
                  + Satır Ekle
                </button>
              </div>

              {formData.sizes.map(({ id, size, stock }, i) => (
                <div key={id} className="flex items-center gap-3">
                  <input
                    value={size}
                    onChange={(e) =>
                      handleSizeChange(i, "size", e.target.value)
                    }
                    placeholder="Beden"
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                  <input
                    value={stock}
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    onChange={(e) =>
                      handleSizeChange(i, "stock", e.target.value)
                    }
                    placeholder="Stok"
                    className="w-32 px-3 py-2 border rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeSizeRow(id)}
                    className="text-red-500"
                    title="Satırı sil"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Medya */}
          <div className="space-y-4">
            {/* Video */}
            {video ? (
              <section className="relative">
                <label className="block mb-1 font-medium">Yeni Video</label>
                <div className="relative">
                  <video
                    src={URL.createObjectURL(video)}
                    controls
                    className="w-full rounded-lg shadow max-h-64 object-cover"
                  />
                  <button
                    type="button"
                    onClick={clearVideo}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center shadow ring-2 ring-white"
                    title="Kaldır"
                    aria-label="Videoyu kaldır"
                  >
                    −
                  </button>
                </div>
              </section>
            ) : existingVideo ? (
              <section className="relative">
                <label className="block mb-1 font-medium">Mevcut Video</label>
                <div className="relative">
                  <video
                    src={existingVideo}
                    controls
                    className="w-full rounded-lg shadow max-h-64 object-cover"
                  />
                  <button
                    type="button"
                    onClick={clearExistingVideo}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center shadow ring-2 ring-white"
                    title="Mevcut videoyu gizle"
                    aria-label="Mevcut videoyu kaldır"
                  >
                    −
                  </button>
                </div>
              </section>
            ) : null}

            {/* Yeni Görseller */}
            {imageUrls.length > 0 && (
              <section>
                <label className="block mb-2 font-medium">Yeni Görseller</label>
                <div className="grid grid-cols-3 gap-3">
                  {imageUrls.map((src, i) => {
                    const isCover =
                      newCoverIndex === i && existingCoverIndex === -1;
                    return (
                      <div key={`new-${i}`} className="relative">
                        <img
                          src={src}
                          alt=""
                          className={`w-full aspect-square object-cover rounded-lg border ${
                            isCover ? "ring-2 ring-green-500" : ""
                          }`}
                        />
                        {/* Kapak yap */}
                        {!isCover && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewCoverIndex(i);
                              setExistingCoverIndex(-1);
                            }}
                            className="absolute top-2 left-2 px-2 py-1 text-[10px] rounded bg-white/90 hover:bg-white shadow"
                            title="Kapak yap"
                          >
                            Kapak yap
                          </button>
                        )}
                        {/* Seçili kapak etiketi + overlay */}
                        {isCover && (
                          <>
                            <div className="absolute inset-0 bg-black/10 rounded-lg pointer-events-none" />
                            <span className="absolute top-2 left-2 px-2 py-1 text-[10px] rounded bg-green-600 text-white shadow">
                              Kapak
                            </span>
                          </>
                        )}
                        {/* Sil */}
                        <button
                          type="button"
                          onClick={() => removeImageAt(i)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center shadow ring-2 ring-white"
                          title="Görseli kaldır"
                          aria-label="Görseli kaldır"
                        >
                          −
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Mevcut Görseller (yeni yoksa göster) */}
            {imageUrls.length === 0 && existingImages.length > 0 && (
              <section>
                <label className="block mb-2 font-medium">
                  Mevcut Görseller
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {existingImages.map((img, i) => {
                    const isCover =
                      existingCoverIndex === i && newCoverIndex === -1;
                    return (
                      <div key={`ex-${i}`} className="relative">
                        <img
                          src={img}
                          alt=""
                          className={`w-full aspect-square object-cover rounded-lg border ${
                            isCover ? "ring-2 ring-green-500" : ""
                          }`}
                        />
                        {/* Kapak yap */}
                        {!isCover && (
                          <button
                            type="button"
                            onClick={() => {
                              setExistingCoverIndex(i);
                              setNewCoverIndex(-1);
                            }}
                            className="absolute top-2 left-2 px-2 py-1 text-[10px] rounded bg-white/90 hover:bg-white shadow"
                            title="Kapak yap"
                          >
                            Kapak yap
                          </button>
                        )}
                        {/* Seçili kapak etiketi + overlay */}
                        {isCover && (
                          <>
                            <div className="absolute inset-0 bg-black/10 rounded-lg pointer-events-none" />
                            <span className="absolute top-2 left-2 px-2 py-1 text-[10px] rounded bg-green-600 text-white shadow">
                              Kapak
                            </span>
                          </>
                        )}
                        {/* Sil */}
                        <button
                          type="button"
                          onClick={() => removeExistingImageAt(i)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center shadow ring-2 ring-white"
                          title="Mevcut görseli kaldır"
                          aria-label="Mevcut görseli kaldır"
                        >
                          −
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Yükleyiciler */}
            <div>
              <label className="block text-sm mb-1 font-medium">
                Yeni Video (Opsiyonel)
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const selected = e.target.files?.[0] || null;
                  try {
                    if (selected) {
                      validateMediaFile(selected, "product_video");
                      startMediaPreparation(selected, "product_video");
                    }
                    setVideo(selected);
                  } catch (error) {
                    setToast({ msg: mediaErrorMessage(error), type: "error" });
                    e.target.value = "";
                  }
                }}
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 font-medium">
                Yeni Görseller
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={async (e) => {
                  const { files } = e.target;
                  if (!files || files.length === 0) {
                    setImages([]);
                    setNewCoverIndex(-1);
                    return;
                  }
                  const selected = Array.from(files);
                  e.target.value = "";
                  if (selected.length + existingImageAssetIds.length > 6) {
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
                    setImages(selected);
                    setNewCoverIndex(-1);
                  } catch (error) {
                    setToast({ msg: mediaErrorMessage(error), type: "error" });
                  }
                }}
                className="text-sm"
              />
            </div>

            {!hasProductImage && (
              <p className="text-xs text-red-600">
                Ürün renginde en az bir görsel bulunmalıdır.
              </p>
            )}
          </div>

          {/* Alt Butonlar */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={submitting || !formValid}
              className={`px-4 py-2 rounded-lg text-white ${
                submitting || !formValid
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              Kaydet
            </button>
          </div>

          {toast && <ToastAlert {...toast} onClose={() => setToast(null)} />}
        </div>

        {/* SAĞ: Hızlı Önizleme */}
        <div className="rounded-xl border overflow-hidden">
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
      </div>
    </form>
  );
}
