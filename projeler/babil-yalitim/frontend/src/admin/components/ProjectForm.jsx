// src/admin/components/ProjectForm.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import ToastAlert from "./ToastAlert";
import { ProjectPreview } from "./previews/ContentPreviews";
import OrderField from "./OrderField";
import AdminMediaGallery from "./AdminMediaGallery";
import { MEDIA_LIMIT_HINT } from "../utils/mediaFeedback";
import {
  appendOrderedMediaToFormData,
  buildMediaPreviewList,
  createExistingMediaItems,
  createNewMediaItems,
  moveMediaItem,
  removeMediaItem,
  revokeBlobUrl,
  toMediaType,
} from "../utils/mediaCollection";

const inputCls =
  "w-full rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:focus:border-indigo-500/50 dark:focus:ring-indigo-500/30";
const errorInputCls =
  "border-rose-300 focus:border-rose-300 focus:ring-rose-100 dark:border-rose-500/50 dark:focus:border-rose-400 dark:focus:ring-rose-500/20";

const ProjectForm = ({ initialData, onSubmit, submitting }) => {
  // toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "info", duration = 4000) =>
    setToast({ msg, type, duration });
  const [showPreview, setShowPreview] = useState(false);

  // text alanları
  const [title, setTitle] = useState(initialData?.title || "");
  const [displayOrder, setDisplayOrder] = useState(
    initialData?.displayOrder ? String(initialData.displayOrder) : ""
  );
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [category, setCategory] = useState(initialData?.category || "");

  // yeni eklenen tarih alanları (opsiyonel)
  const [startDate, setStartDate] = useState(initialData?.startDate || "");
  const [endDate, setEndDate] = useState(initialData?.endDate || "");

  // mevcut medya
  const existingCover = useMemo(
    () => initialData?.cover || null,
    [initialData?.cover]
  );
  const existingVideo = useMemo(
    () => initialData?.video || null,
    [initialData?.video]
  );
  // yeni seçilen dosyalar
  const [coverFile, setCoverFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);

  // önizlemeler
  const [coverPreview, setCoverPreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [removeExistingVideo, setRemoveExistingVideo] = useState(false);
  const [imageItems, setImageItems] = useState(() =>
    createExistingMediaItems(initialData?.images || [], "proje-gorsel")
  );
  const revokers = useRef([]);
  const [fieldErrors, setFieldErrors] = useState({
    title: "",
    cover: "",
    dateRange: "",
  });
  const [imageNotice, setImageNotice] = useState("");

  // toplam görsel adedi (max 4)
  const remainingImageSlots = useMemo(
    () => Math.max(0, 4 - imageItems.length),
    [imageItems.length]
  );

  useEffect(() => {
    setTitle(initialData?.title || "");
    setDisplayOrder(
      initialData?.displayOrder ? String(initialData.displayOrder) : ""
    );
    setDescription(initialData?.description || "");
    setCategory(initialData?.category || "");
    setStartDate(initialData?.startDate || "");
    setEndDate(initialData?.endDate || "");
    setCoverFile(null);
    setVideoFile(null);
    setCoverPreview(null);
    setVideoPreview(null);
    setRemoveExistingVideo(false);
    setImageItems(createExistingMediaItems(initialData?.images || [], "proje-gorsel"));
    setFieldErrors({ title: "", cover: "", dateRange: "" });
    setImageNotice("");
  }, [initialData]);

  useEffect(() => {
    return () => {
      revokers.current.forEach((u) => {
        if (u && u.startsWith("blob:")) URL.revokeObjectURL(u);
      });
      revokers.current = [];
    };
  }, []);

  const blobify = (file, setter) => {
    if (!file) return setter(null);
    const u = URL.createObjectURL(file);
    revokers.current.push(u);
    setter(u);
  };

  const handleCoverChange = (e) => {
    const f = e.target.files?.[0] || null;
    revokeBlobUrl(coverPreview);
    setCoverFile(f);
    blobify(f, setCoverPreview);
    setFieldErrors((prev) => ({ ...prev, cover: "" }));
  };

  const handleVideoChange = (e) => {
    const f = e.target.files?.[0] || null;
    revokeBlobUrl(videoPreview);
    setVideoFile(f);
    setRemoveExistingVideo(false);
    blobify(f, setVideoPreview);
  };

  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (remainingImageSlots === 0) {
      const message = "Maksimum görsel sayısına ulaştınız. Yeni görsel eklemek için önce mevcut bir görsel kaldırın.";
      setImageNotice(message);
      showToast(message, "info");
      e.target.value = "";
      return;
    }

    if (files.length > remainingImageSlots) {
      const message =
        remainingImageSlots === 1
          ? "Sadece 1 görsel daha eklenebildi. Diğer dosyalar atlandı."
          : `Sadece ilk ${remainingImageSlots} görsel eklendi. Diğer dosyalar atlandı.`;
      setImageNotice(message);
      showToast(message, "info");
    } else {
      setImageNotice("");
    }

    const limited = files.slice(0, remainingImageSlots);
    setImageItems((prev) => [
      ...prev,
      ...createNewMediaItems(
        limited,
        (file) => {
          const u = URL.createObjectURL(file);
          revokers.current.push(u);
          return u;
        },
        "proje-gorsel"
      ),
    ]);
    e.target.value = "";
  };

  const handleRemoveImage = (id) => {
    setImageNotice("");
    setImageItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.source === "new") revokeBlobUrl(target.src);
      return removeMediaItem(prev, id);
    });
  };

  const handleMoveImage = (id, direction) => {
    setImageItems((prev) => moveMediaItem(prev, id, direction));
  };

  const clearSelectedCover = () => {
    revokeBlobUrl(coverPreview);
    setCoverFile(null);
    setCoverPreview(null);
  };

  const clearSelectedVideo = () => {
    if (videoPreview) revokeBlobUrl(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
    if (existingVideo?.url) {
      setRemoveExistingVideo(true);
    }
  };

  const submit = (e) => {
    e.preventDefault();

    const hasInvalidDateRange =
      startDate &&
      endDate &&
      new Date(endDate).getTime() < new Date(startDate).getTime();

    const nextErrors = {
      title: title.trim() ? "" : "Başlık zorunludur.",
      cover:
        existingCover?.url || coverFile
          ? ""
          : "Kapak medyası zorunludur (görsel ya da video).",
      dateRange: hasInvalidDateRange
        ? "Bitiş tarihi, başlangıç tarihinden önce olamaz."
        : "",
    };

    setFieldErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      showToast("Lütfen işaretli alanları kontrol edin.", "error");
      return;
    }

    const fd = new FormData();
    fd.append("title", title);
    if (displayOrder.trim()) fd.append("displayOrder", displayOrder.trim());
    fd.append("description", description);
    fd.append("category", category);

    // tarih alanları opsiyonel
    if (startDate) fd.append("startDate", startDate);
    if (endDate) fd.append("endDate", endDate);

    if (coverFile) fd.append("cover", coverFile);
    if (videoFile) fd.append("video", videoFile);
    if (removeExistingVideo && !videoFile) fd.append("removeVideo", "1");
    appendOrderedMediaToFormData(fd, "images", imageItems, "imageOrder");

    onSubmit(fd);
  };

  const existingCoverType = existingCover?.resourceType || "image";
  const newCoverType = toMediaType(coverFile);

  const coverGalleryItems = useMemo(() => {
    if (coverPreview && coverFile) {
      return [
        {
          id: "cover:new",
          source: "new",
          src: coverPreview,
          type: newCoverType,
          alt: title || "proje-kapak",
          badge: "Yeni kapak",
          removable: true,
          file: coverFile,
        },
      ];
    }

    if (existingCover?.url) {
      return [
        {
          ...createExistingMediaItems([existingCover], "proje-kapak")[0],
          badge: "Mevcut kapak",
          removable: false,
        },
      ];
    }

    return [];
  }, [coverFile, coverPreview, existingCover, newCoverType, title]);

  const videoGalleryItems = useMemo(() => {
    if (videoPreview && videoFile) {
      return [
        {
          id: "video:new",
          source: "new",
          src: videoPreview,
          type: "video",
          alt: `${title}-video`,
          badge: "Yeni video",
          removable: true,
          file: videoFile,
        },
      ];
    }

    if (!removeExistingVideo && existingVideo?.url) {
      return [
        {
          ...createExistingMediaItems([existingVideo], "proje-video")[0],
          type: "video",
          badge: "Mevcut video",
          removable: true,
        },
      ];
    }

    return [];
  }, [existingVideo, removeExistingVideo, title, videoFile, videoPreview]);

  const previewData = useMemo(
    () => ({
      title,
      description,
      category,
      startDate: startDate ? startDate.split("T")[0] : "",
      endDate: endDate ? endDate.split("T")[0] : "",
      cover: {
        src: coverPreview || existingCover?.url || "",
        type: coverFile ? newCoverType : existingCoverType,
        alt: title,
      },
      video: {
        src:
          videoPreview ||
          (!removeExistingVideo ? existingVideo?.url || "" : ""),
        type: "video",
        alt: `${title}-video`,
      },
      images: buildMediaPreviewList(imageItems),
    }),
    [
      category,
      coverPreview,
      description,
      endDate,
      existingCover?.url,
      existingCoverType,
      existingVideo?.url,
      imageItems,
      newCoverType,
      removeExistingVideo,
      startDate,
      title,
      videoPreview,
      coverFile,
    ]
  );

  return (
    <form
      onSubmit={submit}
      className="grid grid-cols-1 gap-6 lg:grid-cols-5"
      noValidate
    >
      {/* Sol: metin alanları */}
      <div className="lg:col-span-3 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Başlık *
          </label>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setFieldErrors((prev) => ({ ...prev, title: "" }));
            }}
            required
            aria-invalid={Boolean(fieldErrors.title)}
            className={`mt-2 ${inputCls} ${
              fieldErrors.title ? errorInputCls : ""
            }`}
            placeholder="Proje başlığı"
          />
          {fieldErrors.title ? (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">
              {fieldErrors.title}
            </p>
          ) : null}
        </div>

        <OrderField value={displayOrder} onChange={setDisplayOrder} />

        <div className="grid gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Açıklama
            </label>
            <button
              type="button"
              onClick={() => setShowPreview((prev) => !prev)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100 dark:hover:border-slate-500"
            >
              {showPreview ? "Önizlemeyi gizle" : "Önizleme göster"}
            </button>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className={`mt-2 ${inputCls}`}
            placeholder="Proje açıklaması"
          />
        </div>

        {showPreview && <ProjectPreview preview={previewData} />}

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Kategori
          </label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`mt-2 ${inputCls}`}
            placeholder="Örn: Su Yalıtımı"
          />
        </div>

        {/* Başlangıç ve Bitiş tarihi alanları */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Başlangıç Tarihi
          </label>
          <input
            type="date"
            value={startDate ? startDate.split("T")[0] : ""}
            onChange={(e) => {
              setStartDate(e.target.value);
              setFieldErrors((prev) => ({ ...prev, dateRange: "" }));
            }}
            aria-invalid={Boolean(fieldErrors.dateRange)}
            className={`mt-2 ${inputCls} ${
              fieldErrors.dateRange ? errorInputCls : ""
            }`}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Bitiş Tarihi
          </label>
          <input
            type="date"
            value={endDate ? endDate.split("T")[0] : ""}
            onChange={(e) => {
              setEndDate(e.target.value);
              setFieldErrors((prev) => ({ ...prev, dateRange: "" }));
            }}
            aria-invalid={Boolean(fieldErrors.dateRange)}
            className={`mt-2 ${inputCls} ${
              fieldErrors.dateRange ? errorInputCls : ""
            }`}
          />
          {fieldErrors.dateRange ? (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">
              {fieldErrors.dateRange}
            </p>
          ) : null}
        </div>

        <div className="pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="btn-admin-primary disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "İşleniyor…" : "Kaydet"}
          </button>
        </div>
      </div>

      {/* Sağ: medya alanları */}
      <div className="lg:col-span-2 space-y-6">
        {/* Kapak */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Kapak Medyası * — Görsel veya Video
          </label>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleCoverChange}
            aria-invalid={Boolean(fieldErrors.cover)}
            className={`mt-2 w-full text-sm text-slate-600 dark:text-slate-200 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-[#2c2f36] dark:file:text-slate-100 ${
              fieldErrors.cover ? errorInputCls : ""
            }`}
          />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {MEDIA_LIMIT_HINT}
          </p>
          {fieldErrors.cover ? (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">
              {fieldErrors.cover}
            </p>
          ) : null}
          <div className="mt-3">
            <AdminMediaGallery
              items={coverGalleryItems}
              emptyText="Henüz kapak seçilmedi."
              columnsClassName="grid-cols-1"
              onRemove={coverFile ? clearSelectedCover : undefined}
            />
          </div>
        </div>

        {/* Opsiyonel tek video */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Opsiyonel Video (tek)
          </label>
          <input
            type="file"
            accept="video/*"
            onChange={handleVideoChange}
            className="mt-2 w-full text-sm text-slate-600 dark:text-slate-200 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-[#2c2f36] dark:file:text-slate-100"
          />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Video yüklemelerinde 50MB sınırı uygulanır. Limit aşılırsa sistem
            kaliteyi düşürmeden optimize etmeyi dener.
          </p>
          <div className="mt-3">
            <AdminMediaGallery
              items={videoGalleryItems}
              emptyText="Henüz video seçilmedi."
              columnsClassName="grid-cols-1"
              onRemove={videoGalleryItems.length ? clearSelectedVideo : undefined}
            />
          </div>
        </div>

        {/* Opsiyonel görseller (max 4 toplam) */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Opsiyonel Görseller (max 4) — Kalan eklenebilir:{" "}
            {remainingImageSlots}
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImagesChange}
            className="mt-2 w-full text-sm text-slate-600 dark:text-slate-200 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-[#2c2f36] dark:file:text-slate-100"
            disabled={remainingImageSlots === 0}
          />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Görseller için 20MB sınırı uygulanır. Limit aşılırsa sistem
            kaliteyi düşürmeden optimize etmeyi dener.
          </p>
          {imageNotice ? (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-200">
              {imageNotice}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Görselleri tıklayarak büyük inceleyebilir, kaldırabilir ve sırasını değiştirebilirsiniz.
          </p>
          <div className="mt-3">
            <AdminMediaGallery
              items={imageItems}
              emptyText="Henüz ek görsel yok."
              columnsClassName="grid-cols-2 sm:grid-cols-4"
              onRemove={handleRemoveImage}
              onMove={handleMoveImage}
            />
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <ToastAlert
          msg={toast.msg}
          type={toast.type}
          duration={toast.duration}
          onClose={() => setToast(null)}
        />
      )}
    </form>
  );
};

ProjectForm.propTypes = {
  initialData: PropTypes.shape({
    title: PropTypes.string,
    displayOrder: PropTypes.number,
    description: PropTypes.string,
    category: PropTypes.string,
    startDate: PropTypes.string,
    endDate: PropTypes.string,
    cover: PropTypes.shape({
      url: PropTypes.string,
      resourceType: PropTypes.oneOf(["image", "video"]),
    }),
    video: PropTypes.shape({
      url: PropTypes.string,
      resourceType: PropTypes.oneOf(["video"]),
    }),
    images: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string,
        resourceType: PropTypes.oneOf(["image"]),
      })
    ),
  }),
  onSubmit: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
};

export default ProjectForm;
