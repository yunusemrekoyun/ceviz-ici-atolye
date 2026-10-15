import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaPowerOff,
  FaSearch,
} from "react-icons/fa";
import ToastAlert from "../../components/ui/ToastAlert";
import Window from "../../components/ui/Window";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

const cx = (...cls) => cls.filter(Boolean).join(" ");

const TEMPLATE_OPTIONS = [
  { value: "buy_x_get_y_free", label: "X Ürün Alana Y Bedava" },
  { value: "buy_x_get_percent", label: "X Ürün Alana Sepette %Y İndirim" },
  { value: "spend_x_get_percent", label: "X TL Üzeri Sepette %Y İndirim" },
];

const HEADER_OPTIONS = [
  { value: "none", label: "Gösterme" },
  { value: "top_panel", label: "Üst Panel" },
  { value: "sub_panel", label: "Alt Panel" },
];

function toLocalInputValue(rawDate) {
  if (!rawDate) return "";
  const d = new Date(rawDate);
  if (Number.isNaN(d.getTime())) return "";
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function toIsoFromLocalInput(localValue) {
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function defaultDateRange() {
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    startAt: toLocalInputValue(now.toISOString()),
    endAt: toLocalInputValue(end.toISOString()),
  };
}

const emptyForm = {
  name: "",
  templateType: "buy_x_get_y_free",
  isEnabled: true,
  headerPlacement: "none",
  stackWithCatalogDiscount: true,
  productIds: [],
  ...defaultDateRange(),
  rules: {
    xQty: "",
    yQty: "",
    discountPercent: "",
    thresholdAmount: "",
  },
};

function templateLabel(type) {
  const found = TEMPLATE_OPTIONS.find((o) => o.value === type);
  return found?.label || type;
}

export default function CartCampaignsPage() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");

  const [openForm, setOpenForm] = useState(false);
  const [mode, setMode] = useState("create");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [dirty, setDirty] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);

  const [toast, setToast] = useState(null);
  const notify = (msg, type = "info") => setToast({ msg, type });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: campaignData }, { data: productData }] = await Promise.all([
        api.get("/cart-campaigns"),
        api.get("/products"),
      ]);
      setCampaigns(Array.isArray(campaignData) ? campaignData : []);
      setProducts(Array.isArray(productData) ? productData : []);
    } catch (err) {
      console.error(err);
      notify("Kampanyalar alınamadı.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCampaigns = useMemo(() => {
    if (!search.trim()) return campaigns;
    const q = search.toLowerCase();
    return campaigns.filter((c) => {
      const txt = `${c.name} ${templateLabel(c.templateType)}`.toLowerCase();
      return txt.includes(q);
    });
  }, [campaigns, search]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter((p) => String(p.name || "").toLowerCase().includes(q));
  }, [products, productSearch]);

  const resetForm = () => {
    setForm({ ...emptyForm, ...defaultDateRange() });
    setMode("create");
    setEditingId(null);
    setProductSearch("");
    setDirty(false);
    setCloseConfirmOpen(false);
  };

  const openCreate = () => {
    resetForm();
    setOpenForm(true);
  };

  const openEdit = (campaign) => {
    setMode("edit");
    setEditingId(campaign._id);
    setForm({
      name: campaign.name || "",
      templateType: campaign.templateType || "buy_x_get_y_free",
      isEnabled: Boolean(campaign.isEnabled),
      headerPlacement: campaign.headerPlacement || "none",
      stackWithCatalogDiscount: campaign.stackWithCatalogDiscount !== false,
      productIds: (campaign.productIds || []).map(String),
      startAt: toLocalInputValue(campaign.startAt),
      endAt: toLocalInputValue(campaign.endAt),
      rules: {
        xQty:
          campaign.rules?.xQty === null || campaign.rules?.xQty === undefined
            ? ""
            : String(campaign.rules.xQty),
        yQty:
          campaign.rules?.yQty === null || campaign.rules?.yQty === undefined
            ? ""
            : String(campaign.rules.yQty),
        discountPercent:
          campaign.rules?.discountPercent === null ||
          campaign.rules?.discountPercent === undefined
            ? ""
            : String(campaign.rules.discountPercent),
        thresholdAmount:
          campaign.rules?.thresholdAmount === null ||
          campaign.rules?.thresholdAmount === undefined
            ? ""
            : String(campaign.rules.thresholdAmount),
      },
    });
    setProductSearch("");
    setDirty(false);
    setCloseConfirmOpen(false);
    setOpenForm(true);
  };

  const requestCloseForm = () => {
    if (dirty) {
      setCloseConfirmOpen(true);
      return;
    }
    setOpenForm(false);
    resetForm();
  };

  const toggleProductId = (pid) => {
    setDirty(true);
    setForm((prev) => {
      const has = prev.productIds.includes(pid);
      return {
        ...prev,
        productIds: has
          ? prev.productIds.filter((id) => id !== pid)
          : [...prev.productIds, pid],
      };
    });
  };

  const buildPayload = () => {
    const startAt = toIsoFromLocalInput(form.startAt);
    const endAt = toIsoFromLocalInput(form.endAt);

    if (!form.name.trim()) throw new Error("Kampanya adı zorunludur.");
    if (!startAt || !endAt) throw new Error("Tarih alanları zorunludur.");
    if (new Date(endAt) <= new Date(startAt)) {
      throw new Error("Bitiş tarihi başlangıçtan sonra olmalı.");
    }
    if (!form.productIds.length) throw new Error("En az bir ürün seçmelisiniz.");

    const rules = {
      xQty: null,
      yQty: null,
      discountPercent: null,
      thresholdAmount: null,
    };

    if (form.templateType === "buy_x_get_y_free") {
      rules.xQty = Number(form.rules.xQty);
      rules.yQty = Number(form.rules.yQty);
      if (!Number.isFinite(rules.xQty) || rules.xQty < 1) {
        throw new Error("X değeri 1 veya daha büyük olmalıdır.");
      }
      if (!Number.isFinite(rules.yQty) || rules.yQty < 1) {
        throw new Error("Y değeri 1 veya daha büyük olmalıdır.");
      }
    }

    if (form.templateType === "buy_x_get_percent") {
      rules.xQty = Number(form.rules.xQty);
      rules.discountPercent = Number(form.rules.discountPercent);
      if (!Number.isFinite(rules.xQty) || rules.xQty < 1) {
        throw new Error("X değeri 1 veya daha büyük olmalıdır.");
      }
      if (
        !Number.isFinite(rules.discountPercent) ||
        rules.discountPercent <= 0 ||
        rules.discountPercent > 100
      ) {
        throw new Error("Yüzde 0-100 aralığında olmalıdır.");
      }
    }

    if (form.templateType === "spend_x_get_percent") {
      rules.thresholdAmount = Number(form.rules.thresholdAmount);
      rules.discountPercent = Number(form.rules.discountPercent);
      if (
        !Number.isFinite(rules.thresholdAmount) ||
        rules.thresholdAmount <= 0
      ) {
        throw new Error("Sepet eşiği 0'dan büyük olmalıdır.");
      }
      if (
        !Number.isFinite(rules.discountPercent) ||
        rules.discountPercent <= 0 ||
        rules.discountPercent > 100
      ) {
        throw new Error("Yüzde 0-100 aralığında olmalıdır.");
      }
    }

    return {
      name: form.name.trim(),
      templateType: form.templateType,
      isEnabled: Boolean(form.isEnabled),
      headerPlacement: form.headerPlacement,
      stackWithCatalogDiscount: Boolean(form.stackWithCatalogDiscount),
      startAt,
      endAt,
      productIds: form.productIds,
      rules,
    };
  };

  const submitForm = async (e) => {
    e.preventDefault();
    let payload;
    try {
      payload = buildPayload();
    } catch (err) {
      notify(err.message || "Form doğrulanamadı.", "error");
      return;
    }

    try {
      if (mode === "create") {
        await api.post("/cart-campaigns", payload);
        notify("Kampanya oluşturuldu.", "success");
      } else {
        await api.put(`/cart-campaigns/${editingId}`, payload);
        notify("Kampanya güncellendi.", "success");
      }
      setDirty(false);
      setOpenForm(false);
      resetForm();
      await fetchData();
    } catch (err) {
      console.error(err);
      notify(err?.response?.data?.message || "Kayıt işlemi başarısız.", "error");
    }
  };

  const toggleEnabled = async (campaign, nextEnabled) => {
    try {
      await api.patch(`/cart-campaigns/${campaign._id}/toggle`, {
        isEnabled: nextEnabled,
      });
      notify(nextEnabled ? "Kampanya açıldı." : "Kampanya kapatıldı.", "success");
      await fetchData();
    } catch (err) {
      console.error(err);
      notify("Kampanya durumu güncellenemedi.", "error");
    }
  };

  const deleteCampaign = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/cart-campaigns/${confirmDelete._id}`);
      notify("Kampanya silindi.", "success");
      setConfirmDelete(null);
      await fetchData();
    } catch (err) {
      console.error(err);
      notify("Kampanya silinemedi.", "error");
    }
  };

  const selectedCount = form.productIds.length;
  const percentMode =
    form.templateType === "buy_x_get_percent" ||
    form.templateType === "spend_x_get_percent";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-semibold">Sepet Kampanyaları</h1>
          <p className="text-sm text-gray-500">
            Şablon bazlı kampanyaları oluşturun, tarihleyin ve header konumunu seçin.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800"
        >
          <FaPlus /> <span className="hidden xs:inline">Yeni Kampanya</span>
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kampanya ara..."
              className="w-full border rounded-lg pl-9 pr-3 py-2"
            />
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm min-w-[920px]">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2">Kampanya</th>
                <th className="text-left px-4 py-2">Şablon</th>
                <th className="text-left px-4 py-2">Dönem</th>
                <th className="text-left px-4 py-2">Header</th>
                <th className="text-left px-4 py-2">Durum</th>
                <th className="text-right px-4 py-2">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    Yükleniyor...
                  </td>
                </tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    Kampanya bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((c, idx) => (
                  <tr
                    key={c._id}
                    className={idx % 2 ? "bg-white" : "bg-gray-50/50"}
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-gray-500">
                        Ürün sayısı: {Array.isArray(c.productIds) ? c.productIds.length : 0}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">{templateLabel(c.templateType)}</td>
                    <td className="px-4 py-3 align-top">
                      <div>{new Date(c.startAt).toLocaleString("tr-TR")}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(c.endAt).toLocaleString("tr-TR")}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {c.headerPlacement === "none"
                        ? "Gösterme"
                        : c.headerPlacement === "top_panel"
                        ? "Üst Panel"
                        : "Alt Panel"}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="space-y-1">
                        <span
                          className={cx(
                            "inline-flex items-center px-2 py-1 rounded-full text-xs",
                            c.isEnabled
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-200 text-gray-700"
                          )}
                        >
                          {c.isEnabled ? "Açık" : "Kapalı"}
                        </span>
                        <div>
                          <span
                            className={cx(
                              "inline-flex items-center px-2 py-1 rounded-full text-xs",
                              c.isLive
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            )}
                          >
                            {c.isLive ? "Yayında" : "Yayın Dışı"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(c)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white"
                          title="Düzenle"
                        >
                          <FaEdit className="text-xs" />
                          <span className="hidden md:inline">Düzenle</span>
                        </button>

                        <button
                          onClick={() => toggleEnabled(c, !c.isEnabled)}
                          className={cx(
                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-white",
                            c.isEnabled
                              ? "bg-gray-700 hover:bg-gray-800"
                              : "bg-emerald-600 hover:bg-emerald-700"
                          )}
                          title={c.isEnabled ? "Kapat" : "Aç"}
                        >
                          <FaPowerOff className="text-xs" />
                          <span className="hidden md:inline">
                            {c.isEnabled ? "Kapat" : "Aç"}
                          </span>
                        </button>

                        <button
                          onClick={() => setConfirmDelete(c)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white"
                          title="Sil"
                        >
                          <FaTrash className="text-xs" />
                          <span className="hidden md:inline">Sil</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {openForm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-2 sm:p-4">
          <div className="w-full max-w-[1100px] sm:rounded-2xl bg-white shadow-xl overflow-hidden h-[95vh] sm:h-auto sm:max-h-[90vh] flex flex-col">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold">
                {mode === "create" ? "Yeni Sepet Kampanyası" : "Kampanyayı Düzenle"}
              </h2>
              <button
                onClick={requestCloseForm}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Kapat
              </button>
            </div>

            <form
              onSubmit={submitForm}
              className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-5 overflow-auto"
            >
              <div className="lg:col-span-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Kampanya Adı</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.name}
                    onChange={(e) => {
                      setDirty(true);
                      setForm((prev) => ({ ...prev, name: e.target.value }));
                    }}
                    placeholder="Örn. 3 Al 1 Bedava"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Şablon</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.templateType}
                    onChange={(e) => {
                      setDirty(true);
                      setForm((prev) => ({
                        ...prev,
                        templateType: e.target.value,
                        rules: {
                          xQty: "",
                          yQty: "",
                          discountPercent: "",
                          thresholdAmount: "",
                        },
                      }));
                    }}
                  >
                    {TEMPLATE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Başlangıç</label>
                  <input
                    type="datetime-local"
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.startAt}
                    onChange={(e) => {
                      setDirty(true);
                      setForm((prev) => ({ ...prev, startAt: e.target.value }));
                    }}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Bitiş</label>
                  <input
                    type="datetime-local"
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.endAt}
                    onChange={(e) => {
                      setDirty(true);
                      setForm((prev) => ({ ...prev, endAt: e.target.value }));
                    }}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Header Konumu</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.headerPlacement}
                    onChange={(e) => {
                      setDirty(true);
                      setForm((prev) => ({
                        ...prev,
                        headerPlacement: e.target.value,
                      }));
                    }}
                  >
                    {HEADER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {form.templateType === "buy_x_get_y_free" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">X (Alınan)</label>
                      <input
                        type="number"
                        min={1}
                        className="w-full border rounded-lg px-3 py-2"
                        value={form.rules.xQty}
                        onChange={(e) => {
                          setDirty(true);
                          setForm((prev) => ({
                            ...prev,
                            rules: { ...prev.rules, xQty: e.target.value },
                          }));
                        }}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Y (Bedava)</label>
                      <input
                        type="number"
                        min={1}
                        className="w-full border rounded-lg px-3 py-2"
                        value={form.rules.yQty}
                        onChange={(e) => {
                          setDirty(true);
                          setForm((prev) => ({
                            ...prev,
                            rules: { ...prev.rules, yQty: e.target.value },
                          }));
                        }}
                        required
                      />
                    </div>
                  </>
                )}

                {form.templateType === "buy_x_get_percent" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Kaç ürün alınca?
                      </label>
                      <input
                        type="number"
                        min={1}
                        className="w-full border rounded-lg px-3 py-2"
                        value={form.rules.xQty}
                        onChange={(e) => {
                          setDirty(true);
                          setForm((prev) => ({
                            ...prev,
                            rules: { ...prev.rules, xQty: e.target.value },
                          }));
                        }}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">% Kaç indirim?</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        className="w-full border rounded-lg px-3 py-2"
                        value={form.rules.discountPercent}
                        onChange={(e) => {
                          setDirty(true);
                          setForm((prev) => ({
                            ...prev,
                            rules: {
                              ...prev.rules,
                              discountPercent: e.target.value,
                            },
                          }));
                        }}
                        required
                      />
                    </div>
                  </>
                )}

                {form.templateType === "spend_x_get_percent" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Kaç TL üzeri?
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-full border rounded-lg px-3 py-2"
                        value={form.rules.thresholdAmount}
                        onChange={(e) => {
                          setDirty(true);
                          setForm((prev) => ({
                            ...prev,
                            rules: {
                              ...prev.rules,
                              thresholdAmount: e.target.value,
                            },
                          }));
                        }}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">% Kaç indirim?</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        className="w-full border rounded-lg px-3 py-2"
                        value={form.rules.discountPercent}
                        onChange={(e) => {
                          setDirty(true);
                          setForm((prev) => ({
                            ...prev,
                            rules: {
                              ...prev.rules,
                              discountPercent: e.target.value,
                            },
                          }));
                        }}
                        required
                      />
                    </div>
                  </>
                )}

                {percentMode && (
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.stackWithCatalogDiscount}
                      onChange={(e) => {
                        setDirty(true);
                        setForm((prev) => ({
                          ...prev,
                          stackWithCatalogDiscount: e.target.checked,
                        }));
                      }}
                    />
                    <span>Mevcut katalog indirimlerinin üstüne binsin</span>
                  </label>
                )}

                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isEnabled}
                    onChange={(e) => {
                      setDirty(true);
                      setForm((prev) => ({
                        ...prev,
                        isEnabled: e.target.checked,
                      }));
                    }}
                  />
                  <span>Kampanya açık</span>
                </label>
              </div>

              <div className="lg:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <label className="text-sm font-medium">
                    Kapsanan Ürünler ({selectedCount})
                  </label>
                  <div className="relative flex-1 sm:max-w-xs">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Ürün ara..."
                      className="w-full border rounded-lg pl-9 pr-3 py-2"
                    />
                  </div>
                </div>

                <div className="mb-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDirty(true);
                      setForm((prev) => ({
                        ...prev,
                        productIds: Array.from(
                          new Set([
                            ...prev.productIds,
                            ...filteredProducts.map((p) => String(p._id)),
                          ])
                        ),
                      }));
                    }}
                    className="text-xs px-2 py-1 rounded border"
                  >
                    Filtredekileri Seç
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDirty(true);
                      setForm((prev) => ({ ...prev, productIds: [] }));
                    }}
                    className="text-xs px-2 py-1 rounded border"
                  >
                    Tümünü Temizle
                  </button>
                </div>

                <div className="h-[52vh] sm:h-72 md:h-80 overflow-y-auto rounded-lg border p-3 space-y-1">
                  {filteredProducts.length === 0 ? (
                    <div className="text-sm text-gray-500">Ürün bulunamadı.</div>
                  ) : (
                    filteredProducts.map((p) => {
                      const pid = String(p._id);
                      const checked = form.productIds.includes(pid);
                      return (
                        <label
                          key={pid}
                          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleProductId(pid)}
                          />
                          <span className="text-sm truncate">{p.name}</span>
                          <span className="ml-auto text-xs text-gray-500">
                            ₺{Number(p.price || 0).toFixed(2)}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>

                <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-md border"
                    onClick={requestCloseForm}
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-black text-white hover:bg-gray-800"
                  >
                    {mode === "create" ? "Kaydet" : "Güncelle"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
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
          setDirty(false);
          setOpenForm(false);
          resetForm();
        }}
      />

      {confirmDelete && (
        <Window title="Onayla" onClose={() => setConfirmDelete(null)}>
          <div className="space-y-5 text-sm">
            <p>
              Bu kampanyayı silmek istediğinize emin misiniz?
              <br />
              <span className="font-medium">"{confirmDelete.name}"</span>
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Vazgeç
              </button>
              <button
                onClick={deleteCampaign}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Sil
              </button>
            </div>
          </div>
        </Window>
      )}

      {toast && (
        <ToastAlert
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={4000}
        />
      )}
    </div>
  );
}
