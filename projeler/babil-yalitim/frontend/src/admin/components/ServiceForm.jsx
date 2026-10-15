import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import ToastAlert from "./ToastAlert";
import { ServicePreview } from "./previews/ContentPreviews";
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
  "w-full rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950/55 dark:text-slate-100 dark:focus:border-indigo-500/50 dark:focus:ring-indigo-500/30";
const errorInputCls =
  "border-rose-300 focus:border-rose-300 focus:ring-rose-100 dark:border-rose-500/50 dark:focus:border-rose-400 dark:focus:ring-rose-500/20";

const helperTextCls = "mt-2 text-xs text-slate-500 dark:text-slate-300";
const fileCls =
  "mt-2 w-full text-sm text-slate-600 dark:text-slate-200 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-[#2c2f36] dark:file:text-slate-100";

const FRONT_VERTICAL_MIN_RATIO = 1.5;

const createClientId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `sub-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const Chip = ({ text, onRemove }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-100">
    {text}
    <button
      type="button"
      onClick={onRemove}
      className="ml-1 rounded-full px-1.5 hover:bg-slate-200 dark:hover:bg-slate-700"
      aria-label={`${text} etiketini kaldır`}
      title="Kaldır"
    >
      ×
    </button>
  </span>
);
Chip.propTypes = {
  text: PropTypes.string.isRequired,
  onRemove: PropTypes.func.isRequired,
};

const normalizeAreas = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed))
        return parsed.filter(Boolean).map((item) => String(item).trim());
    } catch {
      /* noop */
    }
    return val
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const makeEmptySubService = (seed = {}) => ({
  id: seed?._id || "",
  clientId: seed?.clientId || seed?._id || createClientId(),
  displayOrder: seed?.displayOrder || 0,
  title: seed?.title || "",
  type: seed?.type || "",
  category: seed?.category || "",
  description: seed?.description || "",
  usageAreas: normalizeAreas(seed?.usageAreas),
  usageInput: "",
  coverFile: null,
  coverPreview: "",
  existingCover: seed?.cover || null,
  galleryItems: createExistingMediaItems(seed?.images || [], "alt-hizmet-medya"),
  open: true,
});

const normalizeSubServiceSequence = (items = []) =>
  items.map((item, index) => ({
    ...item,
    displayOrder: index + 1,
  }));

const moveSubServiceToOrder = (items, clientId, nextOrder) => {
  const ordered = normalizeSubServiceSequence(items);
  const currentIndex = ordered.findIndex((item) => item.clientId === clientId);
  if (currentIndex === -1) return ordered;

  const [target] = ordered.splice(currentIndex, 1);
  const insertAt = Math.min(
    Math.max(Number(nextOrder || 1) - 1, 0),
    ordered.length
  );
  ordered.splice(insertAt, 0, target);
  return normalizeSubServiceSequence(ordered);
};

const checkPortrait = (file, minRatio = FRONT_VERTICAL_MIN_RATIO) =>
  new Promise((resolve, reject) => {
    if (!file) return resolve(true);

    const type = file.type || "";
    const url = URL.createObjectURL(file);

    const done = (ok, message = "") => {
      URL.revokeObjectURL(url);
      ok ? resolve(true) : reject(new Error(message));
    };

    if (type.startsWith("video/")) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = url;
      video.onloadedmetadata = () => {
        const width = video.videoWidth || 0;
        const height = video.videoHeight || 0;
        const ratio = height / width;
        if (!width || !height) return done(false, "Video boyutları okunamadı.");
        if (height < width || ratio < minRatio) {
          return done(
            false,
            `Lütfen dikey bir video seçin. (min oran: ${minRatio}:1)`
          );
        }
        done(true);
      };
      video.onerror = () => done(false, "Video okunamadı.");
      return;
    }

    if (type.startsWith("image/")) {
      const image = new Image();
      image.src = url;
      image.onload = () => {
        const width = image.naturalWidth || 0;
        const height = image.naturalHeight || 0;
        const ratio = height / width;
        if (!width || !height) return done(false, "Görsel boyutları okunamadı.");
        if (height < width || ratio < minRatio) {
          return done(
            false,
            `Lütfen dikey bir görsel seçin. (min oran: ${minRatio}:1)`
          );
        }
        done(true);
      };
      image.onerror = () => done(false, "Görsel okunamadı.");
      return;
    }

    done(false, "Desteklenmeyen dosya türü.");
  });

const ServiceForm = ({ initialData, onSubmit, submitting }) => {
  const isEdit = Boolean(initialData?._id);

  const existingCover = useMemo(
    () => initialData?.cover || null,
    [initialData?.cover]
  );

  const [title, setTitle] = useState(initialData?.title || "");
  const [displayOrder, setDisplayOrder] = useState(
    initialData?.displayOrder ? String(initialData.displayOrder) : ""
  );
  const [type, setType] = useState(initialData?.type || "");
  const [category, setCategory] = useState(initialData?.category || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [usageAreas, setUsageAreas] = useState(
    normalizeAreas(initialData?.usageAreas)
  );
  const [usageInput, setUsageInput] = useState("");
  const [subServices, setSubServices] = useState(
    normalizeSubServiceSequence(
      (initialData?.subServices || []).map((item) => makeEmptySubService(item))
    )
  );
  const [showPreview, setShowPreview] = useState(false);

  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [imageItems, setImageItems] = useState(() =>
    createExistingMediaItems(initialData?.images || [], "hizmet-medya")
  );
  const revokers = useRef([]);
  const [fieldErrors, setFieldErrors] = useState({
    title: "",
    type: "",
    description: "",
    cover: "",
  });
  const [subServiceErrors, setSubServiceErrors] = useState({});

  const [mediaError, setMediaError] = useState("");
  const [toast, setToast] = useState(null);
  const showToast = (msg, typeValue = "info", duration = 4000) =>
    setToast({ msg, type: typeValue, duration });

  useEffect(() => {
    setTitle(initialData?.title || "");
    setDisplayOrder(
      initialData?.displayOrder ? String(initialData.displayOrder) : ""
    );
    setType(initialData?.type || "");
    setCategory(initialData?.category || "");
    setDescription(initialData?.description || "");
    setUsageAreas(normalizeAreas(initialData?.usageAreas));
    setSubServices(
      normalizeSubServiceSequence(
        (initialData?.subServices || []).map((item) => makeEmptySubService(item))
      )
    );
    setCoverFile(null);
    setCoverPreview("");
    setImageItems(createExistingMediaItems(initialData?.images || [], "hizmet-medya"));
    setFieldErrors({ title: "", type: "", description: "", cover: "" });
    setSubServiceErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?._id]);

  useEffect(() => {
    if (mediaError) showToast(mediaError, "error");
  }, [mediaError]);

  useEffect(() => {
    return () => {
      revokers.current.forEach((url) => {
        if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
      revokers.current = [];
    };
  }, []);

  const rememberUrl = (file) => {
    if (!file) return "";
    const url = URL.createObjectURL(file);
    revokers.current.push(url);
    return url;
  };

  const addUsage = () => {
    const value = usageInput.trim();
    if (!value) return;
    if (!usageAreas.includes(value)) {
      setUsageAreas((items) => [...items, value]);
    } else {
      showToast("Bu kullanım alanı zaten ekli.", "info", 2500);
    }
    setUsageInput("");
  };

  const onUsageKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addUsage();
    }
  };

  const updateSubService = (clientId, updater) => {
    setSubServices((items) =>
      normalizeSubServiceSequence(
        items.map((item) =>
          item.clientId === clientId ? { ...item, ...updater(item) } : item
        )
      )
    );
  };

  const clearFieldError = (field) => {
    setFieldErrors((prev) =>
      prev[field] ? { ...prev, [field]: "" } : prev
    );
  };

  const clearSubServiceError = (clientId, field) => {
    setSubServiceErrors((prev) => {
      const current = prev[clientId];
      if (!current?.[field]) return prev;

      const nextForClient = {
        ...current,
        [field]: "",
      };

      if (!Object.values(nextForClient).some(Boolean)) {
        const next = { ...prev };
        delete next[clientId];
        return next;
      }

      return {
        ...prev,
        [clientId]: nextForClient,
      };
    });
  };

  const updateSubServiceField = (clientId, field, value) => {
    clearSubServiceError(clientId, field);
    updateSubService(clientId, () => ({
      [field]: value,
    }));
  };

  const handleCoverChange = async (event) => {
    setMediaError("");
    const file = event.target.files?.[0] || null;
    if (!file) {
      revokeBlobUrl(coverPreview);
      setCoverFile(null);
      setCoverPreview("");
      return;
    }
    try {
      await checkPortrait(file);
      revokeBlobUrl(coverPreview);
      setCoverFile(file);
      setCoverPreview(rememberUrl(file));
      clearFieldError("cover");
    } catch (error) {
      setMediaError(error.message || "Kapak dosyası kabul edilmedi.");
      event.target.value = "";
      setCoverFile(null);
      setCoverPreview("");
    }
  };

  const handleImagesChange = async (event) => {
    setMediaError("");
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    for (const file of files) {
      try {
        await checkPortrait(file);
      } catch (error) {
        setMediaError(error.message || "Galeri dosyalarından biri geçersiz.");
        event.target.value = "";
        return;
      }
    }
    setImageItems((prev) => [
      ...prev,
      ...createNewMediaItems(files, rememberUrl, "hizmet-medya"),
    ]);
    event.target.value = "";
  };

  const addSubService = () => {
    setSubServices((items) =>
      normalizeSubServiceSequence([...items, makeEmptySubService()])
    );
  };

  const removeSubService = (clientId) => {
    setSubServiceErrors((prev) => {
      if (!prev[clientId]) return prev;
      const next = { ...prev };
      delete next[clientId];
      return next;
    });
    setSubServices((items) => {
      const target = items.find((item) => item.clientId === clientId);
      if (target?.coverPreview) revokeBlobUrl(target.coverPreview);
      (target?.galleryItems || [])
        .filter((item) => item.source === "new")
        .forEach((item) => revokeBlobUrl(item.src));
      return normalizeSubServiceSequence(
        items.filter((item) => item.clientId !== clientId)
      );
    });
  };

  const handleSubServiceCover = async (clientId, file) => {
    if (!file) {
      updateSubService(clientId, (current) => {
        revokeBlobUrl(current.coverPreview);
        return {
          coverFile: null,
          coverPreview: "",
        };
      });
      return;
    }

    await checkPortrait(file);
    updateSubService(clientId, (current) => {
      revokeBlobUrl(current.coverPreview);
      return {
        coverFile: file,
        coverPreview: rememberUrl(file),
      };
    });
    clearSubServiceError(clientId, "cover");
  };

  const handleSubServiceImages = async (clientId, files) => {
    for (const file of files) {
      await checkPortrait(file);
    }

    updateSubService(clientId, (current) => ({
      galleryItems: [
        ...(current.galleryItems || []),
        ...createNewMediaItems(files, rememberUrl, "alt-hizmet-medya"),
      ],
    }));
  };

  const clearSelectedCover = () => {
    revokeBlobUrl(coverPreview);
    setCoverFile(null);
    setCoverPreview("");
  };

  const handleRemoveImage = (id) => {
    setImageItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.source === "new") revokeBlobUrl(target.src);
      return removeMediaItem(prev, id);
    });
  };

  const handleMoveImage = (id, direction) => {
    setImageItems((prev) => moveMediaItem(prev, id, direction));
  };

  const handleRemoveSubServiceImage = (clientId, mediaId) => {
    updateSubService(clientId, (current) => {
      const target = (current.galleryItems || []).find((item) => item.id === mediaId);
      if (target?.source === "new") revokeBlobUrl(target.src);
      return {
        galleryItems: removeMediaItem(current.galleryItems || [], mediaId),
      };
    });
  };

  const handleMoveSubServiceImage = (clientId, mediaId, direction) => {
    updateSubService(clientId, (current) => ({
      galleryItems: moveMediaItem(current.galleryItems || [], mediaId, direction),
    }));
  };

  const clearSubServiceCoverSelection = (clientId) => {
    updateSubService(clientId, (current) => {
      revokeBlobUrl(current.coverPreview);
      return {
        coverFile: null,
        coverPreview: "",
      };
    });
  };

  const validateSubServices = () => {
    const nextErrors = {};
    let hasErrors = false;
    let shouldExpand = false;

    for (let index = 0; index < subServices.length; index += 1) {
      const item = subServices[index];
      const itemErrors = {};

      if (!item.title.trim()) {
        itemErrors.title = `Alt hizmet ${index + 1} için başlık zorunlu.`;
      }
      if (!item.description.trim()) {
        itemErrors.description = `Alt hizmet ${index + 1} için açıklama zorunlu.`;
      }
      if (!item.coverFile && !item.existingCover?.url) {
        itemErrors.cover = `Alt hizmet ${index + 1} için kapak zorunlu.`;
      }

      if (Object.keys(itemErrors).length) {
        hasErrors = true;
        nextErrors[item.clientId] = itemErrors;
        if (!item.open) shouldExpand = true;
      }
    }

    if (hasErrors) {
      setSubServiceErrors(nextErrors);
      if (shouldExpand) {
        setSubServices((items) =>
          normalizeSubServiceSequence(
            items.map((item) =>
              nextErrors[item.clientId] ? { ...item, open: true } : item
            )
          )
        );
      }
      showToast(
        "Alt hizmetlerde eksik alanlar var. Lütfen işaretli alanları kontrol edin.",
        "error"
      );
      return false;
    }

    setSubServiceErrors({});
    return true;
  };

  const submit = (event) => {
    event.preventDefault();

    const nextErrors = {
      title: title.trim() ? "" : "Hizmet adı zorunludur.",
      type: type.trim() ? "" : "Hizmet türü zorunludur.",
      description: description.trim() ? "" : "Açıklama zorunludur.",
      cover:
        coverFile || existingCover?.url
          ? ""
          : "Kapak medyası zorunludur.",
    };

    setFieldErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      showToast("Lütfen işaretli zorunlu alanları doldurun.", "error");
      return;
    }
    if (!validateSubServices()) return;

    const formData = new FormData();
    formData.append("title", title);
    if (displayOrder.trim()) formData.append("displayOrder", displayOrder.trim());
    formData.append("type", type);
    formData.append("category", category);
    formData.append("description", description);
    formData.append("usageAreas", JSON.stringify(usageAreas));
    formData.append(
      "subServices",
      JSON.stringify(
        subServices.map((item) => ({
          id: item.id,
          clientId: item.clientId,
          displayOrder: item.displayOrder,
          title: item.title,
          type: item.type,
          category: item.category,
          description: item.description,
          usageAreas: item.usageAreas,
        }))
      )
    );

    if (coverFile) formData.append("cover", coverFile);
    appendOrderedMediaToFormData(formData, "images", imageItems, "imageOrder");

    subServices.forEach((item) => {
      if (item.coverFile) {
        formData.append(`subServiceCover__${item.clientId}`, item.coverFile);
      }
      appendOrderedMediaToFormData(
        formData,
        `subServiceImages__${item.clientId}`,
        item.galleryItems || [],
        `subServiceImageOrder__${item.clientId}`
      );
    });

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
          alt: title || "hizmet-kapak",
          badge: "Yeni kapak",
          removable: true,
          file: coverFile,
        },
      ];
    }

    if (existingCover?.url) {
      return [
        {
          ...createExistingMediaItems([existingCover], "hizmet-kapak")[0],
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
      displayOrder,
      type,
      category,
      description,
      usageAreas,
      cover: {
        src: coverPreview || existingCover?.url || "",
        type: coverFile ? toMediaType(coverFile) : existingCover?.resourceType || "image",
        alt: title,
      },
      images: buildMediaPreviewList(imageItems),
      subServices: subServices.map((item, index) => ({
        id: item.id || item.clientId,
        displayOrder: item.displayOrder || index + 1,
        title: item.title || `Alt Hizmet ${index + 1}`,
        type: item.type,
        category: item.category,
        description: item.description,
        usageAreas: item.usageAreas,
        cover: {
          src: item.coverPreview || item.existingCover?.url || "",
          type: item.coverFile
            ? toMediaType(item.coverFile)
            : item.existingCover?.resourceType || "image",
          alt: item.title,
        },
        images: buildMediaPreviewList(item.galleryItems || []),
      })),
    }),
    [
      category,
      coverFile,
      coverPreview,
      displayOrder,
      description,
      existingCover,
      imageItems,
      subServices,
      title,
      type,
      usageAreas,
    ]
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
            Hizmet Adı *
          </label>
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              clearFieldError("title");
            }}
            required
            aria-invalid={Boolean(fieldErrors.title)}
            className={`mt-2 ${inputCls} ${
              fieldErrors.title ? errorInputCls : ""
            }`}
            placeholder="Örn: Teras Su Yalıtımı"
          />
          {fieldErrors.title ? (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">
              {fieldErrors.title}
            </p>
          ) : null}
        </div>

        <OrderField value={displayOrder} onChange={setDisplayOrder} />

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Hizmet Türü *
          </label>
          <input
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              clearFieldError("type");
            }}
            required
            aria-invalid={Boolean(fieldErrors.type)}
            className={`mt-2 ${inputCls} ${
              fieldErrors.type ? errorInputCls : ""
            }`}
            placeholder="Örn: Su Yalıtımı"
          />
          {fieldErrors.type ? (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">
              {fieldErrors.type}
            </p>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Kategori
          </label>
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className={`mt-2 ${inputCls}`}
            placeholder="Örn: Çatı, Teras, Temel"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Kullanım Alanları (opsiyonel)
          </label>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {usageAreas.map((area) => (
              <Chip
                key={area}
                text={area}
                onRemove={() =>
                  setUsageAreas((items) => items.filter((item) => item !== area))
                }
              />
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={usageInput}
              onChange={(event) => setUsageInput(event.target.value)}
              onKeyDown={onUsageKeyDown}
              className={inputCls}
              placeholder="Bir kullanım alanı yazın ve Enter’a basın"
            />
            <button type="button" onClick={addUsage} className="btn-admin-primary">
              Ekle
            </button>
          </div>
          <p className={helperTextCls}>
            Örn: Temel, perde beton, ıslak hacim, havuz…
          </p>
        </div>

        <div className="grid gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Açıklama *
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
            onChange={(event) => {
              setDescription(event.target.value);
              clearFieldError("description");
            }}
            rows={7}
            aria-invalid={Boolean(fieldErrors.description)}
            className={`mt-2 w-full leading-relaxed ${inputCls} ${
              fieldErrors.description ? errorInputCls : ""
            }`}
            placeholder="Hizmet ile ilgili detaylı açıklama…"
          />
          {fieldErrors.description ? (
            <p className="text-xs text-rose-600 dark:text-rose-300">
              {fieldErrors.description}
            </p>
          ) : null}
        </div>

        {showPreview && <ServicePreview preview={previewData} />}

        <div className="space-y-4 rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-950/55">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Alt Hizmetler
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-300">
                Üst hizmet altında görünecek bağlı hizmetleri buradan yönetin.
              </p>
            </div>
            <button type="button" onClick={addSubService} className="btn-admin-primary">
              Alt hizmet ekle
            </button>
          </div>

          {subServices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
              Henüz alt hizmet eklenmedi.
            </div>
          ) : (
            <div className="space-y-4">
              {subServices.map((item, index) => {
                const subServiceCoverItems =
                  item.coverPreview && item.coverFile
                    ? [
                        {
                          id: `sub-cover:${item.clientId}`,
                          source: "new",
                          src: item.coverPreview,
                          type: toMediaType(item.coverFile),
                          alt: item.title || "alt-hizmet-kapak",
                          badge: "Yeni kapak",
                          removable: true,
                          file: item.coverFile,
                        },
                      ]
                    : item.existingCover?.url
                    ? [
                        {
                          ...createExistingMediaItems(
                            [item.existingCover],
                            "alt-hizmet-kapak"
                          )[0],
                          badge: "Mevcut kapak",
                          removable: false,
                        },
                      ]
                    : [];

                return (
                  <div
                    key={item.clientId}
                    className="rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-950/60"
                  >
                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                          Alt Hizmet {index + 1}
                        </p>
                        <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {item.title || "Yeni alt hizmet"}
                        </h4>
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={item.displayOrder || index + 1}
                          onChange={(event) =>
                            setSubServices((items) =>
                              moveSubServiceToOrder(
                                items,
                                item.clientId,
                                Number(event.target.value)
                              )
                            )
                          }
                          className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100 dark:hover:border-slate-500"
                          aria-label="Alt hizmet sırası"
                        >
                          {Array.from({ length: subServices.length }, (_, orderIndex) => {
                            const order = orderIndex + 1;
                            return (
                              <option key={order} value={order}>
                                Sıra #{order}
                              </option>
                            );
                          })}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            updateSubService(item.clientId, (current) => ({
                              open: !current.open,
                            }))
                          }
                          className="inline-flex items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100 dark:hover:border-slate-500"
                        >
                          {item.open ? "Daralt" : "Genişlet"}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSubService(item.clientId)}
                          className="btn-admin-danger"
                        >
                          Alt hizmeti sil
                        </button>
                      </div>
                    </div>

                    {item.open && (
                      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                              Başlık *
                            </label>
                            <input
                              value={item.title}
                              onChange={(event) =>
                                updateSubServiceField(
                                  item.clientId,
                                  "title",
                                  event.target.value
                                )
                              }
                              aria-invalid={Boolean(subServiceErrors[item.clientId]?.title)}
                              className={`mt-2 ${inputCls} ${
                                subServiceErrors[item.clientId]?.title
                                  ? errorInputCls
                                  : ""
                              }`}
                              placeholder="Alt hizmet başlığı"
                            />
                            {subServiceErrors[item.clientId]?.title ? (
                              <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">
                                {subServiceErrors[item.clientId].title}
                              </p>
                            ) : null}
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                              Tür
                            </label>
                            <input
                              value={item.type}
                              onChange={(event) =>
                                updateSubService(item.clientId, () => ({
                                  type: event.target.value,
                                }))
                              }
                              className={`mt-2 ${inputCls}`}
                              placeholder="Alt hizmet türü"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                              Kategori
                            </label>
                            <input
                              value={item.category}
                              onChange={(event) =>
                                updateSubService(item.clientId, () => ({
                                  category: event.target.value,
                                }))
                              }
                              className={`mt-2 ${inputCls}`}
                              placeholder="Kategori"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                              Kullanım Alanları
                            </label>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {item.usageAreas.map((area) => (
                                <Chip
                                  key={`${item.clientId}-${area}`}
                                  text={area}
                                  onRemove={() =>
                                    updateSubService(item.clientId, (current) => ({
                                      usageAreas: current.usageAreas.filter(
                                        (entry) => entry !== area
                                      ),
                                    }))
                                  }
                                />
                              ))}
                            </div>
                            <div className="mt-2 flex gap-2">
                              <input
                                value={item.usageInput}
                                onChange={(event) =>
                                  updateSubService(item.clientId, () => ({
                                    usageInput: event.target.value,
                                  }))
                                }
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" ||
                                    event.key === ","
                                  ) {
                                    event.preventDefault();
                                    const value = item.usageInput.trim();
                                    if (!value) return;
                                    updateSubService(item.clientId, (current) => ({
                                      usageAreas: current.usageAreas.includes(value)
                                        ? current.usageAreas
                                        : [...current.usageAreas, value],
                                      usageInput: "",
                                    }));
                                  }
                                }}
                                className={inputCls}
                                placeholder="Enter ile ekle"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const value = item.usageInput.trim();
                                  if (!value) return;
                                  updateSubService(item.clientId, (current) => ({
                                    usageAreas: current.usageAreas.includes(value)
                                      ? current.usageAreas
                                      : [...current.usageAreas, value],
                                    usageInput: "",
                                  }));
                                }}
                                className="btn-admin-primary"
                              >
                                Ekle
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                              Açıklama *
                            </label>
                            <textarea
                              value={item.description}
                              onChange={(event) =>
                                updateSubServiceField(
                                  item.clientId,
                                  "description",
                                  event.target.value
                                )
                              }
                              rows={6}
                              aria-invalid={Boolean(
                                subServiceErrors[item.clientId]?.description
                              )}
                              className={`mt-2 ${inputCls} ${
                                subServiceErrors[item.clientId]?.description
                                  ? errorInputCls
                                  : ""
                              }`}
                              placeholder="Alt hizmet açıklaması"
                            />
                            {subServiceErrors[item.clientId]?.description ? (
                              <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">
                                {subServiceErrors[item.clientId].description}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                              Kapak (zorunlu)
                            </label>
                            <input
                              type="file"
                              accept="image/*,video/*"
                              onChange={async (event) => {
                                const file = event.target.files?.[0] || null;
                                try {
                                  await handleSubServiceCover(item.clientId, file);
                                } catch (error) {
                                  setMediaError(
                                    error.message ||
                                      "Alt hizmet kapağı kabul edilmedi."
                                  );
                                  event.target.value = "";
                                }
                              }}
                              aria-invalid={Boolean(subServiceErrors[item.clientId]?.cover)}
                              className={`${fileCls} ${
                                subServiceErrors[item.clientId]?.cover
                                  ? errorInputCls
                                  : ""
                              }`}
                            />
                            {subServiceErrors[item.clientId]?.cover ? (
                              <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">
                                {subServiceErrors[item.clientId].cover}
                              </p>
                            ) : null}
                            <div className="mt-3">
                              <AdminMediaGallery
                                items={subServiceCoverItems}
                                emptyText="Henüz kapak seçilmedi."
                                aspectClassName="aspect-[9/16]"
                                columnsClassName="grid-cols-1"
                                onRemove={
                                  item.coverFile
                                    ? () =>
                                        clearSubServiceCoverSelection(
                                          item.clientId
                                        )
                                    : undefined
                                }
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                              Alt Medya (opsiyonel)
                            </label>
                            <input
                              type="file"
                              accept="image/*,video/*"
                              multiple
                              onChange={async (event) => {
                                const files = Array.from(
                                  event.target.files || []
                                );
                                try {
                                  await handleSubServiceImages(
                                    item.clientId,
                                    files
                                  );
                                } catch (error) {
                                  setMediaError(
                                    error.message ||
                                      "Alt hizmet medyası kabul edilmedi."
                                  );
                                  event.target.value = "";
                                }
                              }}
                              className={fileCls}
                            />
                            <p className={helperTextCls}>
                              Medyaları tıklayarak büyük inceleyebilir, kaldırabilir ve sırasını değiştirebilirsiniz.
                            </p>
                            <div className="mt-3">
                              <AdminMediaGallery
                                items={item.galleryItems || []}
                                emptyText="Henüz alt medya yok."
                                columnsClassName="grid-cols-2 sm:grid-cols-3"
                                onRemove={(mediaId) =>
                                  handleRemoveSubServiceImage(
                                    item.clientId,
                                    mediaId
                                  )
                                }
                                onMove={(mediaId, direction) =>
                                  handleMoveSubServiceImage(
                                    item.clientId,
                                    mediaId,
                                    direction
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!!mediaError && (
          <div className="rounded-xl border border-red-200/80 bg-red-50/80 p-3 text-sm text-red-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
            {mediaError}
          </div>
        )}

        <div className="pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="btn-admin-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>

      <div className="space-y-6 lg:col-span-2">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Kapak (Dikey image veya video)
            {isEdit ? " — mevcut varsa opsiyonel" : " — zorunlu"}
          </label>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleCoverChange}
            aria-invalid={Boolean(fieldErrors.cover)}
            className={`${fileCls} ${fieldErrors.cover ? errorInputCls : ""}`}
          />
          <p className={helperTextCls}>
            Öneri: 9:16 (ör. 1080×1920). Minimum en-boy oranı{" "}
            {FRONT_VERTICAL_MIN_RATIO}:1.
          </p>
          <p className={helperTextCls}>{MEDIA_LIMIT_HINT}</p>
          {fieldErrors.cover ? (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">
              {fieldErrors.cover}
            </p>
          ) : null}
          <div className="mt-3">
            <AdminMediaGallery
              items={coverGalleryItems}
              emptyText="Henüz kapak seçilmedi."
              aspectClassName="aspect-[9/16]"
              columnsClassName="grid-cols-1"
              onRemove={coverFile ? clearSelectedCover : undefined}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Alt Medya (opsiyonel, çoklu — image/video)
          </label>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleImagesChange}
            className={fileCls}
          />
          <p className={helperTextCls}>{MEDIA_LIMIT_HINT}</p>
          <p className={helperTextCls}>
            Medyaları tıklayarak büyük inceleyebilir, kaldırabilir ve sırasını değiştirebilirsiniz.
          </p>
          <div className="mt-3">
            <AdminMediaGallery
              items={imageItems}
              emptyText="Henüz ek medya yok."
              columnsClassName="grid-cols-2 sm:grid-cols-4"
              onRemove={handleRemoveImage}
              onMove={handleMoveImage}
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

ServiceForm.propTypes = {
  initialData: PropTypes.shape({
    _id: PropTypes.string,
    title: PropTypes.string,
    displayOrder: PropTypes.number,
    type: PropTypes.string,
    category: PropTypes.string,
    usageAreas: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.string),
      PropTypes.string,
    ]),
    description: PropTypes.string,
    cover: PropTypes.shape({
      url: PropTypes.string,
      resourceType: PropTypes.string,
    }),
    images: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string,
        resourceType: PropTypes.string,
      })
    ),
    subServices: PropTypes.arrayOf(
      PropTypes.shape({
        _id: PropTypes.string,
        displayOrder: PropTypes.number,
        title: PropTypes.string,
        type: PropTypes.string,
        category: PropTypes.string,
        usageAreas: PropTypes.oneOfType([
          PropTypes.arrayOf(PropTypes.string),
          PropTypes.string,
        ]),
        description: PropTypes.string,
        cover: PropTypes.shape({
          url: PropTypes.string,
          resourceType: PropTypes.string,
        }),
        images: PropTypes.arrayOf(
          PropTypes.shape({
            url: PropTypes.string,
            resourceType: PropTypes.string,
          })
        ),
      })
    ),
  }),
  onSubmit: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
};

export default ServiceForm;
