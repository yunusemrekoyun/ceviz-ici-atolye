import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../../api";
import Window from "../../components/ui/Window";
import ToastAlert from "../../components/ui/ToastAlert";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import CategoryFormModal from "../modals/CategoryFormModal";
import {
  FaPlus,
  FaSearch,
  FaPen,
  FaTrashAlt,
  FaLayerGroup,
} from "react-icons/fa";

/* ─── Skeleton ─── */
const CardSkeleton = () => (
  <div className="animate-pulse rounded-xl border border-gray-100 overflow-hidden">
    <div className="h-36 bg-gray-200" />
    <div className="p-4 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-2/3" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
      <div className="h-7 bg-gray-200 rounded w-20 mt-2" />
    </div>
  </div>
);

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

export default function CategoriesPage() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeCat, setActiveCat] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

  const [deleteId, setDeleteId] = useState(null);
  const [toast, setToast] = useState(null);

  // üst bar
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // newest | nameAsc | nameDesc
  const [scope, setScope] = useState("all"); // all | parents | children
  const searchRef = useRef(null);

  const fetchCats = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/categories");
      setCats(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCats();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const openNew = () => {
    setActiveCat(null);
    setFormDirty(false);
    setCloseConfirmOpen(false);
    setShowForm(true);
  };
  const openEdit = (c) => {
    setActiveCat(c);
    setFormDirty(false);
    setCloseConfirmOpen(false);
    setShowForm(true);
  };

  const closeForm = () => {
    if (formDirty) {
      setCloseConfirmOpen(true);
      return;
    }
    setShowForm(false);
    setActiveCat(null);
    setFormDirty(false);
  };

  const handleDelete = async () => {
    const id = deleteId;
    setDeleteId(null);
    try {
      await api.delete(`/categories/${id}`);
      setCats((xs) => xs.filter((c) => c._id !== id));
      setToast({ msg: "Kategori silindi.", type: "success" });
    } catch (err) {
      setToast({
        msg: err?.response?.data?.message || "Kategori silinemedi.",
        type: "error",
      });
    }
  };

  const list = useMemo(() => {
    let arr = [...cats];

    if (scope !== "all") {
      const wantParents = scope === "parents";
      arr = arr.filter((c) => (wantParents ? !c.parent : !!c.parent));
    }

    if (debouncedQ) {
      arr = arr.filter((c) =>
        `${c.name} ${(c.children || []).map((x) => x.name).join(" ")}`
          .toLowerCase()
          .includes(debouncedQ)
      );
    }

    arr.sort((a, b) => {
      if (sortBy === "nameAsc") return a.name.localeCompare(b.name, "tr");
      if (sortBy === "nameDesc") return b.name.localeCompare(a.name, "tr");
      const A = a.createdAt || a._id;
      const B = b.createdAt || b._id;
      return A < B ? 1 : -1;
    });

    return arr;
  }, [cats, debouncedQ, sortBy, scope]);

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">
            Kategoriler
          </h1>
          <p className="text-sm text-gray-600">
            Arayın, filtreleyin, düzenleyin.
          </p>
        </div>

        <div className="w-full md:w-auto flex flex-col md:flex-row gap-3 md:items-center">
          {/* search */}
          <div className="relative w-full md:w-64">
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ara (ad, alt kategori)…"
              className="pl-9 pr-3 py-2 border rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Kategori ara"
            />
            <FaSearch
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              aria-hidden
            />
          </div>

          {/* kapsam */}
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="border rounded-lg p-2 text-sm w-full md:w-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Kapsam filtresi"
          >
            <option value="all">Tümü</option>
            <option value="parents">Sadece Ana Kategoriler</option>
            <option value="children">Sadece Alt Kategoriler</option>
          </select>

          {/* sıralama */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border rounded-lg p-2 text-sm w-full md:w-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Sıralama seçimi"
          >
            <option value="newest">En Yeni</option>
            <option value="nameAsc">Ad (A→Z)</option>
            <option value="nameDesc">Ad (Z→A)</option>
          </select>

          <button
            onClick={openNew}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Yeni kategori ekle"
          >
            <FaPlus /> Yeni Kategori
          </button>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 sm:p-12 text-center">
          <p className="text-base sm:text-lg font-medium mb-2">
            Kayıt bulunamadı
          </p>
          <p className="text-gray-600 mb-4">
            Filtreleri temizleyin veya yeni bir kategori ekleyin.
          </p>
          <button
            onClick={openNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Kategori Oluştur
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((c) => {
            const isParent = !c.parent;
            const childCount = (c.children || []).length;
            return (
              <div
                key={c._id}
                className="bg-white rounded-xl border border-gray-100 hover:shadow-xl transition-shadow overflow-hidden group"
              >
                {/* Görsel */}
                <div className="relative h-32 sm:h-36">
                  <img
                    loading="lazy"
                    src={
                      c.image ||
                      "https://via.placeholder.com/600x400?text=Category"
                    }
                    alt={c.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent pointer-events-none" />

                  {/* HOVER'DA ORTADA DÜZENLE — sadece md+ */}
                  <button
                    onClick={() => openEdit(c)}
                    className="absolute inset-0 hidden md:flex items-center justify-center bg-white/55 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Düzenle"
                    aria-label={`${c.name} kategorisini düzenle`}
                  >
                    <span className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded-lg shadow-sm">
                      <FaPen className="w-4 h-4" />
                      Düzenle
                    </span>
                  </button>

                  <div className="absolute top-2 left-2 flex gap-2">
                    <Badge color={isParent ? "blue" : "green"}>
                      {isParent
                        ? "Ana Kategori"
                        : c.parent?.name
                        ? c.parent.name
                        : "Alt Kategori"}
                    </Badge>
                    {isParent && (
                      <Badge>
                        <FaLayerGroup className="mr-1" /> {childCount} alt
                      </Badge>
                    )}
                  </div>
                </div>

                {/* İçerik */}
                <div className="p-4">
                  <p className="font-medium truncate">{c.name}</p>
                  {isParent && childCount > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(c.children || []).slice(0, 4).map((cc) => (
                        <span
                          key={cc._id || cc.name}
                          className="text-xs px-2 py-0.5 rounded bg-gray-100"
                        >
                          {cc.name}
                        </span>
                      ))}
                      {childCount > 4 && (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100">
                          +{childCount - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Aksiyonlar */}
                  <div className="mt-4 flex items-center justify-end gap-2">
                    {/* Mobil aksiyonlar */}
                    <div className="flex md:hidden w-full gap-2">
                      <button
                        onClick={() => openEdit(c)}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded border text-xs hover:bg-gray-50"
                        aria-label={`${c.name} kategorisini düzenle`}
                      >
                        <FaPen className="w-3.5 h-3.5" />
                        Düzenle
                      </button>
                      <button
                        onClick={() => setDeleteId(c._id)}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded border border-red-200 text-red-600 text-xs hover:bg-red-50"
                        aria-label={`${c.name} kategorisini sil`}
                      >
                        <FaTrashAlt className="w-3.5 h-3.5" />
                        Sil
                      </button>
                    </div>

                    {/* Desktop: yalnız Sil */}
                    <button
                      onClick={() => setDeleteId(c._id)}
                      className="hidden md:inline-flex text-sm items-center gap-2 px-3 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400"
                      aria-label={`${c.name} kategorisini sil`}
                    >
                      <FaTrashAlt />
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sil onayı */}
      {deleteId && (
        <Window title="Onayla" onClose={() => setDeleteId(null)}>
          <div className="space-y-5 text-sm">
            <p>Bu kategoriyi silmek istediğinize emin misiniz?</p>
            {(() => {
              const target = cats.find((c) => c._id === deleteId);
              const children = cats.filter((c) => String(c.parent?._id || c.parent || "") === String(deleteId));
              const names = children.length ? children.map((c) => c.name) : (target?.children || []).map((c) => c.name);
              return names.length ? (
                <p className="text-red-700">
                  Alt kategorileri de silinecek: <b>{names.join(", ")}</b>
                </p>
              ) : null;
            })()}
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Vazgeç
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Sil
              </button>
            </div>
          </div>
        </Window>
      )}

      {/* Form Modal */}
      {showForm && (
        <Window
          title={activeCat ? "Kategori Düzenle" : "Yeni Kategori"}
          onClose={closeForm}
        >
          <CategoryFormModal
            category={activeCat}
            onClose={closeForm}
            onDirtyChange={setFormDirty}
            onSaved={(result) => {
              // Başarı: null/undefined
              if (!result) {
                setShowForm(false);
                setActiveCat(null);
                setFormDirty(false);
                fetchCats();
                setToast({ msg: "Kategori kaydedildi.", type: "success" });
                return;
              }
              // Hata: string ya da {status, message}
              if (typeof result === "object") {
                if (result.status === 500) {
                  setToast({
                    msg: "Görselin boyutu çok yüksek. Lütfen 10MB altında bir görsel seçin.",
                    type: "error",
                  });
                  return; // modal AÇIK kalsın
                }
                setToast({
                  msg: result.message || "İşlem başarısız.",
                  type: "error",
                });
                return; // modal AÇIK kalsın
              }
              // Eski string davranışı
              setToast({ msg: result, type: "error" });
              // modal AÇIK kalsın
            }}
          />
        </Window>
      )}

      <ConfirmDialog
        open={closeConfirmOpen}
        title="Değişiklikleri Kapat"
        message="Kaydedilmemiş değişiklikler var. Form kapatılsın mı?"
        confirmLabel="Kapat"
        tone="warning"
        onCancel={() => setCloseConfirmOpen(false)}
        onConfirm={() => {
          setCloseConfirmOpen(false);
          setFormDirty(false);
          setShowForm(false);
          setActiveCat(null);
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
