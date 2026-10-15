// src/pages/admin/BlogsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardBody,
  Typography,
  Button,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Input,
  Textarea,
} from "@material-tailwind/react";
import {
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import api from "../../../api";
import ToastAlert from "../../components/ui/ToastAlert";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import MultiSelectionList from "../components/MultiSelectionList";
import { v4 as uuidv4 } from "uuid";
import { useUploadQueue } from "../../context/UploadQueueContext";
import {
  mediaErrorMessage,
  startMediaPreparation,
  uploadMediaFile,
  validateMediaFile,
} from "../../services/mediaUpload";

/* ───── Silme Onayı ───── */
const ConfirmModal = ({ open, onClose, onConfirm, message }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-xl p-6 shadow max-w-sm w-full">
        <Typography className="mb-6">{message}</Typography>
        <div className="flex justify-end gap-3">
          <Button variant="text" onClick={onClose}>
            Vazgeç
          </Button>
          <Button color="red" onClick={onConfirm}>
            Sil
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ───── Badge & Skeleton ───── */
const Badge = ({ children, color = "gray" }) => {
  const map = {
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    gray: "bg-gray-100 text-gray-700",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${map[color]}`}
    >
      {children}
    </span>
  );
};

const CardSkeleton = () => (
  <div className="animate-pulse rounded-xl border border-gray-100 overflow-hidden">
    <div className="h-48 bg-gray-200" />
    <div className="p-4 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-2/3" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
      <div className="h-7 bg-gray-200 rounded w-20 mt-2" />
    </div>
  </div>
);

export default function BlogsPage() {
  /* ---------------- state ---------------- */
  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  // üst bar filtre/arama/sıralama
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [authorFilter, setAuthorFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest"); // newest | oldest | title
  const searchRef = useRef(null);

  // form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [form, setForm] = useState({
    _id: null,
    title: "",
    subtitle: "",
    excerpt: "",
    content: "",
    categories: [],
    author: "",
    tagsArray: [],
    coverImage: null,
    coverPreview: null,
    status: "draft", // ✅ yeni
  });
  const [tagInput, setTagInput] = useState("");

  // toast & sil onay
  const [toast, setToast] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  /* upload queue */
  const { addTask, updateTask, removeTask } = useUploadQueue();

  /* ---------------- veri çek ---------------- */
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [{ data: bs }, { data: cats }, { data: users }] = await Promise.all(
        [api.get("/blogs/admin"), api.get("/blog-categories"), api.get("/users")]
      );
      setBlogs(bs);
      setCategories(cats);
      setAdmins(users.filter((u) => u.role === "admin"));
    } catch {
      setToast({
        msg: "Veriler alınamadı, lütfen tekrar deneyin.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAll();
  }, []);

  /* query debounce */
  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedQuery(query.trim().toLowerCase()),
      250
    );
    return () => clearTimeout(t);
  }, [query]);

  /* ---------------- dialog helpers ---------------- */
  const openNew = () => {
    setForm({
      _id: null,
      title: "",
      subtitle: "",
      excerpt: "",
      content: "",
      categories: [],
      author: "",
      tagsArray: [],
      coverImage: null,
      coverPreview: null,
      status: "draft", // ✅ yeni
    });
    setTagInput("");
    setDirty(false);
    setCloseConfirmOpen(false);
    setDialogOpen(true);
  };

  const openEdit = async (b) => {
    try {
      const { data } = await api.get(`/blogs/admin/${b._id}`);
      setForm({
        _id: data._id,
        title: data.title,
        subtitle: data.subtitle,
        excerpt: data.excerpt,
        content: data.content,
        categories: (data.categories || []).map((c) => c._id),
        author: data.author?._id || "",
        tagsArray: data.tags || [],
        coverImage: null,
        coverPreview: data.coverImageUrl || null,
        status: data.status || "draft", // ✅ yeni
      });
      setTagInput("");
      setDirty(false);
      setCloseConfirmOpen(false);
      setDialogOpen(true);
    } catch {
      setToast({ msg: "Blog verisi alınamadı.", type: "error" });
    }
  };

  const requestCloseDialog = () => {
    if (dirty) {
      setCloseConfirmOpen(true);
      return;
    }
    setDialogOpen(false);
    setDirty(false);
  };

  /* ---------------- tag işlemleri ---------------- */
  const handleTagKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const val = tagInput.trim();
      if (!form.tagsArray.includes(val)) {
        setForm((f) => ({ ...f, tagsArray: [...f.tagsArray, val] }));
        setDirty(true);
      }
      setTagInput("");
    }
    if (e.key === "Backspace" && !tagInput && form.tagsArray.length) {
      setForm((f) => ({ ...f, tagsArray: f.tagsArray.slice(0, -1) }));
      setDirty(true);
    }
  };
  const removeTag = (tag) => {
    setForm((f) => ({ ...f, tagsArray: f.tagsArray.filter((t) => t !== tag) }));
    setDirty(true);
  };

  /* ---------------- kaydet (queue) ---------------- */
  const handleSave = async () => {
    if (!form.categories.length) {
      setToast({ msg: "En az bir kategori seçin.", type: "error" });
      return;
    }
    if (!form.author) {
      setToast({ msg: "Lütfen bir yazar seçin.", type: "error" });
      return;
    }
    if (!form._id && !form.coverImage) {
      setToast({ msg: "Kapak görseli zorunludur.", type: "error" });
      return;
    }
    if (!form.title.trim() || !form.content.trim()) {
      setToast({ msg: "Başlık ve içerik zorunludur.", type: "error" });
      return;
    }

    const id = uuidv4();
    addTask({ id, name: form.title || "Blog", progress: 0 });

    try {
      const asset = form.coverImage
        ? await uploadMediaFile(form.coverImage, "blog_cover", {
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
        title: form.title,
        subtitle: form.subtitle,
        excerpt: form.excerpt,
        content: form.content,
        categories: form.categories,
        author: form.author,
        tags: form.tagsArray,
        status: form.status,
        ...(asset ? { coverImageAssetId: asset.id } : {}),
      };
      if (form._id) {
        await api.put(`/blogs/${form._id}`, payload);
      } else {
        await api.post("/blogs", payload);
      }

      updateTask(id, { progress: 100, status: "success" });
      setTimeout(() => removeTask(id), 2000);

      const { data } = await api.get("/blogs/admin");
      setBlogs(data);
      setDirty(false);
      setDialogOpen(false);
    } catch (error) {
      const message = mediaErrorMessage(
        error,
        error.response?.data?.message || "Blog kaydedilemedi"
      );
      updateTask(id, {
        progress: 100,
        status: "error",
        errorMsg: message,
      });
      setTimeout(() => removeTask(id), 4000);
    }
  };

  /* ---------------- silme ---------------- */
  const triggerDelete = (id) => setDeleteId(id);
  const handleDeleteConfirmed = async () => {
    const id = deleteId;
    setDeleteId(null);
    try {
      await api.delete(`/blogs/${id}`);
      setBlogs((bs) => bs.filter((b) => b._id !== id));
      setToast({ msg: "Blog silindi.", type: "success" });
    } catch {
      setToast({ msg: "Blog silinemedi.", type: "error" });
    }
  };

  /* ---------------- türetilmiş liste ---------------- */
  const filtered = useMemo(() => {
    let list = [...blogs];

    if (debouncedQuery) {
      list = list.filter((b) => {
        const blob = `${b.title} ${b.subtitle} ${b.excerpt} ${(
          b.tags || []
        ).join(" ")}`.toLowerCase();
        return blob.includes(debouncedQuery);
      });
    }

    if (catFilter !== "all") {
      list = list.filter((b) =>
        b.categories.some((c) => (c._id || c) === catFilter)
      );
    }

    if (authorFilter !== "all") {
      list = list.filter((b) => (b.author?._id || b.author) === authorFilter);
    }

    list.sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title, "tr");
      const A = a.createdAt || a._id;
      const B = b.createdAt || b._id;
      return sortBy === "newest" ? (A < B ? 1 : -1) : A > B ? 1 : -1;
    });

    return list;
  }, [blogs, debouncedQuery, catFilter, authorFilter, sortBy]);

  /* ---------------- computed ---------------- */
  const canSave =
    form.categories.length > 0 &&
    form.author &&
    form.title.trim() !== "" &&
    form.content.trim() !== "" &&
    (form._id ? true : !!form.coverImage); // create’te kapak zorunlu

  /* ---------------- render ---------------- */
  return (
    <div className="p-6 space-y-6">
      {/* üst bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <Typography variant="h4">Bloglar</Typography>
          <Typography variant="small" className="text-gray-600">
            Arayın, filtreleyin ve oluşturun.
          </Typography>
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:items-center w-full md:w-auto">
          {/* search */}
          <div className="relative w-full md:w-72">
            <Input
              inputRef={searchRef}
              icon={<MagnifyingGlassIcon className="h-5 w-5" />}
              label="Ara (başlık, özet, tag)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchRef.current?.blur()}
              crossOrigin=""
            />
          </div>

          {/* kategori filtresi */}
          <select
            className="border rounded-lg p-2 text-sm w-full md:w-auto"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
          >
            <option value="all">Tüm Kategoriler</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* yazar filtresi */}
          <select
            className="border rounded-lg p-2 text-sm w-full md:w-auto"
            value={authorFilter}
            onChange={(e) => setAuthorFilter(e.target.value)}
          >
            <option value="all">Tüm Yazarlar</option>
            {admins.map((u) => (
              <option key={u._id} value={u._id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>

          {/* sıralama */}
          <select
            className="border rounded-lg p-2 text-sm w-full md:w-auto"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">En Yeni</option>
            <option value="oldest">En Eski</option>
            <option value="title">Başlık (A→Z)</option>
          </select>

          <Button color="blue" onClick={openNew} className="w-full md:w-auto">
            + Yeni Blog
          </Button>
        </div>
      </div>

      {/* liste */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Typography variant="h6" className="mb-2">
            Kayıt bulunamadı
          </Typography>
          <Typography className="text-gray-600 mb-4">
            Filtreleri temizleyin veya yeni bir blog ekleyin.
          </Typography>
          <Button color="blue" onClick={openNew} className="w-full md:w-auto">
            Blog Oluştur
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((b) => (
            <Card
              key={b._id}
              className="relative overflow-hidden group border border-gray-100 hover:shadow-xl transition-shadow"
            >
              {/* Görsel alanı */}
              <div className="relative h-40 sm:h-48">
                {b.coverImageUrl ? (
                  <img
                    src={b.coverImageUrl}
                    alt={b.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                    Kapak yok
                  </div>
                )}

                {/* gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent pointer-events-none" />

                {/* kategori rozetleri */}
                <div className="absolute top-2 left-2 flex gap-2 flex-wrap z-10">
                  {Array.isArray(b.categories) &&
                    b.categories.slice(0, 3).map((c) => (
                      <Badge key={(c._id || c) + "_cat"} color="amber">
                        {c.name || c}
                      </Badge>
                    ))}
                  {Array.isArray(b.categories) && b.categories.length > 3 && (
                    <Badge>+{b.categories.length - 3}</Badge>
                  )}
                </div>

                {/* HOVER EDIT OVERLAY (desktop) */}
                <button
                  onClick={() => openEdit(b)}
                  className="absolute inset-0 hidden md:flex items-center justify-center bg-white/60 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  title="Düzenle"
                >
                  <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white shadow">
                    <PencilIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Düzenle</span>
                  </span>
                </button>
              </div>

              <CardBody>
                <Typography variant="h6" className="line-clamp-1">
                  {b.title}
                </Typography>
                <Typography className="text-gray-600 line-clamp-2 text-sm">
                  {b.excerpt || b.subtitle}
                </Typography>

                <div className="mt-3 flex items-center justify-between">
                  {b.author && (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px]">
                        {`${b.author.firstName?.[0] || ""}${
                          b.author.lastName?.[0] || ""
                        }`}
                      </div>
                      <span className="text-xs text-gray-600">
                        {b.author.firstName} {b.author.lastName}
                      </span>
                    </div>
                  )}

                  {/* SİL BUTONU (desktop görünür) */}
                  <button
                    onClick={() => triggerDelete(b._id)}
                    className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 text-xs"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Sil
                  </button>
                </div>

                {/* mobil aksiyonlar */}
                <div className="flex md:hidden gap-2 mt-3">
                  <button
                    onClick={() => openEdit(b)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border text-xs hover:bg-gray-50"
                    title="Düzenle"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Düzenle
                  </button>
                  <button
                    onClick={() => triggerDelete(b._id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-red-200 text-red-600 text-xs hover:bg-red-50"
                    title="Sil"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Sil
                  </button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* form dialog */}
      <Dialog
        open={dialogOpen}
        size="xl"
        handler={requestCloseDialog}
        className="!max-w-[95vw]"
      >
        <DialogHeader>{form._id ? "Blogu Güncelle" : "Yeni Blog"}</DialogHeader>
        <DialogBody divider className="overflow-auto max-h-[70svh] pr-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SOL: FORM */}
            <div className="space-y-4">
              <Input
                label="Başlık *"
                value={form.title}
                onChange={(e) => {
                  setForm((f) => ({ ...f, title: e.target.value }));
                  setDirty(true);
                }}
                crossOrigin=""
              />
              <Input
                label="Alt Başlık"
                value={form.subtitle}
                onChange={(e) => {
                  setForm((f) => ({ ...f, subtitle: e.target.value }));
                  setDirty(true);
                }}
                crossOrigin=""
              />
              <Input
                label="Kısa Açıklama"
                value={form.excerpt}
                onChange={(e) => {
                  setForm((f) => ({ ...f, excerpt: e.target.value }));
                  setDirty(true);
                }}
                crossOrigin=""
              />

              <div>
                <label className="block mb-1 text-sm font-medium">
                  İçerik *
                </label>
                <Textarea
                  value={form.content}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, content: e.target.value }));
                    setDirty(true);
                  }}
                  className="h-40"
                />
              </div>

              {/* kategoriler */}
              <MultiSelectionList
                key={`blog-categories-${form._id || "new"}-${dialogOpen}`}
                label="Kategoriler *"
                itemName="kategori"
                options={categories}
                value={form.categories}
                onChange={(ids) => {
                  setForm((f) => ({ ...f, categories: ids }));
                  setDirty(true);
                }}
              />

              {/* yazar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium">
                    Yazar *
                  </label>
                  <select
                    className="w-full border rounded p-2"
                    value={form.author}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, author: e.target.value }));
                      setDirty(true);
                    }}
                  >
                    <option value="">-- Yazar Seçiniz --</option>
                    {admins.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.firstName} {u.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ✅ Durum */}
                <div>
                  <label className="block mb-1 text-sm font-medium">
                    Durum
                  </label>
                  <select
                    className="w-full border rounded p-2"
                    value={form.status}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, status: e.target.value }));
                      setDirty(true);
                    }}
                  >
                    <option value="draft">Taslak</option>
                    <option value="published">Yayınla</option>
                  </select>
                </div>
              </div>

              {/* tags */}
              <div>
                <label className="block mb-1 text-sm font-medium">
                  Etiketler
                </label>
                <div className="flex flex-wrap gap-2 border rounded p-2">
                  {form.tagsArray.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center bg-blue-100 text-blue-800 rounded-full px-2 py-1 text-xs"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-[10px] font-bold"
                        aria-label={`${tag} etiketini kaldır`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Enter veya , ile ekle"
                    className="flex-1 min-w-[8rem] outline-none text-sm"
                  />
                </div>
              </div>

              {/* kapak resmi */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Kapak Görseli {form._id ? "" : "*"}
                </label>
                <label className="border-2 border-dashed rounded-xl p-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50">
                  <span className="text-sm">
                    {form.coverImage ? form.coverImage.name : "Dosya seçin"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        validateMediaFile(file, "blog_cover");
                        startMediaPreparation(file, "blog_cover");
                        setForm((f) => ({
                          ...f,
                          coverImage: file,
                          coverPreview: URL.createObjectURL(file),
                        }));
                        setDirty(true);
                      } catch (error) {
                        setToast({
                          msg: mediaErrorMessage(error),
                          type: "error",
                        });
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
                <Typography variant="small" className="text-gray-500 mt-1">
                  1200×600 önerilir. JPG/PNG/WebP/HEIC; sunucuda optimize edilir.
                </Typography>
              </div>

              {/* validation uyarısı */}
              {!(form.title.trim() && form.content.trim()) && (
                <Typography variant="small" className="text-red-600">
                  Başlık ve içerik zorunludur.
                </Typography>
              )}
            </div>

            {/* SAĞ: ÖNİZLEME */}
            <div>
              <Typography variant="small" className="text-gray-600 mb-2">
                Canlı Önizleme
              </Typography>
              <div className="rounded-xl border overflow-hidden">
                <div className="relative h-40 sm:h-48">
                  {form.coverPreview ? (
                    <img
                      src={form.coverPreview}
                      alt="Kapak Önizleme"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                      Kapak seçilmedi
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent" />
                  <div className="absolute top-2 left-2 flex gap-2 flex-wrap">
                    {form.categories
                      .map((id) => categories.find((c) => c._id === id)?.name)
                      .filter(Boolean)
                      .slice(0, 3)
                      .map((name) => (
                        <Badge key={name} color="amber">
                          {name}
                        </Badge>
                      ))}
                    {form.categories.length > 3 && (
                      <Badge>+{form.categories.length - 3}</Badge>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <Typography variant="h6" className="line-clamp-1">
                    {form.title || "Blog Başlığı"}
                  </Typography>
                  <Typography className="text-gray-600 line-clamp-2 text-sm">
                    {form.excerpt ||
                      form.subtitle ||
                      "Kısa açıklama buraya gelecek…"}
                  </Typography>
                  {form.tagsArray.length > 0 && (
                    <div className="mt-2 text-[11px] text-gray-500">
                      #{form.tagsArray.slice(0, 3).join(" #")}
                      {form.tagsArray.length > 3
                        ? " +" + (form.tagsArray.length - 3)
                        : ""}
                    </div>
                  )}
                  <div className="mt-2 text-[11px] text-gray-500">
                    Durum:{" "}
                    {form.status === "published" ? "Yayınlanacak" : "Taslak"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter className="gap-2">
          <Button variant="text" onClick={requestCloseDialog}>
            İptal
          </Button>
          <Button disabled={!canSave} onClick={handleSave} color="blue">
            Kaydet
          </Button>
        </DialogFooter>
      </Dialog>

      {/* silme onayı */}
      <ConfirmModal
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirmed}
        message="Bu blogu silmek istediğinize emin misiniz?"
      />

      <ConfirmDialog
        open={closeConfirmOpen}
        title="Değişiklikleri Kapat"
        message="Kaydedilmemiş değişiklikler var. Form kapatılsın mı?"
        confirmLabel="Kapat"
        tone="warning"
        onCancel={() => setCloseConfirmOpen(false)}
        onConfirm={() => {
          setCloseConfirmOpen(false);
          setDirty(false);
          setDialogOpen(false);
        }}
      />

      {/* toast */}
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
