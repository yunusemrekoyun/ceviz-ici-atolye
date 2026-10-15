// src/pages/admin/OrdersPage.jsx
import React, { useEffect, useRef, useState } from "react";
import api from "../../../api";
import { Listbox } from "@headlessui/react";
import {
  FaCheck,
  FaChevronDown,
  FaBoxOpen,
  FaClock,
  FaTruck,
  FaCheckCircle,
  FaBan,
  FaTimes,
  FaExclamationTriangle,
} from "react-icons/fa";
import useUnseenOrders from "../../hooks/useUnseenOrders";
import ToastAlert from "../../components/ui/ToastAlert";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import OrderDetailsModal from "../modals/OrderDetailsModal";

const PAGE_SIZE = 20;
const CARRIERS = [
  "Yurtiçi Kargo",
  "Aras Kargo",
  "MNG Kargo",
  "PTT Kargo",
  "Sürat Kargo",
  "HepsiJet",
  "Kolay Gelsin",
  "DHL",
  "UPS",
];
const CANCELLABLE = ["payment_review", "paid", "shipped", "completed"];
const withDrafts = (o) => ({
  ...o,
  selectedStatus: o.status,
  // Firma girilmediyse Kargo ayarlarındaki yöntem adı (siparişte kayıtlı) kullanılır.
  carrierDraft: o.shipping?.carrier || String(o.shipping?.name || "").slice(0, 60),
  trackingDraft: o.shipping?.trackingNumber || "",
});
const trackingChanged = (o) =>
  o.carrierDraft.trim() !== (o.shipping?.carrier || String(o.shipping?.name || "").slice(0, 60)) ||
  o.trackingDraft.replace(/\s+/g, "") !== (o.shipping?.trackingNumber || "");

