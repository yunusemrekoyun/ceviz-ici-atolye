// src/components/pages/MiniCampaignsPage.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
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
  Tooltip,
} from "@material-tailwind/react";
import {
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import api from "../../../api";
import ToastAlert from "../../components/ui/ToastAlert";
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

/* ───── Skeleton Card ───── */
const CardSkeleton = () => (
  <div className="animate-pulse rounded-xl border border-gray-100 overflow-hidden">
    <div className="h-48 bg-gray-200" />
    <div className="p-4 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-2/3" />
      <div className="h-3 bg-gray-2 00 rounded w-1/2" />
      <div className="h-8 bg-gray-200 rounded w-24 mt-3" />
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

export default function MiniCampaignsPage() {
  /* ---------------- state ---------------- */
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);

  const [saving, setSaving] = useState(false); // çift tıklama/tekrar submit koruması

  const [selectionType, setSelectionType] = useState("");
  const [options, setOptions] = useState({
    products: [],
    categories: [],
    subcategories: [],
  });

  const [form, setForm] = useState({
    _id: null,
    title: "",
    imageUrl: "",
    imageFile: null,
    products: [],
    categories: [],
    slot: "",
  });

  // alan bazlı hatalar
  const [fieldErrors, setFieldErrors] = useState({
    title: "",
    slot: "",
    selection: "",
    image: "",
  });

  /* üst bar: arama + slot filtresi */
  const [query, setQuery] = useState("");
  const [slotFilter, setSlotFilter] = useState("all"); // all | 1 | 2
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const searchRef = useRef(null);

  /* toast & sil onay */
  const [toast, setToast] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  /* upload queue */
  const { addTask, updateTask, removeTask } = useUploadQueue();

  /* ---------------- verileri yükle ---------------- */
  useEffect(() => {
    Promise.all([
      api.get("/mini-campaigns"),
      api.get("/products"),
      api.get("/categories"),
    ])
      .then(([{ data: mc }, { data: prods }, { data: cats }]) => {
        setItems(mc);
        setOptions({
          products: prods,
          categories: cats,
          subcategories: cats.flatMap((c) => c.children || []),
        });
      })
      .catch(() =>
        setToast({
          msg: "Veriler alınamadı, lütfen tekrar deneyin.",
          type: "error",
        })
      )
      .finally(() => setLoading(false));
  }, []);

  /* debounce arama */
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
      imageUrl: "",
      imageFile: null,
      products: [],
      categories: [],
      slot: "",
    });
    setSelectionType("");
    setFieldErrors({ title: "", slot: "", selection: "", image: "" });

    setSaving(false);
    setDialogOpen(true);
  };

  const openEdit = (c) => {
    const prodIds = c.products.map((p) => p._id);
    const catIds = c.categories.map((cat) => cat._id);
    const subIds = options.subcategories.map((s) => s._id);

    let type = "";
    if (prodIds.length) type = "products";
    else if (catIds.some((id) => subIds.includes(id))) type = "subcategories";
    else if (catIds.length) type = "categories";

    setForm({
      _id: c._id,
      title: c.title,
      imageUrl: c.imageUrl,
      imageFile: null,
      products: prodIds,
      categories: catIds,
      slot: c.slot ? String(c.slot) : "",
    });
    setSelectionType(type);
    setFieldErrors({ title: "", slot: "", selection: "", image: "" });

    setSaving(false);
    setDialogOpen(true);
  };

  /* ---------------- silme ---------------- */
  const triggerDelete = (id) => setDeleteId(id);

  // Slota alır (oradaki kampanya yayından düşer) ya da slot boşaltıp yayından kaldırır.
  const handleSlot = async (id, slot) => {
    try {
      if (slot) await api.patch(`/mini-campaigns/${id}/activate?slot=${slot}`);
      else await api.patch(`/mini-campaigns/${id}/deactivate`);
      const { data } = await api.get("/mini-campaigns");
      setItems(data);
      setToast({
        msg: slot ? `Mini kampanya ${slot === 1 ? "Slot 1'e" : "Slot 2'ye"} alındı.` : "Mini kampanya yayından kaldırıldı.",
        type: "success",
      });
    } catch (err) {
      setToast({ msg: err.response?.data?.message || "Slot güncellenemedi.", type: "error" });
    }
  };

  const handleDeleteConfirmed = async () => {
    const id = deleteId;
    setDeleteId(null);
    try {
      await api.delete(`/mini-campaigns/${id}`);
      setItems((xs) => xs.filter((x) => x._id !== id));
      setToast({ msg: "Mini kampanya silindi.", type: "success" });
    } catch {
      setToast({ msg: "Mini kampanya silinemedi.", type: "error" });
    }
  };

  /* ---------------- derived list ---------------- */
  const filtered = useMemo(() => {
    let list = [...items];

    if (debouncedQuery) {
      list = list.filter((c) =>
        (c.title || "").toLowerCase().includes(debouncedQuery)
      );
    }

    if (slotFilter !== "all") {
      const slotNum = Number(slotFilter);
      list = list.filter((c) => Number(c.slot) === slotNum);
    }

    // en yeni üstte (createdAt varsa), yoksa _id fallback
    list.sort((a, b) => {
      const A = a.createdAt || a._id;
      const B = b.createdAt || b._id;
      return A < B ? 1 : -1;
    });

    return list;
  }, [items, debouncedQuery, slotFilter]);

  const slot1Taken = items.some(
    (c) => Number(c.slot) === 1 && c._id !== form._id
  );
  const slot2Taken = items.some(
    (c) => Number(c.slot) === 2 && c._id !== form._id
  );

  const selectionCount =
    selectionType === "products"
      ? form.products.length
      : form.categories.length;

  const isValid =
    (form.title || "").trim().length > 0 &&
    selectionType &&
    selectionCount > 0 &&
    (Boolean(form.imageUrl) || Boolean(form.imageFile) || Boolean(form._id));

  /* ---------------- Validasyon yardımcıları ---------------- */
  const validateAndSetErrors = () => {
    const errs = { title: "", slot: "", selection: "", image: "" };

    if (!(form.title || "").trim()) errs.title = "Başlık zorunludur.";

    // Boş slot = kaydedilir ama sitede görünmez.
    if (form.slot && !["1", "2"].includes(form.slot)) {
      errs.slot = "Slot sadece 1 veya 2 olabilir.";
    } else if (
      (form._id == null && form.slot === "1" && slot1Taken) ||
      (form._id == null && form.slot === "2" && slot2Taken)
    ) {
      errs.slot = `Seçilen slot (${form.slot}) dolu. Lütfen diğer slotu seçin.`;
    }

    if (!selectionType) {
      errs.selection = "Seçim türü zorunludur (Ürün/Kategori/Alt Kategori).";
    } else if (selectionCount === 0) {
      errs.selection =
        selectionType === "products"
          ? "En az bir ürün seçiniz."
          : "En az bir kategori/alt kategori seçiniz.";
    }

    if (!form._id && !(form.imageUrl || form.imageFile)) {
      errs.image = "Kapak görseli zorunludur.";
    }

    setFieldErrors(errs);
    return Object.values(errs).every((v) => !v);
  };

  /* ---------------- Görsel seçimi (optimizasyon + uyarı) ---------------- */
  const onPickFile = async (file) => {
    if (!file) return;

    try {
      validateMediaFile(file, "mini_campaign_image");
      startMediaPreparation(file, "mini_campaign_image");
      setForm((f) => ({
        ...f,
        imageFile: file,
        imageUrl: URL.createObjectURL(file),
      }));
      setFieldErrors((e) => ({ ...e, image: "" }));
      setToast({
        msg: "Görsel sunucuda banner boyutları için optimize edilecek.",
        type: "info",
      });
    } catch (err) {
      console.error(err);
      setFieldErrors((e) => ({
        ...e,
        image: mediaErrorMessage(err),
      }));
      setToast({
        msg: mediaErrorMessage(err),
        type: "error",
      });
    }
  };

  /* ---------------- kaydet (queue) ---------------- */
  const handleSave = async () => {
    if (saving) return;

    const ok = validateAndSetErrors();
    if (!ok) {
      setToast({
        msg: "Lütfen zorunlu alanları doldurun: Başlık, Seçim ve Görsel.",
        type: "error",
      });
      return;
    }

    setSaving(true);

    // UploadQueue
    const id = uuidv4();
    addTask({ id, name: form.title || "Mini Kampanya", progress: 0 });

    try {
      const asset = form.imageFile
        ? await uploadMediaFile(form.imageFile, "mini_campaign_image", {
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
        slot: form.slot,
        products: form.products,
        categories: form.categories,
        ...(asset ? { imageAssetId: asset.id } : {}),
      };
      if (form._id) {
        await api.put(`/mini-campaigns/${form._id}`, payload);
      } else {
        await api.post("/mini-campaigns", payload);
      }

      updateTask(id, { progress: 100, status: "success" });
      setTimeout(() => removeTask(id), 2000);

      const { data } = await api.get("/mini-campaigns");
      setItems(data);
      setDialogOpen(false);
      setToast({ msg: "Mini kampanya kaydedildi.", type: "success" });
      setSaving(false);
    } catch (err) {
      console.error("Kampanya kaydetme hatası:", err);
      const message = mediaErrorMessage(
        err,
        err.response?.data?.message || "Mini kampanya kaydedilemedi"
      );
      updateTask(id, {
        progress: 100,
        status: "error",
        errorMsg: message,
      });
      setTimeout(() => removeTask(id), 4000);
      setToast({
        msg: message,
        type: "error",
      });
      setSaving(false);
    }
  };

  /* ---------------- render ---------------- */
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 space-y-6">
        <div className="flex justify-between items-center">
          <Typography variant="h4">Mini Kampanyalar</Typography>
          <Button color="blue" disabled>
            + Yeni Mini Kampanya
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const currentSelectOptions = options[selectionType] || [];
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 space-y-6">
      {/* üst bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div className="min-w-0">
          <Typography variant="h4" className="text-2xl sm:text-3xl">
            Mini Kampanyalar
          </Typography>
          <Typography variant="small" className="text-gray-600">
            Başlığa göre arayın, slot’a göre filtreleyin.
          </Typography>
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative">
            <Input
              inputRef={searchRef}
              icon={<MagnifyingGlassIcon className="h-5 w-5" />}
              label="Ara (başlık)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              crossOrigin=""
            />
          </div>

          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-500" />
            <select
              className="border rounded-lg p-2 text-sm"
              value={slotFilter}
              onChange={(e) => setSlotFilter(e.target.value)}
            >
              <option value="all">Tüm Slotlar</option>
              <option value="1">Slot 1</option>
              <option value="2">Slot 2</option>
            </select>
          </div>

          <Button color="blue" onClick={openNew}>
            + Yeni Mini Kampanya
          </Button>
        </div>
      </div>

      {/* liste */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 sm:p-12 text-center">
          <Typography variant="h6" className="mb-2">
            Kayıt bulunamadı
          </Typography>
          <Typography className="text-gray-600 mb-4">
            Filtreleri temizleyin veya yeni bir mini kampanya ekleyin.
          </Typography>
          <Button color="blue" onClick={openNew}>
            Mini Kampanya Oluştur
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c) => (
            <Card
              key={c._id}
              className="relative overflow-hidden group border border-gray-100 hover:shadow-xl transition-shadow"
            >
              <div className="relative h-48">
                <img
                  loading="lazy"
                  src={c.imageUrl}
                  alt={c.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent pointer-events-none" />

                {/* HOVER'DA ORTADA DÜZENLE (md ve üstü) */}
                <button
                  onClick={() => openEdit(c)}
                  className="absolute inset-0 hidden md:flex items-center justify-center bg-white/55 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition"
                  title="Düzenle"
                >
                  <span className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded-lg shadow-sm">
                    <PencilIcon className="w-4 h-4" />
                    Düzenle
                  </span>
                </button>

                <div className="absolute top-2 left-2 flex gap-2">
                  {Number(c.slot) === 1 && <Badge color="blue">Slot 1</Badge>}
                  {Number(c.slot) === 2 && <Badge color="green">Slot 2</Badge>}
                  {!c.slot && <Badge>Yayında değil</Badge>}
                </div>
              </div>

              <CardBody>
                <Typography variant="h6" className="line-clamp-1 break-words">
                  {c.title}
                </Typography>

                {/* Yayın: slota al / yayından kaldır */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {c.slot ? (
                    <Button size="sm" variant="outlined" className="px-3 normal-case" onClick={() => handleSlot(c._id, null)}>
                      Yayından kaldır
                    </Button>
                  ) : (
                    [1, 2].map((n) => (
                      <Button key={n} size="sm" variant="outlined" className="px-3 normal-case" onClick={() => handleSlot(c._id, n)}>
                        {n === 1 ? "Slot 1'e al" : "Slot 2'ye al"}
                      </Button>
                    ))
                  )}
                </div>

                {/* Mobil aksiyonlar: düzenle/sil (hover yok) */}
                <div className="mt-3 flex items-center justify-end gap-2 md:hidden">
                  <Button
                    size="sm"
                    variant="outlined"
                    className="px-3"
                    onClick={() => openEdit(c)}
                    aria-label="Düzenle"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    color="red"
                    variant="outlined"
                    onClick={() => triggerDelete(c._id)}
                    className="px-3"
                    aria-label="Sil"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>

                {/* Desktop aksiyon: sadece Sil (Düzenleme hover overlay’de) */}
                <div className="mt-4 hidden md:flex items-center justify-end gap-2">
                  <Tooltip content="Sil">
                    <Button
                      size="sm"
                      color="red"
                      variant="outlined"
                      onClick={() => triggerDelete(c._id)}
                      className="px-3"
                      aria-label="Sil"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </Tooltip>
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
        handler={() => {
          if (!saving) setDialogOpen(false);
        }}
        className="mx-2 sm:mx-auto"
      >
        <DialogHeader>
          {form._id ? "Mini Kampanyayı Güncelle" : "Yeni Mini Kampanya"}
        </DialogHeader>
        <DialogBody divider className="overflow-auto max-h-[75vh] pr-1 sm:pr-4">
          {/* Bilgilendirme bandı (zorunlular) */}
          <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-900 p-3 mb-4 text-sm flex items-start gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <b>Zorunlu alanlar:</b> Başlık, Seçim Türü ve en az bir
              seçim. Yeni kayıt oluştururken Kapak Görseli de zorunludur.
              Slot seçilmezse kampanya kaydedilir ama sitede görünmez.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SOL: FORM */}
            <div className="space-y-4">
              {/* başlık */}
              <div>
                <Input
                  label="Başlık *"
                  value={form.title}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, title: e.target.value }));

                    setFieldErrors((er) => ({ ...er, title: "" }));
                  }}
                  crossOrigin=""
                  error={Boolean(fieldErrors.title)}
                />
                {fieldErrors.title && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.title}
                  </p>
                )}
              </div>

              {/* slot */}
              <div>
                <label className="block mb-2 font-medium">Slot</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, slot: "1" }));

                      setFieldErrors((er) => ({ ...er, slot: "" }));
                    }}
                    disabled={slot1Taken && form._id == null}
                    className={`border rounded-lg py-2 text-sm ${
                      form.slot === "1"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    } ${
                      slot1Taken && form._id == null
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    Slot 1 {slot1Taken && form._id == null ? "(Dolu)" : ""}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, slot: "2" }));

                      setFieldErrors((er) => ({ ...er, slot: "" }));
                    }}
                    disabled={slot2Taken && form._id == null}
                    className={`border rounded-lg py-2 text-sm ${
                      form.slot === "2"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    } ${
                      slot2Taken && form._id == null
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    Slot 2 {slot2Taken && form._id == null ? "(Dolu)" : ""}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, slot: "" }));
                      setFieldErrors((er) => ({ ...er, slot: "" }));
                    }}
                    className={`border rounded-lg py-2 text-sm ${
                      !form.slot
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    Yayında değil
                  </button>
                </div>
                {fieldErrors.slot && (
                  <p className="mt-2 text-xs text-red-600">
                    {fieldErrors.slot}
                  </p>
                )}
              </div>

              {/* seçim türü */}
              <div>
                <label className="block mb-2 font-medium">Seçim Türü *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "", label: "—" },
                    { key: "products", label: "Ürün" },
                    { key: "categories", label: "Kategori" },
                    { key: "subcategories", label: "Alt Kategori" },
                  ].map((t) => (
                    <button
                      key={t.key || "none"}
                      type="button"
                      onClick={() => {
                        setSelectionType(t.key);
                        setForm((f) => ({
                          ...f,
                          products: [],
                          categories: [],
                        }));

                        setFieldErrors((er) => ({ ...er, selection: "" }));
                      }}
                      className={`border rounded-lg py-2 text-sm ${
                        selectionType === t.key
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {fieldErrors.selection && (
                  <p className="mt-2 text-xs text-red-600">
                    {fieldErrors.selection}
                  </p>
                )}
              </div>

              {/* çoklu seçim */}
              {selectionType && (
                <div className="space-y-2">
                  <MultiSelectionList
                    key={`${selectionType}-${form._id || "new"}-${dialogOpen}`}
                    label={
                      selectionType === "products"
                        ? "Ürünleri seçin *"
                        : selectionType === "categories"
                        ? "Kategorileri seçin *"
                        : "Alt kategorileri seçin *"
                    }
                    itemName={selectionType === "products" ? "ürün" : "kategori"}
                    options={currentSelectOptions}
                    value={selectionType === "products" ? form.products : form.categories}
                    disabled={saving}
                    onChange={(ids) => {
                      setForm((f) => ({
                        ...f,
                        products:
                          selectionType === "products" ? ids : f.products,
                        categories:
                          selectionType !== "products" ? ids : f.categories,
                      }));
                      setFieldErrors((er) => ({ ...er, selection: "" }));
                    }}
                  />
                </div>
              )}

              {/* mevcut resim */}
              {form._id && form.imageUrl && !form.imageFile && (
                <div>
                  <Typography
                    variant="small"
                    className="block mb-1 text-gray-500"
                  >
                    Mevcut Resim
                  </Typography>
                  <img
                    src={form.imageUrl}
                    alt="Mevcut"
                    className="w-32 h-32 object-cover rounded mb-2 border"
                  />
                </div>
              )}

              {/* resim yükle */}
              <div>
                <label className="block text-sm mb-2 font-medium">
                  Kapak Görseli {form._id ? "" : "*"}
                </label>
                <label
                  className="border-2 border-dashed rounded-xl p-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50"
                  title="Görsel yükle"
                >
                  <ArrowUpTrayIcon className="w-5 h-5" />
                  <span className="text-sm">
                    {form.imageFile
                      ? form.imageFile.name
                      : "Dosya seçin (JPG/PNG önerilir)"}
                  </span>
                  <input
                    type="file"
                    accept="image/*,.heic,.heif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      onPickFile(file);
                    }}
                  />
                </label>
                <Typography variant="small" className="text-gray-500 mt-1">
                  Hedef çözünürlük: yaklaşık 1920×600 (oran korunur). Apple
                  fotoğrafları dahil görseller otomatik optimize edilir.
                </Typography>
                {fieldErrors.image && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.image}
                  </p>
                )}
              </div>

              {/* uyarı */}
              {!isValid && (
                <Typography variant="small" className="text-red-600">
                  Başlık, slot, seçim türü ve en az bir seçim gereklidir.
                </Typography>
              )}
            </div>

            {/* SAĞ: ÖNİZLEME */}
            <div>
              <Typography variant="small" className="text-gray-600 mb-2">
                Canlı Önizleme
              </Typography>
              <div className="rounded-xl border overflow-hidden">
                <div className="relative h-48">
                  {form.imageUrl ? (
                    <img
                      src={form.imageUrl}
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
                    {form.slot === "1" && <Badge color="blue">Slot 1</Badge>}
                    {form.slot === "2" && <Badge color="green">Slot 2</Badge>}
                  </div>
                </div>
                <div className="p-4">
                  <Typography variant="h6" className="line-clamp-1 break-words">
                    {form.title || "Mini Kampanya Başlığı"}
                  </Typography>
                </div>
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
          <Button
            variant="text"
            onClick={() => setDialogOpen(false)}
            className="w-full sm:w-auto"
            disabled={saving}
          >
            İptal
          </Button>
          <Button
            disabled={saving}
            onClick={handleSave}
            color="blue"
            className="w-full sm:w-auto"
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* silme onayı */}
      <ConfirmModal
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirmed}
        message="Bu mini kampanyayı silmek istediğinize emin misiniz?"
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
