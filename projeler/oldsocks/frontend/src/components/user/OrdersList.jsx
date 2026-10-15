// src/components/user/OrdersList.jsx
import React, { useEffect, useState } from "react";
import api from "../../../api";
import { formatTry } from "../../utils/currency";
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MapPinIcon,
  CubeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";

// Durum etiketleri
const STATUS_LABELS = {
  pending: "Sipariş oluşturuldu",
  payment_review: "Ödeme incelemede",
  paid: "Ödeme alındı",
  shipped: "Kargoya verildi",
  completed: "Sipariş tamamlandı",
  cancelled: "İptal edildi",
};

// Durum rozet stilleri
const STATUS_STYLES = {
  pending:
    "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200 dark:ring-amber-300/50",
  payment_review:
    "bg-orange-50 text-orange-900 ring-1 ring-inset ring-orange-200 dark:ring-orange-300/50",
  paid: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-300/50",
  shipped:
    "bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200 dark:ring-blue-300/50",
  completed:
    "bg-gray-900 text-white ring-1 ring-inset ring-gray-900/10 dark:bg-dark1",
  cancelled:
    "bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200 dark:ring-rose-300/50",
};

const STATUS_ICON = {
  pending: ClockIcon,
  payment_review: ClockIcon,
  paid: CheckCircleIcon,
  shipped: TruckIcon,
  completed: CheckCircleIcon,
  cancelled: XCircleIcon,
};

