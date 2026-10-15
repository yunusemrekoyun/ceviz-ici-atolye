// src/pages/admin/modals/ProductFormModal.jsx
import React, { useState, useEffect, useMemo } from "react";
import api from "../../../api";
import { useUploadQueue } from "../../context/UploadQueueContext";
import { v4 as uuidv4 } from "uuid";
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

/* bir dizideki index’i başa taşı */
const moveIndexToFront = (arr, idx) => {
  if (!Array.isArray(arr) || idx <= 0 || idx >= arr.length) return arr;
  const copy = [...arr];
  const [picked] = copy.splice(idx, 1);
  return [picked, ...copy];
};

export default function ProductFormModal({ product, onClose, onSaved }) {
  // Bu form normalde "yeni ürün" için kullanılıyor; yine de esneklik dursun
  const isEdit = Boolean(product?._id);
  const [form, setForm] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const { addTask, updateTask, removeTask } = useUploadQueue();
  const [isNewColor, setIsNewColor] = useState(false);
  const [isSizeLess, setIsSizeLess] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Yeni görseller için önizleme URL’leri ve kapak index’i
  const [imageUrls, setImageUrls] = useState([]); // string[]
  const [coverIndex, setCoverIndex] = useState(-1);

  // Video önizleme ve kaldırma
  const [videoUrl, setVideoUrl] = useState(null);

  const updatePricingField = (field, rawValue) => {
    setForm((prev) => (prev ? { ...prev, [field]: rawValue } : prev));
  };

  /* --------- Kategoriler --------- */
  useEffect(() => {
    api.get("/categories").then((res) => setCategories(res.data));
  }, []);

  /* --------- Formu başlat --------- */
  useEffect(() => {
    if (product?.parentProductId && !product._id) {
      // Base ürünün üzerine yeni renk ekleme akışı (nadir durum)
      setIsNewColor(true);
      api.get(`/products/${product.parentProductId}`).then((res) => {
        const p = res.data;
        const cat = p.category || {};
        const pricing = normalizePricing(
          {
            originalPrice: p.originalPrice ?? "",
            discount: p.discount ?? "",
            price: p.price ?? "",
          },
          undefined
        );
        let parent = "",
          category = "";
        if (cat.parent && typeof cat.parent === "object") {
          parent = cat.parent._id;
          category = cat._id;
        } else {
          parent = cat._id;
          category = "";
        }
        setForm({
          name: p.name || "",
          parent,
          category,
          video: undefined,
          images: [],
          originalPrice: pricing.values.originalPrice,
          discount: pricing.values.discount,
          price: pricing.values.price,
          sizes: Array.isArray(p.sizes)
            ? p.sizes.map((s) => ({ size: s.size, stock: s.stock }))
            : [],
          description: p.description ?? "",
          color: "",
          parentProductId: p._id,
        });
        setIsSizeLess(
          Array.isArray(p.sizes) &&
            p.sizes.length === 1 &&
            !String(p.sizes[0]?.size || "").trim()
        );
        setImageUrls([]);
        setCoverIndex(-1);
        setVideoUrl(null);
      });
    } else if (product && product._id) {
      // (Genelde EditProductForm kullanıyoruz; yine de uyumlu kalsın)
      setIsNewColor(false);
      api.get(`/products/${product._id}`).then((res) => {
        const p = res.data;
        const cat = p.category || {};
        const pricing = normalizePricing(
          {
            originalPrice: p.originalPrice ?? "",
            discount: p.discount ?? "",
            price: p.price ?? "",
          },
          undefined
        );
        let parent = "",
          category = "";
        if (cat.parent && typeof cat.parent === "object") {
          parent = cat.parent._id;
          category = cat._id;
        } else {
          parent = cat._id;
          category = "";
        }
        setForm({
          name: p.name || "",
          parent,
          category,
          video: undefined,
          images: [],
          originalPrice: pricing.values.originalPrice,
          discount: pricing.values.discount,
          price: pricing.values.price,
          sizes: Array.isArray(p.sizes)
            ? p.sizes.map((s) => ({ size: s.size, stock: s.stock }))
            : [],
          description: p.description ?? "",
          color: p.color ?? "",
          parentProductId: p.parentProductId ?? "",
        });
        setIsSizeLess(
          Array.isArray(p.sizes) &&
            p.sizes.length === 1 &&
            !String(p.sizes[0]?.size || "").trim()
        );
        setImageUrls([]);
        setCoverIndex(-1);
        setVideoUrl(null);
      });
    } else {
      // Yeni ürün
      setIsNewColor(false);
      setForm({
        name: "",
        parent: "",
        category: "",
        video: undefined,
        images: [],
        originalPrice: "",
        discount: "",
        price: "",
        sizes: [],
        description: "",
        color: "",
        parentProductId: "",
      });
      setIsSizeLess(false);
      setImageUrls([]);
      setCoverIndex(-1);
      setVideoUrl(null);
    }
  }, [product]);

  /* --------- Yeni seçilen görseller için preview URL üret ----- */
  useEffect(() => {
    if (!form?.images) return;
    const urls = form.images.map((f) => URL.createObjectURL(f));
    setImageUrls(urls);
    // varsayılan kapak ilk görsel
    setCoverIndex(urls.length ? 0 : -1);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [form?.images]);

  /* --------- Video için preview URL ----- */
  useEffect(() => {
    if (!form?.video) {
      setVideoUrl(null);
      return;
    }
    const url = URL.createObjectURL(form.video);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form?.video]);

  /* --------- Parent/Child kategori seçimi --------- */
  const parentCats = useMemo(
    () => categories.filter((c) => !c.parent),
    [categories]
  );
  const selectedParent = useMemo(
    () => parentCats.find((c) => c._id === form?.parent),
    [parentCats, form?.parent]
  );
  const childCats = selectedParent?.children || [];

  /* --------- Fiyat türetme (üçlü) --------- */
  const toNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const originalNumber = toNumber(form?.originalPrice);
  const priceNumber = toNumber(form?.price);

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

  const numericFieldCount = (
    form ? [form.originalPrice, form.price, form.discount] : []
  ).reduce((count, val) => {
    if (val === "" || val === null || val === undefined) return count;
    const num = Number(val);
    return Number.isFinite(num) ? count + 1 : count;
  }, 0);

  const canComputePricing = numericFieldCount >= 2;

  const handleComputePricing = () => {
    if (!form) return;
    setFeedback(null);
    const result = normalizePricing(
      {
        originalPrice: form.originalPrice,
        discount: form.discount,
        price: form.price,
      },
      undefined
    );

    const numbers = result.numbers;
    if (numbers.original === null || numbers.price === null) {
      setFeedback({
        type: "error",
        message: "En az iki fiyat alanı için geçerli sayılar girin.",
      });
      return;
    }

    setForm((prev) => (prev ? { ...prev, ...result.values } : prev));
  };

  /* --------- Handlers --------- */
  const handleChange = async (e) => {
    const { name, value, files } = e.target;
    if (files) {
      if (name === "video") {
        try {
          if (files[0]) {
            validateMediaFile(files[0], "product_video");
            startMediaPreparation(files[0], "product_video");
          }
          setForm((f) => ({ ...f, video: files[0] }));
          setFeedback(null);
        } catch (error) {
          setFeedback({ type: "error", message: mediaErrorMessage(error) });
          e.target.value = "";
        }
        return;
      }
      const selectedFiles = Array.from(files);
      if (!selectedFiles.length) {
        setForm((f) => ({ ...f, images: [] }));
        setFeedback(null);
        return;
      }
      e.target.value = "";
      if (selectedFiles.length > 6) {
        setFeedback({
          type: "error",
          message: "Bir ürüne en fazla 6 görsel ekleyebilirsiniz.",
        });
        return;
      }
      try {
        selectedFiles.forEach((file) => {
          validateMediaFile(file, "product_image");
          startMediaPreparation(file, "product_image");
        });
        setForm((f) => ({ ...f, images: selectedFiles }));
        setFeedback(null);
      } catch (error) {
        setFeedback({ type: "error", message: mediaErrorMessage(error) });
      }
      return;
    }
    setFeedback(null);
    if (name === "originalPrice" || name === "discount" || name === "price") {
      updatePricingField(name, value);
      return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  };

  const addSize = () =>
    setForm((f) => ({ ...f, sizes: [...f.sizes, { size: "", stock: 0 }] }));

  const removeSize = (idx) =>
    setForm((f) => {
      const copy = [...f.sizes];
      copy.splice(idx, 1);
      return { ...f, sizes: copy };
    });

  // Görsel sil (kırmızı daire −)
  const removeImageAt = (idx) =>
    setForm((f) => {
      const next = [...(f.images || [])];
      next.splice(idx, 1);
      // kapak index düzenle
      if (coverIndex === idx) {
        setCoverIndex(next.length ? 0 : -1);
      } else if (coverIndex > idx) {
        setCoverIndex((c) => c - 1);
      }
      return { ...f, images: next };
    });

  // Video sil (kırmızı daire −)
  const removeVideo = () => {
    setForm((f) => ({ ...f, video: undefined }));
  };

  /* --------- Validasyon --------- */
  const stockRowsValid =
    form &&
    form.sizes.length > 0 &&
    form.sizes.every((row) => {
      const stock = Number(row.stock);
      const sizeValid = isSizeLess || String(row.size || "").trim().length > 0;
      return sizeValid && Number.isSafeInteger(stock) && stock >= 0;
    });
  const hasImages = Boolean(form?.images?.length);
  const isValid = Boolean(
    form &&
      form.name.trim() &&
      (form.category || form.parent) &&
      pricingValid &&
      stockRowsValid &&
      hasImages
  );

  /* --------- Submit --------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    const pricingResult = resolvePricingForSubmit({
      originalPrice: form.originalPrice,
      discount: form.discount,
      price: form.price,
    });

    if (!pricingResult.valid) {
      setFeedback({
        type: "error",
        message:
          "Fiyatı tamamlamak için en az iki alanı doldurun ve 'Fiyatı Hesapla' butonuna basın.",
      });
      return;
    }

    setLoading(true);
    const id = uuidv4();
    addTask({ id, name: form.name || "Yeni Ürün", progress: 0 });

    const { values } = pricingResult;

    // Kapak seçiliyse görselleri submit’te başa taşı
    const orderedImages =
      (form.images?.length || 0) > 0 && coverIndex >= 0
        ? moveIndexToFront(form.images, coverIndex)
        : form.images || [];

    try {
      const itemCount = orderedImages.length + (form.video ? 1 : 0);
      const itemProgress = new Array(Math.max(1, itemCount)).fill(0);
      const reportProgress = (index, progress) => {
        itemProgress[index] =
          progress.phase === "processing"
            ? 95
            : progress.phase === "ready"
            ? 100
            : Math.round(progress.percent * 0.9);
        const total = Math.round(
          itemProgress.reduce((sum, value) => sum + value, 0) /
            itemProgress.length
        );
        updateTask(id, {
          progress: total,
          phase: progress.phase,
          status: progress.phase === "ready" ? "uploading" : progress.phase,
        });
      };

      const imagePromise = uploadMediaFiles(orderedImages, "product_image", {
        concurrency: 2,
        onProgress: (progress, index) => reportProgress(index, progress),
      });
      const videoPromise = form.video
        ? uploadMediaFile(form.video, "product_video", {
            onProgress: (progress) =>
              reportProgress(orderedImages.length, progress),
          })
        : Promise.resolve(null);
      const [imageAssets, videoAsset] = await Promise.all([
        imagePromise,
        videoPromise,
      ]);
      const payload = {
        name: form.name,
        imageAssetIds: imageAssets.map((asset) => asset.id),
        videoAssetId: videoAsset?.id || null,
        price: values.price,
        originalPrice: values.originalPrice,
        discount: values.discount || "0.00",
        description: form.description || "",
        color: form.color || "",
        parentProductId: form.parentProductId || "",
        category: form.category || form.parent,
        sizes: form.sizes,
      };

      if (isEdit && !isNewColor) {
        await api.put(`/products/${product._id}`, payload);
      } else {
        await api.post("/products", payload);
      }

      updateTask(id, { progress: 100, status: "success" });
      setTimeout(() => removeTask(id), 2000);
      onSaved();
    } catch (err) {
      console.error("Ürün kaydı hatası:", err);
      const message = mediaErrorMessage(
        err,
        err.response?.data?.message || "Ürün kaydedilemedi."
      );
      updateTask(id, {
        progress: 100,
        status: "error",
        errorMsg: message,
      });
      setFeedback({ type: "error", message });
      setTimeout(() => removeTask(id), 4000);
    } finally {
      setLoading(false);
    }
  };

  if (!form) return null;

  /* --------- UI --------- */
  const fmt = (n) =>
    `₺${Number(n || 0).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {feedback && (
        <div
          className={`mb-4 rounded-lg px-4 py-2 text-sm ${
            feedback.type === "error"
              ? "bg-red-50 text-red-700"
              : "bg-blue-50 text-blue-700"
          }`}
        >
          {feedback.message}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SOL: FORM */}
        <div className="space-y-4">
          {/* Ürün Adı */}
          <div>
            <label className="block text-sm font-medium">Ürün Adı *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full border px-3 py-2 rounded-lg"
              placeholder="Örn. Oversize Tişört"
            />
          </div>

          {/* Fiyatlar (Yeni Mantık) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium">
                Orijinal Fiyat *
              </label>
              <input
                name="originalPrice"
                type="number"
                step="0.01"
                min="0"
                value={form.originalPrice}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded-lg"
                required
                placeholder="Örn. 799.90"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">İndirim (%)</label>
              <input
                name="discount"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.discount}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded-lg"
                placeholder="Örn. 25"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">
                İndirimli Fiyat
              </label>
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded-lg"
                placeholder="Örn. 599.90"
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

          {/* Renk */}
          <div>
            <label className="block text-sm font-medium">Renk</label>
            <input
              name="color"
              value={form.color}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded-lg"
              placeholder={isNewColor ? "Yeni rengi giriniz" : "Opsiyonel"}
            />
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-sm font-medium">Kategori *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                name="parent"
                value={form.parent}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    parent: e.target.value,
                    category: "",
                  }))
                }
                className="w-full border px-3 py-2 rounded-lg"
                required
              >
                <option value="">Ana kategori</option>
                {parentCats.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded-lg"
              >
                <option value="">Alt kategori yok</option>
                {childCats.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Beden & Stok */}
          <div>
            <label className="mb-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isSizeLess}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsSizeLess(checked);
                  setForm((current) => ({
                    ...current,
                    sizes: checked
                      ? [{ size: "", stock: current.sizes[0]?.stock || 0 }]
                      : [],
                  }));
                }}
              />
              Bedensiz ürün (tek stok)
            </label>

            {isSizeLess ? (
              <div>
                <label className="block text-sm font-medium">Toplam Stok *</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={form.sizes[0]?.stock ?? 0}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      sizes: [{ size: "", stock: Number(e.target.value) }],
                    }))
                  }
                  className="w-full border px-3 py-2 rounded-lg"
                  required
                />
              </div>
            ) : (
              <>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">Bedenler</label>
              <button
                type="button"
                onClick={addSize}
                className="text-blue-600 text-sm hover:underline"
              >
                + Satır Ekle
              </button>
            </div>

            <div className="space-y-2 mt-2">
              {form.sizes.map((s, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={s.size}
                    onChange={(e) => {
                      const copy = [...form.sizes];
                      copy[idx].size = e.target.value;
                      setForm((f) => ({ ...f, sizes: copy }));
                    }}
                    placeholder="Beden (S, M, L)"
                    className="w-1/2 border px-3 py-2 rounded-lg"
                    required
                  />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={s.stock}
                    onChange={(e) => {
                      const copy = [...form.sizes];
                      copy[idx].stock = parseInt(e.target.value || 0);
                      setForm((f) => ({ ...f, sizes: copy }));
                    }}
                    placeholder="Stok"
                    className="w-1/2 border px-3 py-2 rounded-lg"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeSize(idx)}
                    className="text-red-500"
                    title="Satırı sil"
                  >
                    Sil
                  </button>
                </div>
              ))}
            </div>
              </>
            )}
          </div>

          {/* Açıklama */}
          <div>
            <label className="block text-sm font-medium">Açıklama</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded-lg"
              rows={4}
              placeholder="Ürün açıklaması"
            />
          </div>

          {/* Medya */}
          <div className="space-y-3">
            {/* Video input + önizleme */}
            <div>
              <label className="block text-sm font-medium">
                Video (Opsiyonel)
              </label>
              <input
                type="file"
                name="video"
                accept="video/*"
                onChange={handleChange}
              />
              {videoUrl && (
                <div className="relative mt-2">
                  <video
                    src={videoUrl}
                    controls
                    className="w-full rounded-lg shadow max-h-64 object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeVideo}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center shadow ring-2 ring-white"
                    title="Videoyu kaldır"
                    aria-label="Videoyu kaldır"
                  >
                    −
                  </button>
                </div>
              )}
            </div>

            {/* Görseller input */}
            <div>
              <label className="block text-sm font-medium">
                Yeni Görseller
              </label>
              <label className="border-2 border-dashed rounded-xl p-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50">
                <span className="text-sm">
                  {form.images?.length
                    ? `${form.images.length} dosya seçildi`
                    : "Dosya seçin"}
                </span>
                <input
                  type="file"
                  name="images"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleChange}
                />
              </label>

              {/* Görsel grid + Kapak yap + Sil */}
              {imageUrls.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
                  {imageUrls.map((src, i) => {
                    const isCover = i === coverIndex;
                    return (
                      <div key={i} className="relative">
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
                            onClick={() => setCoverIndex(i)}
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
              )}
              {!hasImages && (
                <p className="mt-2 text-xs text-red-600">
                  Ürünü kaydetmek için en az bir görsel seçin.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SAĞ: ÖNİZLEME */}
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Canlı Önizleme</p>
          <div className="rounded-xl border overflow-hidden">
            <div className="relative h-48">
              {imageUrls[coverIndex] ? (
                <img
                  src={imageUrls[coverIndex]}
                  alt="Önizleme"
                  className="w-full h-full object-cover"
                />
              ) : form.images?.[0] ? (
                <img
                  src={URL.createObjectURL(form.images[0])}
                  alt="Önizleme"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                  Görsel seçilmedi
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent" />
              <div className="absolute top-2 left-2">
                {(form.category || form.parent) && (
                  <Badge>Kategori seçildi</Badge>
                )}
              </div>
            </div>

            <div className="p-4">
              <p className="font-medium line-clamp-1">
                {form.name || "Ürün adı"}
              </p>
              <p className="text-gray-600 text-sm line-clamp-2">
                {form.description || "Kısa açıklama metni burada görünecek."}
              </p>

              {/* Fiyat Görünümü */}
              <div className="mt-2 flex items-baseline gap-2">
                {hasDiscount ? (
                  <>
                    <span className="text-xs text-gray-400 line-through">
                      {fmt(original)}
                    </span>
                    <span className="text-blue-700 font-semibold">
                      {fmt(finalPrice)}
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
                {form.color && <Badge>{form.color}</Badge>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alt Butonlar */}
      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border rounded-lg hover:bg-gray-100"
        >
          Vazgeç
        </button>
        <button
          type="submit"
          disabled={loading || !isValid}
          className={`px-4 py-2 rounded-lg text-white ${
            loading || !isValid
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Kaydediliyor…" : isEdit ? "Güncelle" : "Ekle"}
        </button>
      </div>
    </form>
  );
}
