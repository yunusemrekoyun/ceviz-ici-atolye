import React from "react";
import { createPortal } from "react-dom";
import Window from "../../components/ui/Window";

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

const REASON_LABELS = {
  amount_mismatch_after_payment:
    "Ödeme tutarı sipariş toplamından düşük; manuel kontrol gerekiyor.",
  stock_unavailable_after_payment:
    "Ödeme alındıktan sonra yeterli stok bulunamadı; manuel kontrol gerekiyor.",
  payment_failed: "Ödeme sağlayıcısı işlemin başarısız olduğunu bildirdi.",
  stock_unavailable: "Sipariş tamamlanırken yeterli stok bulunamadı.",
  coupon_limit_after_payment:
    "Ödeme alındı ama kupon bu müşteri tarafından daha önce kullanılmış ya da kullanım sınırı dolmuş; kontrol edip tamamlayın ya da farkı iade edin.",
  payment_abandoned: "Ödeme 24 saat içinde tamamlanmadığı için kapatıldı.",
  paid_after_cancel:
    "İptal edilmiş siparişe ödeme geldi; PayTR panelinden kontrol edip tamamlayın ya da iade edin.",
  admin_cancelled: "Yönetici iptal etti (iade kaydı girildi).",
  admin_cancelled_unpaid: "Yönetici ödenmemiş siparişi iptal etti; ayrılan stok geri eklendi.",
  reservation_expired: "Ödeme süresi içinde tamamlanmadı; ayrılan stok geri eklendi.",
  session_replaced: "Müşteri yeni bir ödeme başlattığı için bu oturum kapatıldı; stok geri eklendi.",
  coupon_session_replaced:
    "Müşteri aynı kuponla yeni bir ödeme başlattığı için bu oturum kapatıldı.",
};

