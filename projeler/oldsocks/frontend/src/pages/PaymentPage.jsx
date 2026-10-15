// src/pages/PaymentPage.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/useCart";
import ToastAlert from "../components/ui/ToastAlert";
import api from "../../api";
import { formatTry } from "../utils/currency";
import usePageMeta from "../hooks/usePageMeta";

export default function PaymentPage() {
  usePageMeta({ title: "Ödeme", noindex: true });
  const containerRef = useRef(null);
  const startedForConvRef = useRef(null); // aynı conversation için sadece bir kez çalış
  const iframeAppendedRef = useRef(false); // ikinci kez iframe eklenmesin

  const location = useLocation();
  const navigate = useNavigate();

  const { items } = useCart();
  const totalPrice = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.qty, 0),
    [items]
  );

  // ← Checkout/GuestCheckout'tan opsiyonel özet
  const summary = location.state?.summary || null;

  const isGuest = location.state?.guest === true;
  const conversationId = location.state?.conversationId;
  // Ödeme ekranına geçerken ürünler bu siparişe ayrıldı; bitiş saati gösterilir.
  const reservedUntil = location.state?.reservedUntil ? new Date(location.state.reservedUntil) : null;
  const selectedAddressIdFromState = location.state?.selectedAddress || null;

  const [addresses, setAddresses] = useState([]);
  const [addrLoading, setAddrLoading] = useState(!isGuest); // guest’te adres çekmeyeceğiz
  const [toast, setToast] = useState(null);

  // conversationId yoksa geri gönder
  useEffect(() => {
    if (!conversationId) navigate("/cart", { replace: true });
  }, [conversationId, navigate]);

  // SADECE kayıtlı kullanıcı akışında adresleri çek
  useEffect(() => {
    if (isGuest) {
      setAddrLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/users/me/addresses");
        if (!alive) return;
        setAddresses(data || []);
      } catch (err) {
        console.warn(
          "[PaymentPage] addresses fetch failed:",
          err?.response?.status
        );
        setAddresses([]);
      } finally {
        if (alive) setAddrLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isGuest]);

  // İlgili adresi (kayıtlı kullanıcı akışı için) seç
  const selectedAddress = useMemo(() => {
    if (isGuest || !addresses.length) return null;
    return (
      addresses.find((a) => a._id === selectedAddressIdFromState) ||
      addresses[0]
    );
  }, [isGuest, addresses, selectedAddressIdFromState]);

  const redirectToCartWithError = (msg) => {
    setToast({ type: "error", msg });
    window.setTimeout(() => {
      navigate("/cart", { replace: true });
    }, 1200);
  };

  // PayTR inline formu başlat
  useEffect(() => {
    if (!conversationId) return;
    if (startedForConvRef.current === conversationId) return; // zaten başlatıldı
    startedForConvRef.current = conversationId;

    let alive = true;
    const host = containerRef.current;

    (async () => {
      try {
        const { data } = await api.get(`/payment/inline/${conversationId}`, {
          params: { t: Date.now() },
        });
        if (!alive) return;

        if (!host) return;

        if (!iframeAppendedRef.current) host.innerHTML = "";

        if (data?.mode === "mock" && typeof data.html === "string") {
          if (iframeAppendedRef.current) return;
          host.innerHTML = data.html;
          iframeAppendedRef.current = true;
          return;
        }

        if (data?.mode === "paytr" && data.token) {
          if (iframeAppendedRef.current) return;
          const iframe = document.createElement("iframe");
          iframe.id = "paytriframe";
          iframe.src = `https://www.paytr.com/odeme/guvenli/${
            data.token
          }?t=${Date.now()}`;
          iframe.frameBorder = "0";
          iframe.scrolling = "auto";
          iframe.style.width = "100%";
          iframe.style.minHeight = "1100px";
          iframe.style.display = "block";
          iframe.style.border = "0";
          host.appendChild(iframe);
          iframeAppendedRef.current = true;
          return;
        }

        console.error("Bilinmeyen inline response:", data);
        redirectToCartWithError("Ödeme başlatılamadı. Lütfen tekrar deneyin.");
      } catch (e) {
        console.error("Ödeme formu yüklenemedi:", e);
        // 410: ürünlerin ayrım süresi doldu; sunucunun mesajı gösterilir.
        redirectToCartWithError(
          e?.response?.status === 410 && e?.response?.data?.message
            ? e.response.data.message
            : "Ödeme başlatılamadı. Lütfen tekrar deneyin."
        );
      }
    })();

    return () => {
      alive = false;
      // /payment dışına çıkarken temizle
      if (location.pathname !== "/payment") {
        if (host) host.innerHTML = "";
        iframeAppendedRef.current = false;
        startedForConvRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  return (
    <div className="min-h-screen bg-light1 text-dark1 py-6 sm:py-8 px-3 sm:px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6">
            <header className="mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold">Ödeme</h2>
              <p className="text-sm text-gray-500 mt-1">
                Kart bilgilerinizi güvenle PayTR formu üzerinden girin.
              </p>
              {reservedUntil && !Number.isNaN(reservedUntil.getTime()) && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Sepetinizdeki ürünler{" "}
                  <b>{reservedUntil.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</b>{" "}
                  saatine kadar sizin için ayrıldı. Ödemeyi bu süre içinde tamamlayın.
                </p>
              )}
            </header>
            <div className="w-full">
              <div
                key={conversationId}
                className="w-full mx-auto rounded-xl border border-gray-200 p-3 sm:p-4 bg-white max-w-[720px]"
              >
                <div
                  ref={containerRef}
                  id="paytr-inline-container"
                  className="w-full min-h-[1000px] lg:min-h-[1100px]"
                />
              </div>
            </div>
          </div>
        </section>

        <aside className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 xl:sticky xl:top-6">
            <h3 className="text-lg font-semibold mb-4">Sipariş Özeti</h3>

            <ul className="space-y-3 max-h-72 overflow-auto pr-1">
              {items.map((it, i) => (
                <li
                  key={`${it.id || it._id || i}-${i}`}
                  className="flex justify-between items-start bg-light2/60 rounded-lg p-3"
                >
                  <div className="mr-3">
                    <p className="font-medium text-sm sm:text-base">
                      {it.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      Adet: {it.qty} × {formatTry(it.price)}
                    </p>
                    {it.size && (
                      <p className="text-xs text-gray-600">Beden: {it.size}</p>
                    )}
                    {it.color && (
                      <p className="text-xs text-gray-600">Renk: {it.color}</p>
                    )}
                  </div>
                  <div className="font-semibold text-sm sm:text-base whitespace-nowrap">
                    {formatTry(it.price * it.qty)}
                  </div>
                </li>
              ))}
            </ul>

            {/* Toplamlar */}
            {summary ? (
              <div className="space-y-2 text-base sm:text-lg font-semibold border-t pt-4 mt-4">
                <div className="flex justify-between">
                  <span>Ara Toplam</span>
                  <span>{formatTry(summary.subTotal || 0)}</span>
                </div>

                {Number(summary.campaignDiscount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Kampanya İndirimi</span>
                    <span>-{formatTry(summary.campaignDiscount || 0)}</span>
                  </div>
                )}

                {Number(summary.couponDiscount || 0) > 0 && (
                  <div className="flex justify-between text-blue-700">
                    <span>
                      Kupon İndirimi
                      {summary.appliedCoupon?.code
                        ? ` (${summary.appliedCoupon.code})`
                        : ""}
                    </span>
                    <span>-{formatTry(summary.couponDiscount || 0)}</span>
                  </div>
                )}

                {(Number(summary.campaignDiscount || 0) > 0 ||
                  Number(summary.couponDiscount || 0) > 0) && (
                  <div className="flex justify-between">
                    <span>İndirimli Ara Toplam</span>
                    <span>
                      {formatTry(
                        summary.discountedSubTotal ??
                          Number(summary.subTotal || 0) -
                            Number(summary.campaignDiscount || 0)
                      )}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span>
                    Kargo
                    {summary.shippingName ? ` — ${summary.shippingName}` : ""}
                  </span>
                  {summary.isFree ? (
                    <span className="flex items-center gap-2">
                      <span className="line-through text-gray-500">
                        {formatTry(summary.shippingFee || 0)}
                      </span>
                      <span className="text-emerald-600 font-bold">
                        Ücretsiz
                      </span>
                    </span>
                  ) : (
                    <span>{formatTry(summary.shippingFee || 0)}</span>
                  )}
                </div>

                <div className="flex justify-between text-xl">
                  <span>Genel Toplam</span>
                  <span className="text-primary">
                    {formatTry(summary.grandTotal || 0)}
                  </span>
                </div>

                {summary.appliedCampaign?.name && (
                  <p className="text-xs text-emerald-700">
                    Uygulanan kampanya: {summary.appliedCampaign.name}
                  </p>
                )}

                {summary.appliedCoupon?.code && (
                  <p className="text-xs text-blue-700">
                    Uygulanan kupon: {summary.appliedCoupon.code}
                  </p>
                )}

                {summary.isFree && summary.freeShippingThreshold != null && (
                  <p className="text-xs text-emerald-700">
                    {formatTry(summary.freeShippingThreshold, {
                      fractionDigits: 0,
                    })} ve üzeri
                    alışverişlerde kargo ücretsiz.
                  </p>
                )}
              </div>
            ) : (
              // summary yoksa: eski davranış (sadece ürün toplamı)
              <div className="flex justify-between items-center text-base sm:text-lg font-semibold border-t pt-4 mt-4">
                <span>Toplam</span>
                <span>{formatTry(totalPrice)}</span>
              </div>
            )}

            {/* Adres Bölümü: kayıtlı kullanıcı için göster, guest için bilgilendirme */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Gönderim Adresi
              </h4>

              {isGuest ? (
                <div className="text-sm bg-light2/60 p-3 rounded-lg leading-6">
                  Misafir sipariş: adres bilgileri ödeme başlatılırken iletildi.
                </div>
              ) : addrLoading ? (
                <div className="text-sm text-gray-500">
                  Adresler yükleniyor…
                </div>
              ) : selectedAddress ? (
                <div className="text-sm bg-light2/60 p-3 rounded-lg leading-6">
                  <div className="font-medium">{selectedAddress.title}</div>
                  <div>{selectedAddress.mainaddress}</div>
                  <div>
                    {selectedAddress.district
                      ? `${selectedAddress.district}, `
                      : ""}
                    {selectedAddress.city}
                  </div>
                  {selectedAddress.postalCode && (
                    <div>PK: {selectedAddress.postalCode}</div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Kayıtlı adres bulunamadı.
                </div>
              )}

              {!isGuest && (
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  className="mt-3 w-full text-center text-sm bg-dark1 hover:bg-dark2 text-white rounded-lg py-2 transition"
                >
                  Adresleri Yönet
                </button>
              )}
            </div>

            <p className="text-[12px] text-gray-500 mt-4">
              Ödeme sırasında sayfayı kapatmayın veya geri tuşuna basmayın.
            </p>
          </div>
        </aside>
      </div>

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
