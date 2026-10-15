import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import ToastAlert from "./ToastAlert";
import RichContentField from "./RichContentField";
import { JournalPreview } from "./previews/ContentPreviews";
import OrderField from "./OrderField";
import AdminMediaGallery from "./AdminMediaGallery";
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
  "mt-2 w-full text-sm text-slate-600 dark:text-slate-200 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-[#2c2f36] dark:file:text-slate-100";

const JournalForm = ({ initialData, onSubmit, submitting }) => {
  const isEdit = Boolean(initialData?._id);

  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(() =>
    toEditableRichContent(initialData?.content || "")
  );
  const [displayOrder, setDisplayOrder] = useState(
    initialData?.displayOrder ? String(initialData.displayOrder) : ""
  );
  const [showPreview, setShowPreview] = useState(false);

  const existingCover = useMemo(
    () => initialData?.cover || null,
    [initialData?.cover]
  );
  const [coverFile, setCoverFile] = useState(null);

  const [coverPreview, setCoverPreview] = useState(null);
  const [assetItems, setAssetItems] = useState(() =>
    createExistingMediaItems(initialData?.assets || [], "haber-medya")
  );
  const revokers = useRef([]);
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
    setDisplayOrder(
      initialData.displayOrder ? String(initialData.displayOrder) : ""
    );
    setCoverFile(null);
    setCoverPreview(null);
    setAssetItems(createExistingMediaItems(initialData.assets || [], "haber-medya"));
    setFieldErrors({ title: "", content: "", cover: "" });
  }, [initialData]);

  useEffect(() => {
    return () => {
      revokers.current.forEach((url) => {
        if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
      revokers.current = [];
    };
  }, []);

  const blobify = (file, setter) => {
    if (!file) return setter(null);
    const url = URL.createObjectURL(file);
    revokers.current.push(url);
    setter(url);
  };

  const handleCoverChange = (event) => {
    const file = event.target.files?.[0] || null;
    revokeBlobUrl(coverPreview);
    setCoverFile(file);
    setFieldErrors((prev) => ({ ...prev, cover: "" }));
    blobify(file, setCoverPreview);
  };

  const handleAssetsChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setAssetItems((prev) => [
      ...prev,
      ...createNewMediaItems(files, (file) => {
        const url = URL.createObjectURL(file);
        revokers.current.push(url);
        return url;
      }, "haber-medya"),
    ]);
    event.target.value = "";
  };

  const clearSelectedCover = () => {
    revokeBlobUrl(coverPreview);
    setCoverFile(null);
    setCoverPreview(null);
  };

  const handleRemoveAsset = (id) => {
    setAssetItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.source === "new") revokeBlobUrl(target.src);
      return removeMediaItem(prev, id);
    });
  };

  const handleMoveAsset = (id, direction) => {
    setAssetItems((prev) => moveMediaItem(prev, id, direction));
  };

  const submit = (event) => {
    event.preventDefault();

    const nextErrors = {
      title: title.trim() ? "" : "Başlık zorunludur.",
      content: content.trim() ? "" : "İçerik zorunludur.",
      cover:
        coverFile || existingCover?.url ? "" : "Kapak medyası zorunludur.",
    };

    setFieldErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      showToast("Lütfen işaretli zorunlu alanları doldurun.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    if (displayOrder.trim()) formData.append("displayOrder", displayOrder.trim());
    if (coverFile) formData.append("cover", coverFile);
    appendOrderedMediaToFormData(formData, "assets", assetItems, "assetOrder");

    onSubmit(formData);
  };

  const coverGalleryItems = useMemo(() => {
    if (coverPreview && coverFile) {
      return [
        {
          id: "cover:new",
          source: "new",
          src: coverPreview,
          type: toMediaType(coverFile),
          alt: title || "haber-kapak",
          badge: "Yeni kapak",
          removable: true,
          file: coverFile,
        },
      ];
    }

    if (existingCover?.url) {
      return [
        {
          ...createExistingMediaItems([existingCover], "haber-kapak")[0],
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
      content,
      cover: {
        src: coverPreview || existingCover?.url || "",
        type: coverFile ? toMediaType(coverFile) : existingCover?.resourceType || "image",
        alt: title,
      },
      assets: buildMediaPreviewList(assetItems),
    }),
    [assetItems, content, coverFile, coverPreview, existingCover, title]
  );

  return (
    <form
      onSubmit={submit}
      className="grid grid-cols-1 gap-6 lg:grid-cols-5"
      noValidate
    >
      <div className="space-y-5 lg:col-span-3">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Başlık *
          </label>
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setFieldErrors((prev) => ({ ...prev, title: "" }));
            }}
            required
            aria-invalid={Boolean(fieldErrors.title)}
            className={`mt-2 ${inputCls} ${
              fieldErrors.title ? errorInputCls : ""
            }`}
            placeholder="Örn: X firması ile anlaşma"
          />
          {fieldErrors.title ? (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">
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
          rows={10}
          required
          invalid={Boolean(fieldErrors.content)}
          errorText={fieldErrors.content}
          inputClassName={`min-h-[220px] ${inputCls} ${
            fieldErrors.content ? errorInputCls : ""
          }`}
          placeholder="Habere dair detaylar…"
          onTogglePreview={() => setShowPreview((prev) => !prev)}
          showPreview={showPreview}
        />

        {showPreview && <JournalPreview preview={previewData} />}

        <div className="pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="btn-admin-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "İşleniyor…" : "Kaydet"}
          </button>
        </div>
      </div>

      <div className="space-y-6 lg:col-span-2">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Kapak Medyası {isEdit ? "(mevcut varsa opsiyonel)" : "(zorunlu)"}
          </label>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleCoverChange}
            aria-invalid={Boolean(fieldErrors.cover)}
            className={`${fileCls} ${fieldErrors.cover ? errorInputCls : ""}`}
          />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">
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

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Alt Medya (opsiyonel, çoklu — resim ya da video)
          </label>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleAssetsChange}
            className={fileCls}
          />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">
            {MEDIA_LIMIT_HINT}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">
            Medyaları tıklayarak büyük inceleyebilir, kaldırabilir ve sırasını değiştirebilirsiniz.
          </p>
          <div className="mt-3">
            <AdminMediaGallery
              items={assetItems}
              emptyText="Henüz ek medya yok."
              onRemove={handleRemoveAsset}
              onMove={handleMoveAsset}
            />
          </div>
        </div>
      </div>

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

JournalForm.propTypes = {
  initialData: PropTypes.shape({
    _id: PropTypes.string,
    title: PropTypes.string,
    content: PropTypes.string,
    displayOrder: PropTypes.number,
    cover: PropTypes.shape({
      url: PropTypes.string,
      storageKey: PropTypes.string,
      posterUrl: PropTypes.string,
      resourceType: PropTypes.string,
    }),
    assets: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string,
        storageKey: PropTypes.string,
        posterUrl: PropTypes.string,
        resourceType: PropTypes.string,
      })
    ),
  }),
  onSubmit: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
};

export default JournalForm;