function fmtPrice(value) {
  return `₺${Number(value || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("tr-TR");
}

function fmtBool(value, yes = "Evet", no = "Hayır") {
  return value ? yes : no;
}

function valueOrDash(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function ObjectDetails({ title, data }) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;

  const entries = Object.entries(data).filter(([, value]) => {
    if (value === null || value === undefined || value === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  });

  if (entries.length === 0) return null;

  return (
    <div className="rounded-xl border border-light2 bg-white p-4">
      <h4 className="text-sm font-semibold text-dark1">{title}</h4>
      <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key}>
            <dt className="text-xs uppercase tracking-wide text-dark2">
              {key}
            </dt>
            <dd className="mt-1 break-words text-sm text-dark1">
              {typeof value === "object"
                ? JSON.stringify(value)
                : valueOrDash(value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SectionCard({ title, children, className = "" }) {
  return (
    <section className={`rounded-xl border border-light2 bg-light1/40 p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-dark1">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function MetaList({ items }) {
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map(({ label, value }) => (
        <div key={label}>
          <dt className="text-xs uppercase tracking-wide text-dark2">{label}</dt>
          <dd className="mt-1 break-words text-sm text-dark1">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function OrderDetailsModal({
  open,
  order,
  loading = false,
  error = "",
  onClose,
  onPreviewImage,
}) {
  if (!open || typeof document === "undefined") return null;

  const footer = (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg bg-dark1 px-4 py-2 text-sm font-medium text-white transition hover:bg-dark2"
      >
        Kapat
      </button>
    </div>
  );

  let content = null;

  if (loading && !order) {
    content = (
      <div className="flex min-h-[240px] items-center justify-center text-sm text-dark2">
        Sipariş detayı yükleniyor…
      </div>
    );
  } else if (error && !order) {
    content = (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  } else if (!order) {
    content = (
      <div className="rounded-xl border border-light2 bg-light1/50 p-4 text-sm text-dark2">
        Sipariş detayı bulunamadı.
      </div>
    );
  } else {
    const customer = order.user || order.guest || null;
    const isGuest = Boolean(order.guest);
    const fallbackSubTotal =
      order.items?.reduce(
        (sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0),
        0
      ) || 0;
    const subTotal = Number(order.pricing?.subTotal ?? fallbackSubTotal);
    const campaignDiscount = Number(
      order.pricing?.campaignDiscount ?? order.campaign?.savings ?? 0
    );
    const couponDiscount = Number(
      order.pricing?.couponDiscount ?? order.coupon?.savings ?? 0
    );
    const discountedSubTotal = Number(
      order.pricing?.discountedSubTotal ??
        Math.max(0, subTotal - campaignDiscount - couponDiscount)
    );
    const shippingFee = Number(
      order.pricing?.shippingFee ?? order.shipping?.fee ?? 0
    );
    const grandTotal = Number(order.pricing?.grandTotal ?? order.totalPrice ?? 0);
    const itemCount =
      order.items?.reduce((total, item) => total + Number(item.qty || 0), 0) || 0;
    const statusClass =
      STATUS_STYLES[order.status] || "bg-light1 text-dark1";

    const customerItems = [
      {
        label: "Müşteri Türü",
        value: isGuest ? "Misafir" : "Kayıtlı Kullanıcı",
      },
      {
        label: "Ad Soyad",
        value: valueOrDash(
          customer
            ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim()
            : ""
        ),
      },
      {
        label: "E-posta",
        value: valueOrDash(customer?.email),
      },
      {
        label: "Telefon",
        value: valueOrDash(customer?.phone),
      },
      {
        label: "Kullanıcı ID",
        value: valueOrDash(order.user?._id),
      },
      {
        label: "Kimlik No",
        value: valueOrDash(order.guest?.identityNumber),
      },
      {
        label: "Kimlik Fallback",
        value: fmtBool(order.identityFallbackUsed),
      },
      {
        label: "Kayıt Adresi",
        value: valueOrDash(order.guest?.registrationAddress),
      },
    ].filter(({ value }) => value !== "-");

    const addressItems = [
      { label: "Adres Başlığı", value: valueOrDash(order.address?.title) },
      { label: "Adres", value: valueOrDash(order.address?.mainaddress) },
      { label: "Sokak / Cadde", value: valueOrDash(order.address?.street) },
      { label: "İlçe", value: valueOrDash(order.address?.district) },
      { label: "Şehir", value: valueOrDash(order.address?.city) },
      { label: "Posta Kodu", value: valueOrDash(order.address?.postalCode) },
    ].filter(({ value }) => value !== "-");

    const operationItems = [
      { label: "Sipariş No", value: valueOrDash(order.orderNumber) },
      { label: "Conversation ID", value: valueOrDash(order.conversationId) },
      { label: "Payment ID", value: valueOrDash(order.paymentId) },
      { label: "Oluşturulma", value: fmtDate(order.createdAt) },
      { label: "Güncellenme", value: fmtDate(order.updatedAt) },
      {
        label: "Ödemenin Alındığı Tarih",
        value: fmtDate(order.paymentReceivedAt),
      },
      { label: "İptal Tarihi", value: fmtDate(order.cancelledAt) },
      { label: "Admin Görme Tarihi", value: fmtDate(order.adminSeenAt) },
      {
        label: order.status === "pending" ? "Stok Ayrıldı" : "Stok Güncellendi",
        value: fmtBool(order.stockUpdated),
      },
      { label: "Stok Ayrımı Bitişi", value: order.status === "pending" ? fmtDate(order.stockReservedUntil) : "-" },
      { label: "Kargo Yöntemi", value: valueOrDash(order.shipping?.name) },
      { label: "Kargo Firması", value: valueOrDash(order.shipping?.carrier) },
      { label: "Takip Numarası", value: valueOrDash(order.shipping?.trackingNumber) },
      { label: "Kargoya Verilme", value: fmtDate(order.shippedAt) },
      { label: "Tamamlanma", value: fmtDate(order.deliveredAt) },
      { label: "Kargo Maili", value: fmtDate(order.shippedMailSentAt) },
      {
        label: "İade Tutarı",
        value: order.refund?.at ? fmtPrice(order.refund.amount) : "-",
      },
      { label: "İade Kaydı", value: fmtDate(order.refund?.at) },
      { label: "İade Açıklaması", value: valueOrDash(order.refund?.note) },
      {
        label: "Stoğa Geri Eklendi",
        value: order.refund?.at ? fmtBool(order.refund.restocked) : "-",
      },
      { label: "İptal Maili", value: fmtDate(order.cancelledMailSentAt) },
      { label: "Sözleşme Onayı", value: fmtDate(order.consent?.distanceSalesAcceptedAt) },
      { label: "Onaylanan Metin Sürümü", value: valueOrDash(order.consent?.version) },
      { label: "Onay IP", value: valueOrDash(order.consent?.ip) },
      { label: "Müşteri Mail", value: fmtDate(order.customerMailSentAt) },
      { label: "Admin Mail", value: fmtDate(order.adminMailSentAt) },
      { label: "Order Mail", value: fmtDate(order.orderMailSentAt) },
      {
        label: "İnceleme / İptal Sebebi",
        value: valueOrDash(
          REASON_LABELS[order.cancelReason] || order.cancelReason
        ),
      },
    ].filter(({ value }) => value !== "-");

    content = (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-light2 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-dark2">
              Sipariş Numarası
            </div>
            <div className="mt-1 text-lg font-semibold text-dark1">
              #{order.orderNumber}
            </div>
          </div>
          <div className="rounded-xl border border-light2 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-dark2">Durum</div>
            <div className="mt-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusClass}`}
              >
                {STATUS_LABELS[order.status] || order.status}
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-light2 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-dark2">
              Ürün Adedi
            </div>
            <div className="mt-1 text-lg font-semibold text-dark1">
              {itemCount}
            </div>
          </div>
          <div className="rounded-xl border border-light2 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-dark2">
              Genel Toplam
            </div>
            <div className="mt-1 text-lg font-semibold text-dark1">
              {fmtPrice(grandTotal)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SectionCard title="Alıcı Bilgileri">
            <MetaList items={customerItems} />
          </SectionCard>

          <SectionCard title="Teslimat Adresi">
            <MetaList items={addressItems} />
          </SectionCard>

          <SectionCard title="Fiyat Özeti">
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-dark2">Ara Toplam</dt>
                <dd className="font-medium text-dark1">{fmtPrice(subTotal)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-emerald-700">Kampanya İndirimi</dt>
                <dd className="font-medium text-emerald-700">
                  -{fmtPrice(campaignDiscount)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-blue-700">Kupon İndirimi</dt>
                <dd className="font-medium text-blue-700">
                  -{fmtPrice(couponDiscount)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-dark2">İndirimli Ara Toplam</dt>
                <dd className="font-medium text-dark1">
                  {fmtPrice(discountedSubTotal)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-dark2">Kargo</dt>
                <dd className="font-medium text-dark1">
                  {fmtPrice(shippingFee)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-light2 pt-2">
                <dt className="font-semibold text-dark1">Genel Toplam</dt>
                <dd className="font-semibold text-dark1">
                  {fmtPrice(grandTotal)}
                </dd>
              </div>
            </dl>

            {(order.campaign?.name || order.coupon?.code) && (
              <div className="mt-4 space-y-2 text-sm">
                {order.campaign?.name && (
                  <div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">
                    Kampanya: <b>{order.campaign.name}</b>
                  </div>
                )}
                {order.coupon?.code && (
                  <div className="rounded-lg bg-blue-50 px-3 py-2 text-blue-800">
                    Kupon: <b>{order.coupon.code}</b>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Operasyon ve Ödeme Bilgileri">
            <MetaList items={operationItems} />
          </SectionCard>
        </div>

        <ObjectDetails title="Kampanya Detayları" data={order.campaign?.details} />
        <ObjectDetails title="Kupon Detayları" data={order.coupon?.details} />

        <section className="rounded-xl border border-light2 bg-white p-4">
          <h3 className="text-sm font-semibold text-dark1">Sipariş Kalemleri</h3>

          <div className="mt-4 space-y-3 md:hidden">
            {order.items.map((item, idx) => {
              const populatedProduct =
                item?.productId && typeof item.productId === "object"
                  ? item.productId
                  : null;
              const productId = populatedProduct?._id || item?.productId || null;
              const image = populatedProduct?.images?.[0] || "";
              const originalPrice = Number(item.originalPrice || 0);
              const lineTotal = Number(item.qty || 0) * Number(item.price || 0);

              return (
                <article
                  key={`${item._id || idx}-${idx}`}
                  className="rounded-xl border border-light2 p-3"
                >
                  <div className="flex items-start gap-3">
                    {image ? (
                      <button
                        type="button"
                        className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-light2"
                        onClick={() =>
                          onPreviewImage?.({
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
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-light2 bg-light1 text-xs text-dark2">
                        Görsel
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      {productId ? (
                        <a
                          href={`/product-details/${productId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-dark1 hover:underline"
                        >
                          {item.name}
                        </a>
                      ) : (
                        <div className="font-medium text-dark1">{item.name}</div>
                      )}

                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-dark2">
                        {item.size && (
                          <span className="rounded-md bg-light1 px-2 py-1">
                            Beden: {item.size}
                          </span>
                        )}
                        {item.color && (
                          <span className="rounded-md bg-light1 px-2 py-1">
                            Renk: {item.color}
                          </span>
                        )}
                        <span className="rounded-md bg-light1 px-2 py-1">
                          Adet: {item.qty}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-dark2">
                            Birim Fiyat
                          </div>
                          <div className="font-medium text-dark1">
                            {fmtPrice(item.price)}
                          </div>
                          {originalPrice > Number(item.price || 0) && (
                            <div className="text-xs text-dark2 line-through">
                              {fmtPrice(originalPrice)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-wide text-dark2">
                            Satır Toplamı
                          </div>
                          <div className="font-medium text-dark1">
                            {fmtPrice(lineTotal)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="border-b border-light2 text-left text-dark2">
                <tr>
                  <th className="px-3 py-2 font-medium">Ürün</th>
                  <th className="px-3 py-2 font-medium">Varyant</th>
                  <th className="px-3 py-2 text-right font-medium">Adet</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Orijinal
                  </th>
                  <th className="px-3 py-2 text-right font-medium">Birim</th>
                  <th className="px-3 py-2 text-right font-medium">Toplam</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => {
                  const populatedProduct =
                    item?.productId && typeof item.productId === "object"
                      ? item.productId
                      : null;
                  const productId = populatedProduct?._id || item?.productId || null;
                  const image = populatedProduct?.images?.[0] || "";
                  const lineTotal =
                    Number(item.qty || 0) * Number(item.price || 0);

                  return (
                    <tr
                      key={`${item._id || idx}-${idx}`}
                      className={idx % 2 === 0 ? "bg-white" : "bg-light1/40"}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          {image ? (
                            <button
                              type="button"
                              className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-light2"
                              onClick={() =>
                                onPreviewImage?.({
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
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-light2 bg-light1 text-xs text-dark2">
                              Görsel
                            </div>
                          )}

                          <div className="min-w-0">
                            {productId ? (
                              <a
                                href={`/product-details/${productId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-dark1 hover:underline"
                              >
                                {item.name}
                              </a>
                            ) : (
                              <div className="font-medium text-dark1">
                                {item.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-dark2">
                        {[item.size ? `Beden: ${item.size}` : null, item.color ? `Renk: ${item.color}` : null]
                          .filter(Boolean)
                          .join(" • ") || "-"}
                      </td>
                      <td className="px-3 py-3 text-right text-dark1">
                        {item.qty}
                      </td>
                      <td className="px-3 py-3 text-right text-dark2">
                        {item.originalPrice
                          ? fmtPrice(item.originalPrice)
                          : "-"}
                      </td>
                      <td className="px-3 py-3 text-right text-dark1">
                        {fmtPrice(item.price)}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-dark1">
                        {fmtPrice(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  return createPortal(
    <Window
      title={order?.orderNumber ? `Sipariş Detayı #${order.orderNumber}` : "Sipariş Detayı"}
      onClose={onClose}
      footer={footer}
      showFullscreenToggle={false}
      zIndexClass="z-[1050]"
      maxWidthClass="sm:max-w-3xl lg:max-w-6xl"
    >
      {content}
    </Window>,
    document.body
  );
}
