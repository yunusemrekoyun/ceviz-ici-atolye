// src/pages/admin/ProductListPage.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FaTrashAlt,
  FaPen,
  FaPalette,
  FaPlus,
  FaSearch,
  FaTh,
  FaList,
} from "react-icons/fa";
import api from "../../../api";
import ToastAlert from "../../components/ui/ToastAlert";
import ProductFormModal from "../modals/ProductFormModal";
import Window from "../../components/ui/Window";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import EditProductForm from "../forms/EditProductForm";
import AddNewColorForm from "../forms/AddNewColorForm";

/* ─── Skeletons ─── */
const CardSkeleton = () => (
  <div className="animate-pulse rounded-xl border border-gray-100 overflow-hidden">
    <div className="h-48 bg-gray-200" />
    <div className="p-4 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-2/3" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
      <div className="h-8 bg-gray-200 rounded w-24 mt-3" />
    </div>
  </div>
);

const RowSkeleton = () => (
  <div className="animate-pulse p-3 sm:p-4 border-b flex flex-col gap-2">
    <div className="h-4 bg-gray-200 rounded w-2/3" />
    <div className="h-3 bg-gray-200 rounded w-1/3" />
  </div>
);

const Badge = ({ children, color = "gray" }) => {
  const map = {
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    blue: "bg-blue-100 text-blue-800",
    gray: "bg-gray-100 text-gray-700",
    amber: "bg-amber-100 text-amber-800",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${map[color]}`}
    >
      {children}
    </span>
  );
};

const VIEW_KEY = "adminProductsView"; // 'grid' | 'list'

export default function ProductListPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [activeProduct, setActiveProduct] = useState(null); // edit / new-color / new
  const [isFormOpen, setIsFormOpen] = useState(false);
  // Formda herhangi bir giriş yapıldıysa kapatmadan önce onay istenir.
  const [formDirty, setFormDirty] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [formMode, setFormMode] = useState("new"); // new | edit | new-color

  const [deleteId, setDeleteId] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  // üst bar ui
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest"); // newest | priceAsc | priceDesc | stockAsc | stockDesc
  const [view, setView] = useState(
    localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid"
  );
  const searchRef = useRef(null);

  /* ---------------- Fetch ---------------- */
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const [{ data: prods }, { data: cats }] = await Promise.all([
        api.get("/products"),
        api.get("/categories"),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err) {
      console.error("Ürünler alınamadı", err);
      setToast({ msg: "Ürünler alınamadı.", type: "error" });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchProducts();
  }, []);

  // debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [q]);

  // view persist
  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view);
  }, [view]);

  /* ---------------- CRUD Handlers ---------------- */
  const handleDelete = async () => {
    const backup = products;
    setProducts((prev) => prev.filter((p) => p._id !== deleteId));
    try {
      await api.delete(`/products/${deleteId}`);
      setToast({ msg: "Ürün silindi.", type: "success" });
    } catch {
      setProducts(backup);
      setToast({ msg: "Ürün silinemedi.", type: "error" });
    } finally {
      setDeleteId(null);
    }
  };

  const openNewForm = () => {
    setFormMode("new");
    setActiveProduct(null);
    setFormDirty(false);
    setIsFormOpen(true);
  };

  const openEditForm = (prod) => {
    setFormMode("edit");
    setActiveProduct(prod);
    setFormDirty(false);
    setIsFormOpen(true);
  };

  const openNewColorForm = (baseProd) => {
    setFormMode("new-color");
    setActiveProduct({ ...baseProd });
    setFormDirty(false);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setFormDirty(false);
    setCloseConfirmOpen(false);
  };
  const requestCloseForm = () => {
    if (formDirty) {
      setCloseConfirmOpen(true);
      return;
    }
    closeForm();
  };
  const markFormDirty = () => {
    if (!formDirty) setFormDirty(true);
  };
  const onSaved = () => {
    fetchProducts();
    closeForm();
  };

  /* ---------------- Derived list ---------------- */
  const filtered = useMemo(() => {
    let list = [...products];

    if (debouncedQ) {
      list = list.filter((p) =>
        `${p.name} ${p.category?.name || ""}`.toLowerCase().includes(debouncedQ)
      );
    }
    if (catFilter !== "all") {
      list = list.filter(
        (p) =>
          p.category?._id === catFilter || p.category?.parent?._id === catFilter
      );
    }

    list.sort((a, b) => {
      const stockA = (a.sizes || []).reduce((t, s) => t + (s.stock || 0), 0);
      const stockB = (b.sizes || []).reduce((t, s) => t + (s.stock || 0), 0);
      if (sortBy === "priceAsc") return (a.price || 0) - (b.price || 0);
      if (sortBy === "priceDesc") return (b.price || 0) - (a.price || 0);
      if (sortBy === "stockAsc") return stockA - stockB;
      if (sortBy === "stockDesc") return stockB - stockA;

      const A = a.createdAt || a._id;
      const B = b.createdAt || b._id;
      return A < B ? 1 : -1;
    });
    return list;
  }, [products, debouncedQ, catFilter, sortBy]);

  /* ---------------- Helpers ---------------- */
  const fmt = (n) => `₺${Number(n || 0).toLocaleString("tr-TR")}`;
  const imgOrPlaceholder = (src) =>
    src || "https://via.placeholder.com/640x480?text=Product";

  const renderPrice = (p) => {
    const discountPct = Number(p.discount || 0);
    const hasDiscount = discountPct > 0;
    const original = Number(p.originalPrice || 0);
    const discounted =
      p.price != null
        ? Number(p.price)
        : Math.max(0, Math.round(original * (1 - discountPct / 100)));

    return hasDiscount ? (
      <div className="flex items-baseline gap-2">
        <span className="text-xs line-through text-gray-400">
          {fmt(original)}
        </span>
        <span className="text-blue-700 font-semibold">{fmt(discounted)}</span>
      </div>
    ) : (
      <span className="text-blue-700 font-semibold">
        {fmt(original || p.price)}
      </span>
    );
  };

  /* ---------------- Render ---------------- */
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
      {/* Üst bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 flex-wrap">
        <div className="min-w-[200px]">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-800">
            Ürünler
          </h1>
          <p className="text-sm text-gray-600">
            Arayın, filtreleyin, düzenleyin.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-center w-full md:w-auto">
          {/* search */}
          <div className="relative w-full sm:w-64">
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ara (ad, kategori)…"
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
            />
            <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          </div>

          {/* kategori filtresi */}
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="w-full sm:w-56 border rounded-lg p-2 text-sm"
          >
            <option value="all">Tüm Kategoriler</option>
            {categories
              .filter((c) => !c.parent)
              .map((c) => (
                <optgroup key={c._id} label={c.name}>
                  <option value={c._id}>{c.name} (Ana)</option>
                  {(c.children || []).map((ch) => (
                    <option key={ch._id} value={ch._id}>
                      └ {ch.name}
                    </option>
                  ))}
                </optgroup>
              ))}
          </select>

          {/* sıralama */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full sm:w-56 border rounded-lg p-2 text-sm"
          >
            <option value="newest">En Yeni</option>
            <option value="priceAsc">Fiyat (Artan)</option>
            <option value="priceDesc">Fiyat (Azalan)</option>
            <option value="stockDesc">Stok (Yüksek → Düşük)</option>
            <option value="stockAsc">Stok (Düşük → Yüksek)</option>
          </select>

          {/* görünüm seçici */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("grid")}
              className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border transition ${
                view === "grid"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
              title="Grid görünüm"
            >
              <FaTh />
            </button>
            <button
              onClick={() => setView("list")}
              className={`inline-flex items-center justify-center w-10 h-10 rounded-lg border transition ${
                view === "list"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
              title="Liste görünüm"
            >
              <FaList />
            </button>
          </div>

          <button
            onClick={openNewForm}
            className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg text-sm shadow transition-all"
          >
            <FaPlus /> Yeni Ürün
          </button>
        </div>
      </div>

      {/* Yükleniyor / Liste */}
      {loading ? (
        view === "grid" ? (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden bg-white">
            {Array.from({ length: 8 }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 sm:p-12 text-center bg-white">
          <p className="text-lg font-medium mb-2">Kayıt bulunamadı</p>
          <p className="text-gray-600 mb-4">
            Filtreleri temizleyin veya yeni bir ürün ekleyin.
          </p>
          <button
            onClick={openNewForm}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Ürün Ekle
          </button>
        </div>
      ) : view === "grid" ? (
        /* -------- GRID GÖRÜNÜM -------- */
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {filtered.map((p) => {
            const stock = (p.sizes || []).reduce(
              (t, s) => t + (s.stock || 0),
              0
            );
            const discountPct = Number(p.discount || 0);
            const hasDiscount = discountPct > 0;

            return (
              <div
                key={p._id}
                className="relative bg-white rounded-xl border border-gray-100 hover:shadow-xl transition-shadow overflow-hidden group"
              >
                {/* Görsel */}
                <div className="relative h-48">
                  <img
                    src={imgOrPlaceholder(p.images?.[0])}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* üstten degrade */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent pointer-events-none" />

                  {/* hover overlay + hızlı düzenle */}
                  <button
                    onClick={() => openEditForm(p)}
                    className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-white/55 backdrop-blur-sm transition rounded-none"
                    title="Düzenle"
                  >
                    <span className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded-lg shadow-sm">
                      <FaPen className="opacity-70" />
                      Düzenle
                    </span>
                  </button>

                  {/* rozetler */}
                  <div className="absolute top-2 left-2 flex gap-2">
                    {hasDiscount && (
                      <Badge color="amber">İndirim {discountPct}%</Badge>
                    )}
                    <Badge color={stock > 0 ? "green" : "red"}>
                      Stok: {stock}
                    </Badge>
                  </div>
                </div>

                {/* Bilgiler */}
                <div className="p-4">
                  <p className="text-gray-900 font-medium truncate">{p.name}</p>
                  <p className="text-gray-500 text-sm truncate">
                    {p.category?.name || "-"}
                  </p>

                  {/* Fiyat bölümü */}
                  <div className="mt-2 flex items-baseline gap-2">
                    {renderPrice(p)}
                    {p.color && (
                      <span className="ml-auto text-xs px-2 py-0.5 bg-gray-100 rounded">
                        {p.color}
                      </span>
                    )}
                  </div>

                  {/* Aksiyon Çubuğu */}
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <div className="flex items-center gap-2">
                      {!p.parentProductId && (
                        <button
                          onClick={() => openNewColorForm(p)}
                          className="text-sm inline-flex items-center gap-2 px-3 py-1 rounded border hover:bg-gray-50"
                          title="Yeni Renk Ekle"
                        >
                          <FaPalette />
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteId(p._id)}
                        className="text-sm inline-flex items-center gap-2 px-3 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50"
                        title="Sil"
                      >
                        <FaTrashAlt />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* -------- LİSTE GÖRÜNÜM (resimsiz, mobile-first) -------- */
        <div className="rounded-xl border overflow-hidden bg-white">
          {/* masaüstü başlık satırı */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b text-xs font-semibold text-gray-600">
            <div className="col-span-4">Ürün</div>
            <div className="col-span-2">Kategori</div>
            <div className="col-span-2">Fiyat</div>
            <div className="col-span-2">Stok</div>
            <div className="col-span-2 text-right">Aksiyon</div>
          </div>

          {/* satırlar */}
          <div className="divide-y">
            {filtered.map((p) => {
              const stock = (p.sizes || []).reduce(
                (t, s) => t + (s.stock || 0),
                0
              );
              const discountPct = Number(p.discount || 0);
              const hasDiscount = discountPct > 0;

              return (
                <div
                  key={p._id}
                  className="p-3 sm:p-4 md:grid md:grid-cols-12 md:items-center gap-4"
                >
                  {/* Ürün adı + rozetler (md: col-span-4) */}
                  <div className="flex flex-col gap-1 md:col-span-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {p.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {hasDiscount && (
                          <Badge color="amber">{discountPct}% indirim</Badge>
                        )}
                        <Badge color={stock > 0 ? "green" : "red"}>
                          Stok: {stock}
                        </Badge>
                      </div>
                    </div>

                    {/* mobilde ek bilgiler */}
                    <div className="md:hidden text-xs text-gray-500">
                      <div className="flex justify-between">
                        <span>Kategori</span>
                        <span className="text-gray-700">
                          {p.category?.name || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fiyat</span>
                        <span className="text-gray-700">{renderPrice(p)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Kategori (md: col-span-2) */}
                  <div className="hidden md:block md:col-span-2 text-sm text-gray-700 truncate">
                    {p.category?.name || "-"}
                  </div>

                  {/* Fiyat (md: col-span-2) */}
                  <div className="hidden md:block md:col-span-2">
                    {renderPrice(p)}
                  </div>

                  {/* Stok (md: col-span-2) */}
                  <div className="hidden md:flex md:col-span-2 items-center">
                    <Badge color={stock > 0 ? "green" : "red"}> {stock} </Badge>
                  </div>

                  {/* Aksiyonlar (md: col-span-2) */}
                  <div className="mt-3 md:mt-0 md:col-span-2 flex items-center justify-end gap-2">
                    {!p.parentProductId && (
                      <button
                        onClick={() => openNewColorForm(p)}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded border hover:bg-gray-50 text-sm"
                        title="Yeni Renk Ekle"
                      >
                        <FaPalette />
                        <span className="hidden xl:inline">Yeni Renk</span>
                      </button>
                    )}
                    <button
                      onClick={() => openEditForm(p)}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded border hover:bg-gray-50 text-sm"
                      title="Düzenle"
                    >
                      <FaPen />
                      <span className="hidden xl:inline">Düzenle</span>
                    </button>
                    <button
                      onClick={() => setDeleteId(p._id)}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 text-sm"
                      title="Sil"
                    >
                      <FaTrashAlt />
                      <span className="hidden xl:inline">Sil</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Silme Onayı */}
      {deleteId && (
        <Window title="Onayla" onClose={() => setDeleteId(null)}>
          <div className="space-y-5 text-sm">
            <p>Bu ürünü silmek istediğinize emin misiniz?</p>
            <div className="flex justify-end gap-3">
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

      {/* Form Penceresi */}
      {isFormOpen && (
        <Window
          title={
            formMode === "new-color"
              ? "Yeni Renk Ekle"
              : formMode === "edit"
              ? "Ürünü Güncelle"
              : "Yeni Ürün"
          }
          onClose={requestCloseForm}
        >
          <div onInputCapture={markFormDirty} onChangeCapture={markFormDirty}>
          {formMode === "new-color" ? (
            <AddNewColorForm
              product={activeProduct}
              onClose={requestCloseForm}
              onSaved={onSaved}
            />
          ) : formMode === "edit" ? (
            <EditProductForm
              product={activeProduct}
              onClose={requestCloseForm}
              onSaved={onSaved}
            />
          ) : (
            <ProductFormModal onClose={requestCloseForm} onSaved={onSaved} />
          )}
          </div>
        </Window>
      )}

      <ConfirmDialog
        open={closeConfirmOpen}
        title="Değişiklikleri kapat"
        message="Kaydedilmemiş değişiklikler var. Form kapatılırsa girdikleriniz kaybolur."
        confirmLabel="Kaydetmeden kapat"
        cancelLabel="Forma dön"
        tone="warning"
        onCancel={() => setCloseConfirmOpen(false)}
        onConfirm={closeForm}
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