export default function OrdersList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState({}); // {orderId: true/false}

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    api
      .get("/orders")
      .then((res) => {
        if (alive) setOrders(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (alive) setError("Siparişleriniz alınamadı. Lütfen tekrar deneyin.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [reloadKey]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-10 w-full rounded-lg bg-gray-100 animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-200 p-4 bg-white"
          >
            <div className="h-6 w-2/3 bg-gray-100 rounded animate-pulse mb-3" />
            <div className="h-4 w-1/3 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="mb-4 text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => setReloadKey((value) => value + 1)}
          className="rounded-lg bg-dark1 px-4 py-2 text-sm font-medium text-white"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  const filtered = orders.filter(
    (o) =>
      (o.orderNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.paymentId || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Başlık + Arama */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-dark1">Siparişlerim</h2>

        <div className="relative w-full sm:w-80">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            aria-label="Siparişlerde ara"
            placeholder="Sipariş no / ödeme no ile ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-dark1/20 focus:border-dark1/30 transition"
          />
        </div>
      </div>

      {/* Boş durum */}
      {filtered.length === 0 && (
        <div className="text-center py-14 rounded-2xl border border-dashed border-gray-300 bg-white">
          <CubeIcon className="mx-auto h-10 w-10 text-gray-400 mb-3" />
          <p className="text-gray-600">Hiç sipariş bulunamadı.</p>
          <p className="text-sm text-gray-500 mt-1">
            Yeni verdiğiniz siparişler birkaç saniye içinde burada görünecek.
          </p>
        </div>
      )}

      {/* Sipariş Kartları */}
      <div className="grid grid-cols-1 gap-5">
        {filtered.map((order) => {
          const badgeClass =
            STATUS_STYLES[order.status] || "bg-gray-100 text-gray-700";
          const Icon = STATUS_ICON[order.status] || ClockIcon;
          const isOpen = !!expanded[order._id];
          const fallbackSubTotal =
            order.items?.reduce(
              (sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0),
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

          return (
            <div
              key={order._id}
              className="group rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Üst Satır */}
              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  {/* Sol kısım: sipariş no + tarih */}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-gray-500">Sipariş No</span>
                      <span className="font-semibold tracking-wide text-dark1">
                        #{order.orderNumber}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleString("tr-TR")}
                    </div>
                  </div>

                  {/* Orta kısım: durum rozeti */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${badgeClass}`}
                    >
                      <Icon className="h-4 w-4" />
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>

                  {/* Sağ kısım: toplam + aç/kapa */}
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Toplam</div>
                      <div className="text-base font-semibold text-dark1">
                        {formatTry(order.totalPrice)}
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() =>
                        setExpanded((s) => ({ ...s, [order._id]: !isOpen }))
                      }
                      className="ml-1 inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-dark1 hover:bg-gray-50 transition"
                    >
                      {isOpen ? (
                        <>
                          Detayı Gizle <ChevronUpIcon className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Detayı Göster <ChevronDownIcon className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {order.status === "cancelled" && Number(order.refund?.amount) > 0 && (
                <div className="mx-5 mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-900 sm:mx-6">
                  İade tutarı: <b>{formatTry(order.refund.amount)}</b>. İade ödemede kullandığınız karta yapılır;
                  bankanıza bağlı olarak birkaç iş günü içinde yansır.
                </div>
              )}

              {order.shipping?.carrier && ["shipped", "completed"].includes(order.status) && (
                <div className="mx-5 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900 sm:mx-6">
                  <TruckIcon className="h-5 w-5 shrink-0" />
                  <span>
                    Kargo firması: <b>{order.shipping.carrier}</b>
                  </span>
                  {order.shipping.trackingNumber && (
                    <span>
                      Takip no: <b className="select-all tracking-wide">{order.shipping.trackingNumber}</b>
                    </span>
                  )}
                  {order.shippedAt && (
                    <span className="text-blue-800/80">
                      {new Date(order.shippedAt).toLocaleDateString("tr-TR")} tarihinde kargoya verildi
                    </span>
                  )}
                </div>
              )}

              {/* Ayracı */}
              <div className="border-t border-gray-100" />

              {/* Detaylar */}
              {isOpen && (
                <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Ürünler */}
                  <section className="lg:col-span-2">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Ürünler
                    </h4>
                    <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
                      {(order.items || []).map((it, i) => (
                        <li
                          key={i}
                          className="flex items-start justify-between gap-4 p-4 bg-white"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-dark1 truncate">
                              {it.name}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                              {it.size && (
                                <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1">
                                  Beden: {it.size}
                                </span>
                              )}
                              {it.color && (
                                <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1">
                                  Renk: {it.color}
                                </span>
                              )}
                              <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1">
                                Adet: {it.qty}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-dark1 whitespace-nowrap">
                            {formatTry(it.price)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>

                  {/* Adres */}
                  <section className="lg:col-span-1">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Teslimat Adresi
                    </h4>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-start gap-2">
                        <MapPinIcon className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div className="text-sm text-gray-700 leading-6">
                          <div className="font-medium text-dark1">
                            {order.address?.title || "Teslimat Adresi"}
                          </div>
                          <div>{order.address?.mainaddress || "Adres bilgisi bulunmuyor."}</div>
                          {(order.address?.street || order.address?.district) && (
                            <div>
                              {order.address?.street}
                              {order.address?.street && order.address?.district
                                ? ", "
                                : ""}
                              {order.address?.district}
                            </div>
                          )}
                          <div>
                            {order.address?.city}
                            {order.address?.postalCode
                              ? ` / ${order.address.postalCode}`
                              : ""}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl border border-gray-100 bg-white p-4">
                      <h5 className="text-sm font-semibold text-gray-700 mb-2">
                        Sipariş Özeti
                      </h5>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Ara Toplam</span>
                          <span className="font-medium">
                            {formatTry(pricingSubTotal)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-emerald-700">
                          <span>Kampanya İndirimi</span>
                          <span className="font-medium">
                            -{formatTry(pricingCampaignDiscount)}
                          </span>
                        </div>
                        {pricingCouponDiscount > 0 && (
                          <div className="flex items-center justify-between text-blue-700">
                            <span>
                              Kupon İndirimi
                              {order.coupon?.code ? ` (${order.coupon.code})` : ""}
                            </span>
                            <span className="font-medium">
                              -{formatTry(pricingCouponDiscount)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Kargo</span>
                          <span className="font-medium">
                            {formatTry(pricingShippingFee)}
                          </span>
                        </div>
                        <div className="pt-1 border-t border-gray-100 flex items-center justify-between">
                          <span className="font-semibold text-dark1">Genel Toplam</span>
                          <span className="font-semibold text-dark1">
                            {formatTry(order.totalPrice)}
                          </span>
                        </div>
                      </div>

                      {order.campaign?.name && (
                        <p className="mt-2 text-xs text-emerald-700">
                          Uygulanan kampanya: <b>{order.campaign.name}</b>
                        </p>
                      )}
                      {order.coupon?.code && (
                        <p className="mt-2 text-xs text-blue-700">
                          Uygulanan kupon: <b>{order.coupon.code}</b>
                        </p>
                      )}
                    </div>
                  </section>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
