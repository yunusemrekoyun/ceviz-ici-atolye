import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../../api";
import { v4 as uuidv4 } from "uuid";
import { useUploadQueue } from "../../context/UploadQueueContext";
import {
  mediaErrorMessage,
  startMediaPreparation,
  uploadMediaFile,
  validateMediaFile,
} from "../../services/mediaUpload";

/* Basit chip */
const Chip = ({ children }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100">
    {children}
  </span>
);

/* Basit rozet (renk destekli) */
const Badge = ({ children, color = "gray" }) => {
  const map = {
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    gray: "bg-gray-100 text-gray-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${map[color]}`}
    >
      {children}
    </span>
  );
};

/* 409 uyarı modalı */
const BlockedProductsModal = ({ open, onClose, data }) => {
  if (!open) return null;
  const groups = data?.productsByCategory || [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-xl p-6 shadow max-w-2xl w-full max-h-[80vh] overflow-auto">
        <h3 className="text-lg font-semibold mb-2">
          Silinemeyen Alt Kategoriler
        </h3>
        <p className="text-sm text-gray-700 mb-4">
          {data?.message ||
            "Bazı alt kategoriler ürüne bağlı olduğu için silinmedi. Lütfen önce bu ürünleri başka bir kategoriye taşıyın."}
        </p>
        <div className="space-y-5">
          {groups.length === 0 ? (
            <p className="text-sm text-gray-600">
              Listelenecek ürün bulunamadı.
            </p>
          ) : (
            groups.map((g) => (
              <div key={g.categoryId} className="border rounded-lg">
                <div className="px-4 py-2 border-b bg-gray-50 font-medium">
                  {g.categoryName}
                </div>
                {g.products.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">
                    Bu alt kategoriye bağlı ürün yok.
                  </div>
                ) : (
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {g.products.map((p) => (
                      <div
                        key={p._id}
                        className="flex items-center gap-3 border rounded p-2"
                      >
                        <img
                          src={
                            p.image ||
                            "https://via.placeholder.com/80x80?text=Img"
                          }
                          alt={p.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {p.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            Ürün ID: {p._id}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};

export default function CategoryFormModal({
  category,
  onClose,
  onSaved,
  onDirtyChange,
}) {
  const isEdit = Boolean(category);

  const [form, setForm] = useState({ name: "", image: null });
  const [childrenInput, setChildrenInput] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [dirty, setDirty] = useState(false);

  const [blockedModal, setBlockedModal] = useState(null);

  const [fieldErrors, setFieldErrors] = useState({ image: "" });
  const [infoMsg, setInfoMsg] = useState("");
  const [imageTooLarge, setImageTooLarge] = useState(false);

  const { addTask, updateTask, removeTask } = useUploadQueue();
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isEdit) {
      setForm({ name: category.name, image: null });
      setChildrenInput((category.children || []).map((c) => c.name).join(", "));
      setPreviewUrl(category.image || "");
    } else {
      setForm({ name: "", image: null });
      setChildrenInput("");
      setPreviewUrl("");
    }
    setDirty(false);
    setBlockedModal(null);
    setFieldErrors({ image: "" });
    setInfoMsg("");
    setImageTooLarge(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [category, isEdit]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const childTokens = useMemo(() => {
    return childrenInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [childrenInput]);

  const onPickFile = async (file) => {
    if (!file) return;
    try {
      validateMediaFile(file, "category_image");
      startMediaPreparation(file, "category_image");
      setForm((current) => ({ ...current, image: file }));
      setPreviewUrl(URL.createObjectURL(file));
      setFieldErrors({ image: "" });
      setInfoMsg("Görsel sunucuda farklı boyutlar için optimize edilecek.");
      setDirty(true);
      setImageTooLarge(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setFieldErrors({ image: mediaErrorMessage(err) });
      setInfoMsg("");
      setImageTooLarge(true);
    }
  };

  const handleChange = (e) => {
    const { name, files, value } = e.target;
    if (name === "image" && files?.length) {
      onPickFile(files[0]);
    } else if (name === "children") {
      setChildrenInput(value);
      setDirty(true);
    } else {
      setForm((f) => ({ ...f, [name]: value }));
      setDirty(true);
    }
  };

  const isValid =
    form.name.trim().length > 0 &&
    (isEdit || !!(form.image || previewUrl)) &&
    !imageTooLarge &&
    !fieldErrors.image;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.image && !isEdit) {
      onSaved("Lütfen görsel seçin.");
      return;
    }

    // uploadQueue task
    const id = uuidv4();
    addTask({ id, name: form.name || "Kategori", progress: 0 });

    try {
      const asset = form.image
        ? await uploadMediaFile(form.image, "category_image", {
            onProgress: (progress) =>
              updateTask(id, {
                progress:
                  progress.phase === "processing"
                    ? 95
                    : progress.phase === "ready"
                    ? 100
                    : Math.round(progress.percent * 0.9),
                phase: progress.phase,
                status: progress.phase,
              }),
          })
        : null;
      const payload = {
        name: form.name,
        children: childrenInput,
        ...(asset ? { imageAssetId: asset.id } : {}),
      };
      if (isEdit) {
        await api.put(`/categories/${category._id}`, payload);
      } else {
        await api.post("/categories", payload);
      }

      updateTask(id, { progress: 100, status: "success" });
      setTimeout(() => removeTask(id), 2000);

      setDirty(false);
      onSaved(null); // ✅ başarı → CategoriesPage modalı kapatır
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;

      updateTask(id, {
        progress: 100,
        status: "error",
        errorMsg: data?.message,
      });
      setTimeout(() => removeTask(id), 4000);

      if (status === 409 && data) {
        setBlockedModal(data);
        return; // modal açık kalsın
      }

      const msg = mediaErrorMessage(
        err,
        data?.message || "Kategori kaydedilemedi."
      );

      onSaved({ status, message: msg }); // ❌ hata → modal kapanmaz
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="overflow-auto max-h-[75vh] p-1 sm:p-0"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SOL: FORM */}
          <div className="space-y-4">
            {/* Ad */}
            <div>
              <label className="block text-sm font-medium">
                Kategori Adı *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Örn. Tişört"
              />
            </div>

            {/* Görsel */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Kapak Görseli {isEdit ? "(opsiyonel)" : "*"}
              </label>
              <label className="border-2 border-dashed rounded-xl p-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50">
                <span className="text-sm">
                  {form.image
                    ? form.image.name
                    : "Dosya seçin (JPG/PNG/WEBP/HEIC)"}
                </span>
                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  className="hidden"
                  onChange={handleChange}
                  required={!isEdit && !previewUrl}
                  ref={fileInputRef}
                />
              </label>
              {infoMsg && (
                <p className="text-xs text-gray-600 mt-1">{infoMsg}</p>
              )}
              {fieldErrors.image && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.image}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Sunucu limiti: 15MB. HEIC/HEIF dahil desteklenen dosyalar sunucuda optimize edilir.
              </p>
            </div>

            {/* Alt kategoriler */}
            <div>
              <label className="block text-sm font-medium">
                Alt Kategoriler
              </label>
              <input
                name="children"
                value={childrenInput}
                onChange={handleChange}
                placeholder="Virgülle ayırın: Oversize, Slim fit"
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {childTokens.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {childTokens.map((t, i) => (
                    <Chip key={`${t}-${i}`}>{t}</Chip>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 mt-1">Alt kategori yok</p>
              )}
            </div>

            {!isValid && (
              <p className="text-sm text-red-600">
                Kategori adı ve görsel zorunludur (düzenlemede görsel
                opsiyonel). Medya hatalarını düzeltmeden kaydedemezsiniz.
              </p>
            )}

            {/* Butonlar */}
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={!isValid || !dirty}
                className={`px-4 py-2 rounded-lg text-white ${
                  !isValid || !dirty
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isEdit ? "Güncelle" : "Ekle"}
              </button>
            </div>
          </div>

          {/* SAĞ: ÖNİZLEME */}
          <div>
            <p className="text-sm text-gray-600 mb-2">Canlı Önizleme</p>
            <div className="rounded-xl border overflow-hidden">
              <div className="relative h-36">
                {previewUrl ? (
                  <img
                    loading="lazy"
                    src={previewUrl}
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
                  <Badge color="blue">{isEdit ? "Düzenleme" : "Yeni"}</Badge>
                </div>
              </div>
              <div className="p-4">
                <p className="font-medium line-clamp-1">
                  {form.name || "Kategori adı"}
                </p>
                {childTokens.length > 0 ? (
                  <p className="text-sm text-gray-600 mt-1">
                    {childTokens.slice(0, 3).join(", ")}
                    {childTokens.length > 3
                      ? `, +${childTokens.length - 3}`
                      : ""}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 mt-1">Alt kategori yok</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* 409 modalı */}
      <BlockedProductsModal
        open={!!blockedModal}
        data={blockedModal}
        onClose={() => {
          setBlockedModal(null);
          onSaved?.();
        }}
      />
    </>
  );
}