const STATUS_LABELS = {
  pending: "Sipariş oluşturuldu",
  payment_review: "Ödeme incelemede",
  paid: "Ödeme alındı",
  shipped: "Kargoya verildi",
  completed: "Sipariş tamamlandı",
  cancelled: "İptal edildi",
};

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800",
  payment_review: "bg-orange-100 text-orange-900",
  paid: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_ICON = {
  pending: <FaClock className="inline -mt-0.5 mr-1" />,
  payment_review: (
    <FaExclamationTriangle className="inline -mt-0.5 mr-1" />
  ),
  paid: <FaCheck className="inline -mt-0.5 mr-1" />,
  shipped: <FaTruck className="inline -mt-0.5 mr-1" />,
  completed: <FaCheckCircle className="inline -mt-0.5 mr-1" />,
  cancelled: <FaBan className="inline -mt-0.5 mr-1" />,
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ pending: 0, active: 0, unpaid: 0 });
  const [reloadKey, setReloadKey] = useState(0);
  const [updatingId, setUpdatingId] = useState(null);
  const [imageViewer, setImageViewer] = useState(null);
  const [detailOrderId, setDetailOrderId] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const detailRequestRef = useRef(0);
  const mountedRef = useRef(true);
  const [toast, setToast] = useState(null);
  const { markSeen } = useUnseenOrders();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [statusFilter, setStatusFilter] = useState("");
  const [listMode, setListMode] = useState("active");

  // Arama yazılırken her tuşta istek atılmasın.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(id);
  }, [searchTerm]);

  // Filtre değişince ilk sayfaya dön.
  useEffect(() => {
    setPage(1);
  }, [listMode, statusFilter, sortOrder, debouncedSearch]);

  useEffect(() => {
    let alive = true;
    setRefreshing(true);
    setLoadError("");
    api
      .get("/orders/all", {
        params: {
          page,
          pageSize: PAGE_SIZE,
          mode: listMode,
          status: statusFilter || undefined,
          sort: sortOrder,
          q: debouncedSearch || undefined,
        },
      })
      .then(({ data }) => {
        if (!alive) return;
        setOrders(data.items.map(withDrafts));
        setTotal(data.total);
        setCounts({ pending: data.pendingCount, active: data.activeCount, unpaid: data.unpaidCount ?? 0 });
      })
      .catch((err) => {
        if (!alive) return;
        setLoadError(err?.response?.data?.message || "Siparişler yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
        setRefreshing(false);
      });
    return () => {
      alive = false;
    };
  }, [page, listMode, statusFilter, sortOrder, debouncedSearch, reloadKey]);

  const filteredOrders = orders;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleStatusChange = (id, newStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o._id === id ? { ...o, selectedStatus: newStatus } : o))
    );
  };

  const handleDraftChange = (id, field, value) => {
    setOrders((prev) => prev.map((o) => (o._id === id ? { ...o, [field]: value } : o)));
  };

  // Kargoya verilmiş siparişin firma / takip numarası düzeltmesi (müşteriye e-posta gitmez).
  const saveTracking = async (id) => {
    const order = orders.find((o) => o._id === id);
    if (!order) return;
    setUpdatingId(id);
    try {
      const { data } = await api.put(`/orders/${id}/tracking`, {
        carrier: order.carrierDraft,
        trackingNumber: order.trackingDraft,
      });
      setOrders((prev) =>
        prev.map((o) => (o._id === id ? withDrafts({ ...o, ...data.order, editingTracking: false }) : o))
      );
      setToast({ type: "success", msg: "Kargo bilgisi güncellendi." });
    } catch (err) {
      setToast({
        type: "error",
        msg: err?.response?.data?.message || "Kargo bilgisi güncellenemedi.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      detailRequestRef.current += 1;
    };
  }, []);

  useEffect(() => {
    const doSeen = () => markSeen();
    doSeen();
    window.addEventListener("focus", doSeen);
    return () => window.removeEventListener("focus", doSeen);
  }, [markSeen]);

  const [paidConfirmId, setPaidConfirmId] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelForm, setCancelForm] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const openCancel = (order) => {
    setCancelTarget(order);
    setCancelForm({
      refundAmount: String(order.totalPrice ?? ""),
      note: "",
      restock: Boolean(order.stockUpdated),
      notifyCustomer: true,
    });
  };

  const closeCancel = () => {
    if (cancelling) return;
    setCancelTarget(null);
    setCancelForm(null);
  };

  const submitCancel = async () => {
    if (!cancelTarget || !cancelForm) return;
    const amount = Number(String(cancelForm.refundAmount).replace(",", "."));
    if (!Number.isFinite(amount) || amount < 0 || amount > Number(cancelTarget.totalPrice || 0)) {
      setToast({ type: "error", msg: "İade tutarı 0 ile sipariş toplamı arasında olmalı." });
      return;
    }
    if (cancelForm.note.trim().length < 3) {
      setToast({ type: "error", msg: "İptal / iade açıklaması girin." });
      return;
    }
    setCancelling(true);
    try {
      const { data } = await api.post(`/orders/${cancelTarget._id}/cancel`, {
        refundAmount: amount,
        note: cancelForm.note.trim(),
        restock: cancelForm.restock,
        notifyCustomer: cancelForm.notifyCustomer,
      });
      const skipped = data?.skipped || [];
      setToast({
        type: skipped.length ? "info" : "success",
        msg: skipped.length
          ? `Sipariş iptal edildi. Stoğa eklenemeyen kalem: ${skipped.map((s) => `${s.name} (${s.size || "-"})`).join(", ")}`
          : "Sipariş iptal edildi.",
      });
      setCancelTarget(null);
      setCancelForm(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setToast({ type: "error", msg: err?.response?.data?.message || "Sipariş iptal edilemedi." });
    } finally {
      setCancelling(false);
    }
  };

  // Elle "Ödeme alındı" yapmak stoğu düşer ve geri alınamaz; PayTR kaydı olmadan yapılmamalı.
  const requestStatusUpdate = (id) => {
    const order = orders.find((o) => o._id === id);
    if (!order) return;
    if (order.selectedStatus === "cancelled" && CANCELLABLE.includes(order.status)) {
      openCancel(order);
      return;
    }
    if (order.selectedStatus === "paid" && order.status !== "paid") {
      setPaidConfirmId(id);
      return;
    }
    updateStatus(id);
  };

  const updateStatus = async (id) => {
    const order = orders.find((o) => o._id === id);
    if (!order) return;
    setUpdatingId(id);
    try {
      const payload = { status: order.selectedStatus };
      if (order.selectedStatus === "shipped") {
        payload.carrier = order.carrierDraft;
        payload.trackingNumber = order.trackingDraft;
      }
      const { data } = await api.put(`/orders/${id}/status`, payload);
      setOrders((prev) =>
        prev.map((o) =>
          o._id === id ? withDrafts({ ...o, ...(data?.order || {}), status: order.selectedStatus }) : o
        )
      );
      // Bekleyen → ödendi gibi geçişlerde liste ve sayılar değişir.
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error("Status update failed", err);
      setToast({
        type: "error",
        msg:
          err?.response?.data?.message ||
          "Sipariş durumu güncellenemedi.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const openOrderDetails = async (id) => {
    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;
    const existingOrder = orders.find((entry) => entry._id === id) || null;

    setDetailOrderId(id);
    setDetailOrder(existingOrder);
    setDetailError("");
    setDetailLoading(true);

    try {
      const { data } = await api.get(`/orders/${id}`, { timeout: 8000 });
      if (!mountedRef.current || detailRequestRef.current !== requestId) return;
      setDetailOrder(data);
    } catch (err) {
      if (!mountedRef.current || detailRequestRef.current !== requestId) return;
      console.error("Order detail fetch failed", err);
      setDetailError(
        existingOrder
          ? "Ek sipariş detayları yüklenemedi. Listedeki mevcut veriler gösteriliyor."
          : "Sipariş detayı alınamadı."
      );
    } finally {
      if (mountedRef.current && detailRequestRef.current === requestId) {
        setDetailLoading(false);
      }
    }
  };

  const closeOrderDetails = () => {
    detailRequestRef.current += 1;
    setDetailOrderId(null);
    setDetailOrder(null);
    setDetailError("");
    setDetailLoading(false);
  };

  const fmtPrice = (n) =>
    `₺${Number(n || 0).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const pendingCount = counts.pending;
  const activeCount = counts.active;

  const getProductMeta = (item) => {
    const populatedProduct =
      item?.productId && typeof item.productId === "object" ? item.productId : null;

    return {
      productId: populatedProduct?._id || item?.productId || null,
      image: populatedProduct?.images?.[0] || "",
    };
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-8 text-lg text-dark1">
        Yükleniyor…
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-6 space-y-6">
      {imageViewer && (
        <div
          className="fixed inset-0 z-[1200] bg-black/85 p-4 sm:p-6"
          onClick={() => setImageViewer(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Sipariş ürün görseli"
        >
          <div className="relative flex h-full w-full items-center justify-center">
            <button
              type="button"
              className="absolute right-0 top-0 inline-flex items-center justify-center rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
              onClick={() => setImageViewer(null)}
              aria-label="Görseli kapat"
            >
              <FaTimes />
            </button>

            <img
              src={imageViewer.src}
              alt={imageViewer.alt}
              className="max-h-[88vh] max-w-full rounded-2xl bg-white object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <OrderDetailsModal
        open={Boolean(detailOrderId)}
        order={detailOrder}
        loading={detailLoading}
        error={detailError}
        onClose={closeOrderDetails}
        onPreviewImage={setImageViewer}
      />

      {/* --- Üst Araçlar --- */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border border-light2 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2 text-dark2 min-w-0">
            <FaBoxOpen />
            <h1 className="text-xl font-semibold text-dark1 truncate">
              {listMode === "pending"
                ? "Bekleyen Siparişler"
                : listMode === "unpaid"
                  ? "Tamamlanmayan Ödemeler"
                  : "Siparişler"}
            </h1>
            <span className="text-xs bg-light1 text-dark2 px-2 py-0.5 rounded shrink-0">
              {total}
            </span>
            {refreshing && <span className="text-xs text-dark2">Yükleniyor…</span>}
          </div>

          <div className="flex w-full md:w-auto flex-col sm:flex-row gap-3">
            <div className="flex rounded-lg border border-light2 bg-white p-1">
              <button
                type="button"
                onClick={() => {
                  setListMode("active");
                  setStatusFilter("");
                }}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  listMode === "active"
                    ? "bg-dark1 text-white"
                    : "text-dark2 hover:bg-light1"
                }`}
              >
                Siparişler ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setListMode("pending");
                  setStatusFilter("");
                }}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  listMode === "pending"
                    ? "bg-amber-500 text-white"
                    : "text-dark2 hover:bg-light1"
                }`}
              >
                Bekleyenler ({pendingCount})
              </button>
              <button
                type="button"
                title="Ödemesi alınmadan kapanan denemeler: terk edilen, başarısız ya da süresi dolan ödemeler"
                onClick={() => {
                  setListMode("unpaid");
                  setStatusFilter("");
                }}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  listMode === "unpaid"
                    ? "bg-gray-500 text-white"
                    : "text-dark2 hover:bg-light1"
                }`}
              >
                Tamamlanmayan ödemeler ({counts.unpaid})
              </button>
            </div>

            <input
              type="text"
              placeholder="Sipariş no, müşteri, e-posta, telefon…"
              className="border border-light2 rounded-lg px-3 py-2 bg-white text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-dark1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Siparişlerde ara"
            />

            <select
              className="border border-light2 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-dark1"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Duruma göre filtrele"
            >
              <option value="">Tüm Durumlar</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>

            <select
              className="border border-light2 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-dark1"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              aria-label="Tarihe göre sırala"
            >
              <option value="desc">Yeni → Eski</option>
              <option value="asc">Eski → Yeni</option>
            </select>
          </div>
        </div>
      </div>

      {/* --- Siparişler --- */}
      {loadError ? (
        <div role="alert" className="text-center bg-red-50 border border-red-200 text-red-800 rounded-xl p-8 space-y-3">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="rounded-lg bg-dark1 px-4 py-2 text-sm font-medium text-white hover:bg-dark2"
          >
            Tekrar dene
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center text-dark2 bg-white border border-light2 rounded-xl p-10">
          Kriterlere uygun sipariş bulunamadı.
        </div>
      ) : (
        <div className="space-y-5">
          {filteredOrders.map((order) => {
            const count =
              order.items?.reduce((t, it) => t + (it.qty || 0), 0) || 0;
            const fallbackSubTotal =
              order.items?.reduce(
                (t, it) => t + Number(it.qty || 0) * Number(it.price || 0),
                0
              ) || 0;
            const pricingSubTotal = Number(
              order.pricing?.subTotal ?? fallbackSubTotal
            );
            const pricingCampaignDiscount = Number(
              order.pricing?.campaignDiscount ?? order.campaign?.savings ?? 0
            );
            const pricingCouponDiscount = Number(
              order.pricing?.couponDiscount ?? order.coupon?.savings ?? 0
            );
            const pricingShippingFee = Number(
              order.pricing?.shippingFee ?? order.shipping?.fee ?? 0
            );
            const statusChanged = order.selectedStatus !== order.status;
            const hasShipment = !statusChanged && ["shipped", "completed"].includes(order.status);
            const showTracking =
              (statusChanged && order.selectedStatus === "shipped") ||
              (hasShipment && order.editingTracking);
            const trackingDirty = hasShipment && order.editingTracking && trackingChanged(order);
            const changed = statusChanged || trackingDirty;
            const statusClass =
              STATUS_STYLES[order.status] || "bg-light1 text-dark1";
            const selectedClass =
              STATUS_STYLES[order.selectedStatus] || "bg-light1 text-dark1";

            return (
              <div
                key={order._id}
                className="bg-white border border-light2 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Üst şerit */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-5 py-4 border-b border-light2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                    <div className="text-sm font-semibold text-dark1 truncate">
                      #{order.orderNumber}
                    </div>
                    <div className="text-xs text-dark2">
                      {new Date(order.createdAt).toLocaleString("tr-TR")}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${statusClass}`}
                      title={STATUS_LABELS[order.status]}
                    >
                      {STATUS_ICON[order.status]}
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="text-sm text-dark2">
                      Adet: <b className="text-dark1">{count}</b>
                    </span>
                    <span className="text-sm text-dark2">
                      Toplam:{" "}
                      <b className="text-dark1">{fmtPrice(order.totalPrice)}</b>
                    </span>
                  </div>
                </div>

                {/* Ürün listesi (scrollable on mobile) */}
                <div className="px-5 py-4">
                  {order.status === "payment_review" && (
                    <div className="mb-4 rounded-xl border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-950">
                      <strong>Ödeme alındı, manuel kontrol gerekiyor.</strong>{" "}
                      PayTR tutarını ve ürün stoklarını doğrulayın. İade işlemi
                      tamamlanmadan siparişi iptal durumuna almayın.
                    </div>
                  )}
                  <div className="rounded-xl border border-light2 overflow-x-auto">
                    <table className="w-full min-w-[560px] text-sm sm:min-w-[680px]">
                      <thead className="bg-light1 text-dark2">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium">
                            Ürün
                          </th>
                          <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">
                            Varyant
                          </th>
                          <th className="text-right px-4 py-2 font-medium">
                            Adet
                          </th>
                          <th className="text-right px-4 py-2 font-medium">
                            Birim
                          </th>
                          <th className="text-right px-4 py-2 font-medium">
                            Tutar
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item, idx) => {
                          const { productId, image } = getProductMeta(item);
                          const hasVariant = item.size || item.color;

                          return (
                            <tr
                              key={idx}
                              className={
                                idx % 2 === 0 ? "bg-white" : "bg-light1/50"
                              }
                            >
                              <td className="px-4 py-3 text-dark1">
                                <div className="flex min-w-0 items-center gap-3">
                                  {image ? (
                                    <button
                                      type="button"
                                      className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-light2 bg-white focus:outline-none focus:ring-2 focus:ring-dark1"
                                      onClick={() =>
                                        setImageViewer({
                                          src: image,
                                          alt: item.name,
                                        })
                                      }
                                      aria-label={`${item.name} görselini büyüt`}
                                    >
                                      <img
                                        src={image}
                                        alt={item.name}
                                        className="h-full w-full object-cover"
                                      />
                                    </button>
                                  ) : (
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-light2 bg-light1 text-xs text-dark2">
                                      Görsel
                                    </div>
                                  )}

                                  <div className="min-w-0">
                                    {productId ? (
                                      <a
                                        href={`/product-details/${productId}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block break-words font-medium text-dark1 transition hover:text-dark2 hover:underline"
                                      >
                                        {item.name}
                                      </a>
                                    ) : (
                                      <div className="break-words font-medium text-dark1">
                                        {item.name}
                                      </div>
                                    )}

                                    <div className="mt-1 text-xs text-dark2 sm:hidden">
                                      {hasVariant
                                        ? [
                                            item.size ? `Beden: ${item.size}` : null,
                                            item.color ? `Renk: ${item.color}` : null,
                                          ]
                                            .filter(Boolean)
                                            .join(" • ")
                                        : "Varyant yok"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="hidden px-4 py-2 text-dark2 sm:table-cell">
                                {hasVariant
                                  ? [
                                      item.size ? `Beden: ${item.size}` : null,
                                      item.color ? `Renk: ${item.color}` : null,
                                    ]
                                      .filter(Boolean)
                                      .join(" • ")
                                  : "-"}
                              </td>
                              <td className="px-4 py-2 text-right text-dark1">
                                {item.qty}
                              </td>
                              <td className="px-4 py-2 text-right text-dark1 whitespace-nowrap">
                                {fmtPrice(item.price)}
                              </td>
                              <td className="px-4 py-2 text-right text-dark1 whitespace-nowrap">
                                {fmtPrice(item.qty * item.price)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                    <div className="rounded-lg bg-light1/70 px-3 py-2">
                      Ara Toplam:{" "}
                      <b className="text-dark1">{fmtPrice(pricingSubTotal)}</b>
                    </div>
                    <div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">
                      Kampanya: <b>-{fmtPrice(pricingCampaignDiscount)}</b>
                    </div>
                    {pricingCouponDiscount > 0 && (
                      <div className="rounded-lg bg-blue-50 px-3 py-2 text-blue-800">
                        Kupon: <b>-{fmtPrice(pricingCouponDiscount)}</b>
                      </div>
                    )}
                    <div className="rounded-lg bg-light1/70 px-3 py-2">
                      Kargo:{" "}
                      <b className="text-dark1">{fmtPrice(pricingShippingFee)}</b>
                    </div>
                    <div className="px-3 py-2 rounded-lg bg-blue-50 text-blue-800">
                      Genel Toplam: <b>{fmtPrice(order.totalPrice)}</b>
                    </div>
                  </div>

                  {order.campaign?.name && (
                    <div className="mt-3 text-sm text-emerald-700">
                      Uygulanan kampanya: <b>{order.campaign.name}</b>
                    </div>
                  )}

                  {order.coupon?.code && (
                    <div className="mt-2 text-sm text-blue-700">
                      Uygulanan kupon: <b>{order.coupon.code}</b>
                    </div>
                  )}

                  {hasShipment && !order.editingTracking && (
                    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-dark2">
                      <FaTruck className="text-indigo-700" />
                      {order.shipping?.carrier ? (
                        <span>
                          <b className="text-dark1">{order.shipping.carrier}</b>
                          {order.shipping.trackingNumber ? ` · ${order.shipping.trackingNumber}` : " · takip no yok"}
                        </span>
                      ) : (
                        <span>Kargo bilgisi girilmemiş.</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDraftChange(order._id, "editingTracking", true)}
                        className="font-medium text-dark1 underline underline-offset-2 hover:text-dark2"
                      >
                        {order.shipping?.carrier ? "Düzenle" : "Kargo bilgisi ekle"}
                      </button>
                    </div>
                  )}

                  {showTracking && (
                    <div className="mt-4 grid gap-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor={`carrier-${order._id}`} className="mb-1 block text-xs font-medium text-dark2">
                          Kargo firması
                        </label>
                        <input
                          id={`carrier-${order._id}`}
                          list="kargo-firmalari"
                          value={order.carrierDraft}
                          onChange={(e) => handleDraftChange(order._id, "carrierDraft", e.target.value)}
                          maxLength={60}
                          placeholder="Örn. Yurtiçi Kargo"
                          className="w-full rounded-lg border border-light2 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dark1"
                        />
                      </div>
                      <div>
                        <label htmlFor={`tracking-${order._id}`} className="mb-1 block text-xs font-medium text-dark2">
                          Takip numarası
                        </label>
                        <input
                          id={`tracking-${order._id}`}
                          value={order.trackingDraft}
                          onChange={(e) => handleDraftChange(order._id, "trackingDraft", e.target.value)}
                          maxLength={60}
                          placeholder="Kargo fişindeki numara"
                          className="w-full rounded-lg border border-light2 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-dark1"
                        />
                      </div>
                      {statusChanged ? (
                        <p className="text-xs text-dark2 sm:col-span-2">
                          Kargo firması Kargo ayarlarından gelir; takip numarası isteğe bağlıdır. Kaydedince müşteriye kargo e-postası gider.
                        </p>
                      ) : (
                        <p className="flex items-center justify-between gap-3 text-xs text-dark2 sm:col-span-2">
                          <span>Düzeltme müşteriye e-posta göndermez.</span>
                          <button
                            type="button"
                            onClick={() =>
                              setOrders((prev) =>
                                prev.map((o) =>
                                  o._id === order._id ? withDrafts({ ...o, editingTracking: false }) : o
                                )
                              )
                            }
                            className="font-medium text-dark1 underline underline-offset-2"
                          >
                            Vazgeç
                          </button>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Alt satır: durum değiştir + kaydet */}
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-dark2">Durum:</span>
                      <Listbox
                        value={order.selectedStatus}
                        onChange={(val) => handleStatusChange(order._id, val)}
                      >
                        <div className="relative">
                          <Listbox.Button
                            className={`flex items-center gap-2 pr-9 pl-3 py-2 rounded-lg border border-light2 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-dark1 ${selectedClass}`}
                            aria-label="Sipariş durumu seç"
                          >
                            {STATUS_ICON[order.selectedStatus]}
                            {STATUS_LABELS[order.selectedStatus]}
                            <FaChevronDown className="absolute right-2 opacity-60" />
                          </Listbox.Button>
                          <Listbox.Options className="absolute mt-1 w-56 sm:w-64 bg-white border border-light2 rounded-lg shadow-lg z-10 text-sm overflow-hidden">
                            {Object.entries(STATUS_LABELS)
                              .filter(
                                ([key]) =>
                                  key !== "payment_review" ||
                                  order.status === "payment_review"
                              )
                              .map(([key, label]) => {
                                const cls =
                                  STATUS_STYLES[key] || "bg-light1 text-dark1";
                                return (
                                  <Listbox.Option
                                    key={key}
                                    value={key}
                                    className={({ active }) =>
                                      `px-3 py-2 cursor-pointer ${
                                        active ? "bg-light1" : "bg-white"
                                      }`
                                    }
                                  >
                                    {({ selected }) => (
                                      <div
                                        className={`flex items-center gap-2 ${
                                          selected ? "font-semibold" : ""
                                        }`}
                                      >
                                        <span
                                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${cls}`}
                                        >
                                          {STATUS_ICON[key]}
                                          {label}
                                        </span>
                                        {selected && (
                                          <FaCheck className="ml-auto text-dark2" />
                                        )}
                                      </div>
                                    )}
                                  </Listbox.Option>
                                );
                              })}
                          </Listbox.Options>
                        </div>
                      </Listbox>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      {CANCELLABLE.includes(order.status) && (
                        <button
                          type="button"
                          onClick={() => openCancel(order)}
                          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
                        >
                          İptal / İade
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openOrderDetails(order._id)}
                        disabled={detailLoading && detailOrderId === order._id}
                        className="rounded-lg border border-light2 px-4 py-2 text-sm font-medium text-dark1 transition hover:bg-light1 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {detailLoading && detailOrderId === order._id
                          ? "Yükleniyor..."
                          : "Sipariş Detayı"}
                      </button>

                      {changed ? (
                        <button
                          onClick={() =>
                            statusChanged ? requestStatusUpdate(order._id) : saveTracking(order._id)
                          }
                          disabled={updatingId === order._id}
                          className="px-4 py-2 rounded-lg bg-dark1 text-white hover:bg-dark2 transition disabled:opacity-60 w-full sm:w-auto"
                        >
                          {updatingId === order._id
                            ? "Kaydediliyor..."
                            : statusChanged
                              ? "Güncelle"
                              : "Kargo bilgisini kaydet"}
                        </button>
                      ) : (
                        <span className="text-xs text-dark2">
                          Güncel durumda
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loadError && pageCount > 1 && (
        <nav className="flex items-center justify-between gap-3" aria-label="Sayfalar">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || refreshing}
            className="rounded-lg border border-light2 px-4 py-2 text-sm font-medium text-dark1 hover:bg-light1 disabled:opacity-50"
          >
            ← Önceki
          </button>
          <span className="text-sm text-dark2">
            Sayfa {page} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page >= pageCount || refreshing}
            className="rounded-lg border border-light2 px-4 py-2 text-sm font-medium text-dark1 hover:bg-light1 disabled:opacity-50"
          >
            Sonraki →
          </button>
        </nav>
      )}

      <datalist id="kargo-firmalari">
        {CARRIERS.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {toast && (
        <ToastAlert
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(cancelTarget && cancelForm)}
        title={`Sipariş #${cancelTarget?.orderNumber || ""}: iptal / iade`}
        confirmLabel="Siparişi iptal et"
        tone="danger"
        loading={cancelling}
        onConfirm={submitCancel}
        onCancel={closeCancel}
        message={
          cancelForm && (
            <div className="space-y-4">
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                Bu işlem parayı iade etmez. İadeyi PayTR panelinden yapın; burada kaydını tutun.
              </p>
              <div>
                <label htmlFor="refund-amount" className="mb-1 block font-medium text-dark1">
                  İade tutarı (TL)
                </label>
                <input
                  id="refund-amount"
                  inputMode="decimal"
                  value={cancelForm.refundAmount}
                  onChange={(e) => setCancelForm((f) => ({ ...f, refundAmount: e.target.value }))}
                  className="w-full rounded-lg border border-light2 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-dark1"
                />
                <p className="mt-1 text-xs text-dark2">
                  Sipariş toplamı: {fmtPrice(cancelTarget?.totalPrice)}. Kısmi iade için daha düşük tutar girin.
                </p>
              </div>
              <div>
                <label htmlFor="refund-note" className="mb-1 block font-medium text-dark1">
                  Açıklama
                </label>
                <textarea
                  id="refund-note"
                  rows={2}
                  maxLength={500}
                  value={cancelForm.note}
                  onChange={(e) => setCancelForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Örn. Müşteri cayma hakkını kullandı"
                  className="w-full rounded-lg border border-light2 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-dark1"
                />
                <p className="mt-1 text-xs text-dark2">Yalnız yönetim panelinde görünür.</p>
              </div>
              <label className={`flex items-start gap-2 ${cancelTarget?.stockUpdated ? "" : "opacity-60"}`}>
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={cancelForm.restock}
                  disabled={!cancelTarget?.stockUpdated}
                  onChange={(e) => setCancelForm((f) => ({ ...f, restock: e.target.checked }))}
                />
                <span>
                  Ürünleri stoğa geri ekle
                  {!cancelTarget?.stockUpdated && " (bu siparişte stok düşülmemiş)"}
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={cancelForm.notifyCustomer}
                  onChange={(e) => setCancelForm((f) => ({ ...f, notifyCustomer: e.target.checked }))}
                />
                <span>Müşteriye iptal e-postası gönder (iade tutarı yazılır)</span>
              </label>
            </div>
          )
        }
      />

      <ConfirmDialog
        open={Boolean(paidConfirmId)}
        title="Ödeme alındı olarak işaretle"
        message={`Sipariş #${orders.find((o) => o._id === paidConfirmId)?.orderNumber || ""} ödenmiş sayılacak ve stoktan düşülecek. Bu işlem geri alınamaz. Ödemeyi PayTR panelinde görmediyseniz işaretlemeyin.`}
        confirmLabel="Ödeme alındı"
        tone="warning"
        loading={updatingId === paidConfirmId}
        onConfirm={async () => {
          const id = paidConfirmId;
          await updateStatus(id);
          setPaidConfirmId(null);
        }}
        onCancel={() => setPaidConfirmId(null)}
      />
    </div>
  );
}
