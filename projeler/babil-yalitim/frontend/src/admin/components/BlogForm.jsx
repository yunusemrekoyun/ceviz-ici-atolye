import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import RichContentField from "./RichContentField";
import { BlogPreview } from "./previews/ContentPreviews";
import OrderField from "./OrderField";
import AdminMediaGallery from "./AdminMediaGallery";
import ToastAlert from "./ToastAlert";
import { MEDIA_LIMIT_HINT } from "../utils/mediaFeedback";
import { toEditableRichContent } from "../../utils/richContent";
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
  "w-full rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950/55 dark:text-slate-100 dark:focus:border-indigo-500/50 dark:focus:ring-indigo-500/30";
const errorInputCls =
  "border-rose-300 focus:border-rose-300 focus:ring-rose-100 dark:border-rose-500/50 dark:focus:border-rose-400 dark:focus:ring-rose-500/20";

const fileCls =
  "text-sm text-slate-600 dark:text-slate-200 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-[#2c2f36] dark:file:text-slate-100";

const toTagList = (value = "") =>
  String(value)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

function BlogForm({ initialData, onSubmit, onStartSubmit, submitting = false }) {
  const existingCover = useMemo(
    () => createExistingMediaItems(initialData?.cover ? [initialData.cover] : [], "blog-kapak")[0] || null,
    [initialData?.cover]
  );
  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(() =>
    toEditableRichContent(initialData?.content || "")
  );
  const [tags, setTags] = useState((initialData?.tags || []).join(", "));
  const [displayOrder, setDisplayOrder] = useState(
    initialData?.displayOrder ? String(initialData.displayOrder) : ""
  );
  const [coverFile, setCoverFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const [coverPreview, setCoverPreview] = useState("");
  const [assetItems, setAssetItems] = useState(() =>
    createExistingMediaItems(initialData?.assets || [], "blog-medya")
  );
  const blobUrlsRef = useRef([]);
  const [fieldErrors, setFieldErrors] = useState({
    title: "",
    content: "",
    cover: "",
  });
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "info", duration = 4000) =>
    setToast({ msg, type, duration });

  useEffect(() => {
    if (!initialData) return;
    setTitle(initialData.title || "");
    setContent(toEditableRichContent(initialData.content || ""));
    setTags((initialData.tags || []).join(", "));
    setDisplayOrder(
      initialData.displayOrder ? String(initialData.displayOrder) : ""
    );
    setCoverFile(null);
    setCoverPreview("");
    setAssetItems(createExistingMediaItems(initialData.assets || [], "blog-medya"));
    setFieldErrors({ title: "", content: "", cover: "" });
  }, [initialData]);

  useEffect(
    () => () => {
      blobUrlsRef.current.forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
      blobUrlsRef.current = [];
    },
    []
  );

  const rememberUrl = (file) => {
    if (!file) return "";
    const url = URL.createObjectURL(file);
    blobUrlsRef.current.push(url);
    return url;
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    revokeBlobUrl(coverPreview);
    setCoverFile(file);
    setCoverPreview(file ? rememberUrl(file) : "");
    setFieldErrors((prev) => ({ ...prev, cover: "" }));
  };

  const handleAssetsChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setAssetItems((prev) => [
      ...prev,
      ...createNewMediaItems(files, rememberUrl, "blog-medya"),
    ]);
    event.target.value = "";
  };

  const clearSelectedCover = () => {
    revokeBlobUrl(coverPreview);
    setCoverFile(null);
    setCoverPreview("");
  };

  const handleRemoveAsset = (id) => {
    setAssetItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.source === "new") {
        revokeBlobUrl(target.src);
      }
      return removeMediaItem(prev, id);
    });
  };

  const handleMoveAsset = (id, direction) => {
    setAssetItems((prev) => moveMediaItem(prev, id, direction));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = {
      title: title.trim() ? "" : "Başlık zorunludur.",
      content: content.trim() ? "" : "İçerik zorunludur.",
      cover:
        coverFile || existingCover?.src ? "" : "Kapak medyası zorunludur.",
    };

    setFieldErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      showToast("Lütfen işaretli zorunlu alanları doldurun.", "error");
      return;
    }

    if (typeof onStartSubmit === "function") {
      try {
        onStartSubmit();
      } catch {
        /* ignore */
      }
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("content", content);
    formData.append("tags", tags.trim());
    if (displayOrder.trim()) formData.append("displayOrder", displayOrder.trim());

    if (coverFile) formData.append("cover", coverFile);
    appendOrderedMediaToFormData(formData, "assets", assetItems, "assetOrder");

    await onSubmit(formData);
  };

  const coverGalleryItems = useMemo(() => {
    if (coverPreview && coverFile) {
      return [
        {
          id: "cover:new",
          source: "new",
          src: coverPreview,
          type: toMediaType(coverFile),
          alt: title || "blog-kapak",
          badge: "Yeni kapak",
          removable: true,
          file: coverFile,
        },
      ];
    }

    if (existingCover) {
      return [
        {
          ...existingCover,
          alt: title || existingCover.alt,
          badge: "Mevcut kapak",
          removable: false,
        },
      ];
    }

    return [];
  }, [coverFile, coverPreview, existingCover, title]);

  const previewData = useMemo(
    () => ({
      title,
      tags: toTagList(tags),
      content,
      cover: {
        src: coverPreview || initialData?.cover?.url || "",
        type: coverFile ? toMediaType(coverFile) : initialData?.cover?.resourceType || "image",
        alt: title,
      },
      assets: buildMediaPreviewList(assetItems),
    }),
    [assetItems, content, coverFile, coverPreview, initialData, tags, title]
  );

  return (
    <form onSubmit={handleSubmit} className="grid gap-6" noValidate>
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Başlık *
        </label>
        <input
          type="text"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setFieldErrors((prev) => ({ ...prev, title: "" }));
          }}
          aria-invalid={Boolean(fieldErrors.title)}
          className={`${inputCls} ${fieldErrors.title ? errorInputCls : ""}`}
          placeholder="Blog başlığı"
          required
        />
        {fieldErrors.title ? (
          <p className="text-xs text-rose-600 dark:text-rose-300">
            {fieldErrors.title}
          </p>
        ) : null}
      </div>

      <OrderField value={displayOrder} onChange={setDisplayOrder} />

      <RichContentField
        label="İçerik *"
        value={content}
        onChange={(nextValue) => {
          setContent(nextValue);
          setFieldErrors((prev) => ({ ...prev, content: "" }));
        }}
        invalid={Boolean(fieldErrors.content)}
        errorText={fieldErrors.content}
        required
        inputClassName={`min-h-[220px] ${inputCls} ${
          fieldErrors.content ? errorInputCls : ""
        }`}
        placeholder="İçeriği yazın…"
        rows={11}
        onTogglePreview={() => setShowPreview((prev) => !prev)}
        showPreview={showPreview}
      />

      {showPreview && <BlogPreview preview={previewData} />}

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Etiketler (opsiyonel)
        </label>
        <input
          type="text"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          className={inputCls}
          placeholder="Orn. Yalitim, Cati, Izolasyon"
        />
        <p className="text-xs text-slate-500 dark:text-slate-300">
          Boş bırakırsan etiketler içerikten otomatik türetilir.
        </p>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Kapak Medyası {initialData?.cover?.url ? "(güncellemek için yeni dosya seç)" : "(zorunlu)"}
        </label>
        <input
          type="file"
          accept="image/*,video/*"
          onChange={handleFileChange}
          required={!existingCover?.src}
          aria-invalid={Boolean(fieldErrors.cover)}
          className={`${fileCls} ${fieldErrors.cover ? errorInputCls : ""}`}
        />
        <p className="text-xs text-slate-500 dark:text-slate-300">
          {MEDIA_LIMIT_HINT}
        </p>
        {fieldErrors.cover ? (
          <p className="text-xs text-rose-600 dark:text-rose-300">
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

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Ek Medya (opsiyonel)
        </label>
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleAssetsChange}
          className={fileCls}
        />
        <p className="text-xs text-slate-500 dark:text-slate-300">
          {MEDIA_LIMIT_HINT}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-300">
          Medyaları tıklayarak büyük inceleyebilir, kaldırabilir ve sırasını değiştirebilirsiniz.
        </p>
        <AdminMediaGallery
          items={assetItems}
          emptyText="Henüz ek medya yok."
          onRemove={handleRemoveAsset}
          onMove={handleMoveAsset}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="btn-admin-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "İşleniyor…" : "Kaydet"}
        </button>
      </div>

      {toast ? (
        <ToastAlert
          msg={toast.msg}
          type={toast.type}
          duration={toast.duration}
          onClose={() => setToast(null)}
        />
      ) : null}
    </form>
  );
}

BlogForm.propTypes = {
  initialData: PropTypes.shape({
    title: PropTypes.string,
    content: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    cover: PropTypes.shape({
      url: PropTypes.string,
      storageKey: PropTypes.string,
      posterUrl: PropTypes.string,
      resourceType: PropTypes.oneOf(["image", "video"]),
    }),
    displayOrder: PropTypes.number,
    assets: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string,
        storageKey: PropTypes.string,
        posterUrl: PropTypes.string,
        resourceType: PropTypes.oneOf(["image", "video"]),
      })
    ),
  }),
  onSubmit: PropTypes.func.isRequired,
  onStartSubmit: PropTypes.func,
  submitting: PropTypes.bool,
};

export default BlogForm;
