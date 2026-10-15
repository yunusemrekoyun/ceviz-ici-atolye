// src/pages/admin/BlogCategoriesPage.jsx
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
} from "@material-tailwind/react";
import {
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import api from "../../../api";
import ToastAlert from "../../components/ui/ToastAlert";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

/* ────────── Silme Onay Modali ────────── */
const ConfirmModal = ({ open, onClose, onConfirm, message }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
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

/* ────────── Badge & Skeleton ────────── */
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
    <div className="h-24 bg-gray-200" />
    <div className="p-4 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-2/3" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
      <div className="h-7 bg-gray-200 rounded w-24 mt-2" />
    </div>
  </div>
);

/* ────────── utils ────────── */
const slugify = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-ğüşöçıİĞÜŞÖÇ]/g, "")
    .replace(/-+/g, "-");

export default function BlogCategoriesPage() {
  /* ---------------- state ---------------- */
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // filtre/arama/sıralama
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // newest | oldest | az | za
  const searchRef = useRef(null);

  /* form dialog */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [form, setForm] = useState({
    _id: null,
    name: "",
    slug: "",
    description: "",
  });

  /* toast + sil onay */
  const [toast, setToast] = useState(null); // { msg, type }
  const [deleteId, setDeleteId] = useState(null); // silinecek kategori id

  /* ---------------- fetch ---------------- */
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/blog-categories");
      setCategories(data);
    } catch (err) {
      console.error("Kategoriler alınamadı:", err);
      setToast({ msg: "Kategoriler alınamadı.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  /* debounce */
  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedQuery(query.trim().toLowerCase()),
      250
    );
    return () => clearTimeout(t);
  }, [query]);

  /* ---------------- Yeni / Düzenle ---------------- */
  const openNew = () => {
    setForm({ _id: null, name: "", slug: "", description: "" });
    setDirty(false);
    setCloseConfirmOpen(false);
    setDialogOpen(true);
  };

  const openEdit = (cat) => {
    setForm({
      _id: cat._id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
    });
    setDirty(false);
    setCloseConfirmOpen(false);
    setDialogOpen(true);
  };

  const requestCloseDialog = () => {
    if (dirty) {
      setCloseConfirmOpen(true);
      return;
    }
    setDialogOpen(false);
    setDirty(false);
  };

  const handleSave = async () => {
    try {
      if (form._id) {
        await api.put(`/blog-categories/${form._id}`, {
          name: form.name,
          slug: form.slug,
          description: form.description,
        });
        setToast({ msg: "Kategori güncellendi.", type: "success" });
      } else {
        await api.post("/blog-categories", {
          name: form.name,
          slug: form.slug,
          description: form.description,
        });
        setToast({ msg: "Kategori oluşturuldu.", type: "success" });
      }
      await fetchCategories();
      setDirty(false);
      setDialogOpen(false);
    } catch (err) {
      console.error("Kaydetme hatası:", err);
      setToast({ msg: "Kategori kaydedilemedi.", type: "error" });
    }
  };

  /* ---------------- Silme akışı ---------------- */
  const triggerDelete = (id) => setDeleteId(id);

  const handleDeleteConfirmed = async () => {
    const id = deleteId;
    setDeleteId(null);
    try {
      await api.delete(`/blog-categories/${id}`);
      setCategories((cats) => cats.filter((c) => c._id !== id));
      setToast({ msg: "Kategori silindi.", type: "success" });
    } catch (err) {
      console.error("Silme hatası:", err);
      setToast({ msg: "Kategori silinemedi.", type: "error" });
    }
  };

  /* ---------------- türetilmiş liste ---------------- */
  const filtered = useMemo(() => {
    let list = [...categories];

    if (debouncedQuery) {
      list = list.filter((c) => {
        const blob = `${c.name} ${c.slug} ${c.description || ""}`.toLowerCase();
        return blob.includes(debouncedQuery);
      });
    }

    list.sort((a, b) => {
      if (sortBy === "az") return a.name.localeCompare(b.name, "tr");
      if (sortBy === "za") return b.name.localeCompare(a.name, "tr");
      const A = a.createdAt || a._id;
      const B = b.createdAt || b._id;
      return sortBy === "newest" ? (A < B ? 1 : -1) : A > B ? 1 : -1;
    });

    return list;
  }, [categories, debouncedQuery, sortBy]);

  /* ---------------- render ---------------- */
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Typography variant="h4">Blog Kategorileri</Typography>
            <Typography variant="small" className="text-gray-600">
              Arayın, sıralayın, yönetin.
            </Typography>
          </div>
          <Button color="blue" onClick={openNew}>
            + Yeni Kategori
          </Button>
        </div>

        {/* Responsive skeleton grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Üst bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Typography variant="h4">Blog Kategorileri</Typography>
          <Badge color="blue">{categories.length}</Badge>
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:items-center w-full md:w-auto">
          {/* search */}
          <div className="relative w-full md:w-72">
            <Input
              inputRef={searchRef}
              icon={<MagnifyingGlassIcon className="h-5 w-5" />}
              label="Ara (ad, slug, açıklama)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchRef.current?.blur()}
              crossOrigin=""
            />
          </div>

          {/* sort */}
          <select
            className="border rounded-lg p-2 text-sm w-full md:w-auto"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">En Yeni</option>
            <option value="oldest">En Eski</option>
            <option value="az">Ad (A→Z)</option>
            <option value="za">Ad (Z→A)</option>
          </select>

          <Button color="blue" onClick={openNew} className="w-full md:w-auto">
            + Yeni Kategori
          </Button>
        </div>
      </div>

      {/* Boş durum */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Typography variant="h6" className="mb-2">
            Kayıt bulunamadı
          </Typography>
          <Typography className="text-gray-600 mb-4">
            Filtreleri temizleyin veya yeni bir kategori ekleyin.
          </Typography>
          <Button color="blue" onClick={openNew} className="w-full md:w-auto">
            Kategori Oluştur
          </Button>
        </div>
      ) : (
        /* Kartlar */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((cat) => (
            <Card
              key={cat._id}
              className="relative overflow-hidden group border border-gray-100 hover:shadow-xl transition-shadow"
            >
              {/* hover aksiyon şeridi (desktop) */}
              <div className="absolute inset-x-0 top-0 h-0 group-hover:h-12 bg-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-end px-3 gap-2 z-10">
                <Button
                  variant="text"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => openEdit(cat)}
                >
                  <PencilIcon className="w-4 h-4" />
                  Düzenle
                </Button>
                <Button
                  variant="text"
                  size="sm"
                  className="flex items-center gap-1 text-red-600"
                  onClick={() => triggerDelete(cat._id)}
                >
                  <TrashIcon className="w-4 h-4" />
                  Sil
                </Button>
              </div>

              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Typography variant="h6" className="line-clamp-1">
                      {cat.name}
                    </Typography>
                    <Typography className="text-gray-600 text-sm break-all">
                      {cat.slug}
                    </Typography>
                  </div>

                  {/* mobil aksiyonlar */}
                  <div className="flex md:hidden items-center gap-1">
                    <button
                      onClick={() => openEdit(cat)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border text-xs hover:bg-gray-50"
                      title="Düzenle"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => triggerDelete(cat._id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-red-200 text-red-600 text-xs hover:bg-red-50"
                      title="Sil"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {cat.description ? (
                  <Typography className="text-gray-500 text-sm mt-2 line-clamp-2">
                    {cat.description}
                  </Typography>
                ) : (
                  <Typography className="text-gray-400 text-sm mt-2">
                    Açıklama eklenmemiş
                  </Typography>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Form dialog (responsive) */}
      <Dialog
        open={dialogOpen}
        size="md"
        handler={requestCloseDialog}
        className="!max-w-[95vw]"
      >
        <DialogHeader>
          {form._id ? "Kategori Güncelle" : "Yeni Kategori"}
        </DialogHeader>
        <DialogBody divider className="space-y-4 max-h-[70svh] overflow-y-auto">
          {/* Ad */}
          <Input
            label="Ad *"
            value={form.name}
            onChange={(e) => {
              const val = e.target.value;
              setForm((f) => ({
                ...f,
                name: val,
                // slug boşsa adı slug'a öner
                slug: f.slug ? f.slug : slugify(val),
              }));
              setDirty(true);
            }}
          />

          {/* Slug + buton */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="Slug *"
                value={form.slug}
                onChange={(e) => {
                  setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
                  setDirty(true);
                }}
              />
            </div>
            <Button
              variant="outlined"
              className="shrink-0"
              onClick={() =>
                setForm((f) => ({ ...f, slug: slugify(f.name || f.slug) }))
              }
              title="Addan slug üret"
            >
              <ArrowPathIcon className="w-4 h-4 mr-1 inline-block" />
              Slug üret
            </Button>
          </div>

          {/* Açıklama */}
          <Input
            label="Açıklama"
            value={form.description}
            onChange={(e) => {
              setForm((f) => ({ ...f, description: e.target.value }));
              setDirty(true);
            }}
          />

          {/* küçük uyarı */}
          {!(form.name.trim() && form.slug.trim()) && (
            <Typography variant="small" className="text-red-600">
              Ad ve slug zorunludur.
            </Typography>
          )}
        </DialogBody>
        <DialogFooter className="gap-2">
          <Button
            variant="text"
            onClick={requestCloseDialog}
            className="mr-2"
          >
            İptal
          </Button>
          <Button
            disabled={!dirty || !(form.name.trim() && form.slug.trim())}
            onClick={handleSave}
            color="blue"
          >
            Kaydet
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Silme onayı */}
      <ConfirmModal
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirmed}
        message="Bu kategoriyi silmek istediğinize emin misiniz?"
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

      {/* Toast */}
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
