// src/components/cart/Cart.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "../../context/useCart";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import CartItem from "./CartItem";
import { FaShoppingCart } from "react-icons/fa";
import AuthRequiredModal from "../auth/AuthRequireModal";
import api from "../../../api";
import { formatTry } from "../../utils/currency";
import ConfirmDialog from "../ui/ConfirmDialog";
import CartRecommendations from "./CartRecommendations";
import { cartKey, reconcileCart } from "../../utils/cartReconcile";
import { previousCheckout } from "../../utils/checkoutSession";

export default function Cart() {
  const {
    items,
    clearCart,
    selectedCampaignId,
    setSelectedCampaignId,
    selectedCouponCode,
    setSelectedCouponCode,
    replaceItems,
  } = useCart();
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);


  // Kampanya/pricing preview
  const [pricingSummary, setPricingSummary] = useState(null);
  const [eligibleCampaigns, setEligibleCampaigns] = useState([]);
  const [appliedCampaign, setAppliedCampaign] = useState(null);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState(null);
  const [couponInput, setCouponInput] = useState(selectedCouponCode || "");
  const [couponError, setCouponError] = useState(null);

  // Öneriler masaüstünde sol sütunda ızgara, telefonda satırlarla özet arasında şerit (tek kopya).
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches
  );
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsDesktop(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Sunucuyla eşitleme: güncel fiyat, stok ve satıştan kalkan ürünler
  const [stockByKey, setStockByKey] = useState(null); // Map<cartKey, available> | null
  const [cartNotices, setCartNotices] = useState([]); // olaylar: çıkarılan ürün, değişen fiyat
  const [stockNotices, setStockNotices] = useState([]); // anlık stok durumu, her kontrolde yenilenir
  const [stockTick, setStockTick] = useState(0);
  const lastStockCheck = useRef(0);
  const linesKey = items.map((i) => `${cartKey(i.id, i.size)}:${i.qty}:${i.price}`).join("|");

  // Oturum açıksa kimlikle gider: üyenin kendi açık ödeme oturumu (başka cihazda ya da
  // yeniden giriş öncesi) mevcut sayılır. Misafirde bu tarayıcının oturumu (heldBy) sayılır.
  const checkStock = (lines) => {
    lastStockCheck.current = Date.now();
    return api
      .post("/cart-campaigns/check", {
        cartItems: lines.map(({ id, size, qty }) => ({ id, size, qty })),
        heldBy: previousCheckout(),
      }, { guestOnRefreshFail: true })
      .then(({ data }) => (Array.isArray(data?.items) ? data.items : []));
  };

  const applyStock = (results) => {
    setStockByKey(new Map(results.map((r) => [cartKey(r.id, r.size), r.available ?? 0])));
    const { items: next, notices, stockNotices: current, changed } = reconcileCart(items, results);
    setStockNotices([...new Set(current)]);
    if (notices.length) setCartNotices((prev) => [...new Set([...prev, ...notices])]);
    if (changed) replaceItems(next);
  };

  useEffect(() => {
    if (!items.length) return undefined;
    let alive = true;
    checkStock(items)
      .then((results) => {
        if (alive) applyStock(results);
      })
      .catch(() => {
        // Eşitleme yapılamazsa sepet olduğu gibi kalır; ödeme adımı yine sunucuda doğrulanır.
      });
    return () => {
      alive = false;
    };
    // linesKey sepet satırlarını temsil eder; items her render'da yeni dizi olabilir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesKey, stockTick]);

  // Sayfaya dönülünce stok yeniden kontrol edilir: başka müşterinin ayrımı bitmiş olabilir.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastStockCheck.current < 5000) return;
      setStockTick((n) => n + 1);
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  // Kargo metodu (tek kayıt varsayımı)
  const [shipping, setShipping] = useState(null); // { _id, name, fee, freeShippingThreshold }
  const [shipLoading, setShipLoading] = useState(true);
  const [shipError, setShipError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setShipLoading(true);
        const { data } = await api.get("/shipping");
        if (!alive) return;
        const list = Array.isArray(data) ? data : [];
        setShipping(list[0] || null);
        setShipError(null);
      } catch (e) {
        console.error("Kargo bilgisi alınamadı:", e);
        setShipError("Kargo bilgisi alınamadı");
        setShipping(null);
      } finally {
        if (alive) setShipLoading(false);
      }
    })();
    return () => {
      alive = false;
      };
  }, []);

  useEffect(() => {
    setCouponInput(selectedCouponCode || "");
  }, [selectedCouponCode]);

  useEffect(() => {
    if (items.length === 0) {
      setPricingSummary(null);
      setEligibleCampaigns([]);
      setAppliedCampaign(null);
      setAppliedCoupon(null);
      setPricingError(null);
      if (selectedCampaignId) setSelectedCampaignId(null);
      if (selectedCouponCode) setSelectedCouponCode(null);
      return;
    }

    let alive = true;
    (async () => {
      try {
        setPricingLoading(true);
        const { data } = await api.post("/cart-campaigns/preview", {
          cartItems: items,
          selectedCampaignId: selectedCampaignId || null,
          couponCode: selectedCouponCode || null,
          heldBy: previousCheckout(),
        }, { guestOnRefreshFail: true });
        if (!alive) return;
        const eligible = Array.isArray(data?.eligibleCampaigns)
          ? data.eligibleCampaigns
          : [];
        const applied = data?.appliedCampaign || null;
        const coupon = data?.appliedCoupon || null;

        setPricingSummary(data?.summary || null);
        setEligibleCampaigns(eligible);
        setAppliedCampaign(applied);
        setAppliedCoupon(coupon);
        setPricingError(null);
        // Geçersiz kupon kaldırıldıktan sonraki yeniden hesaplama hata mesajını silmesin.
        if (selectedCouponCode) setCouponError(null);
      } catch (e) {
        console.error("Sepet fiyatlandırması alınamadı:", e);
        const message =
          e?.response?.data?.message || "Kampanya hesaplanamadı.";
        const source = e?.response?.data?.source || null;
        if (source === "coupon") {
          setCouponError(message);
          setPricingError(null);
        } else {
          setPricingError(message);
          setCouponError(null);
        }
        setPricingSummary(null);
        setEligibleCampaigns([]);
        setAppliedCampaign(null);
        setAppliedCoupon(null);

        if (e?.response?.status === 409 && selectedCampaignId) {
          setSelectedCampaignId(null);
        }
        if (source === "coupon" && selectedCouponCode) {
          setSelectedCouponCode(null);
        }
      } finally {
        if (alive) setPricingLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [
    items,
    selectedCampaignId,
    selectedCouponCode,
    setSelectedCampaignId,
    setSelectedCouponCode,
  ]);

  // Ara toplam
  const localSubTotal = useMemo(
    () => items.reduce((total, item) => total + item.price * item.qty, 0),
    [items]
  );

  // Ücretsiz kargo koşulu
  const localIsFree =
    shipping?.freeShippingThreshold != null &&
    localSubTotal >= Number(shipping.freeShippingThreshold);

  // Ödenecek kargo bedeli
  const localShippingFee = !shipping
    ? 0
    : localIsFree
    ? 0
    : Number(shipping.fee || 0);

  const subTotal = Number(pricingSummary?.subTotal ?? localSubTotal);
  const campaignDiscount = Number(pricingSummary?.campaignDiscount ?? 0);
  const couponDiscount = Number(pricingSummary?.couponDiscount ?? 0);
  const discountedSubTotal = Number(
    pricingSummary?.discountedSubTotal ??
      Math.max(0, subTotal - campaignDiscount - couponDiscount)
  );
  const shippingFee = Number(pricingSummary?.shippingFee ?? localShippingFee);
  const grandTotal = Number(pricingSummary?.grandTotal ?? discountedSubTotal + shippingFee);
  const shippingName = pricingSummary?.shippingName || shipping?.name || null;
  const isFree = pricingSummary ? Boolean(pricingSummary.isFree) : localIsFree;
  const freeShippingThreshold =
    pricingSummary?.freeShippingThreshold ?? shipping?.freeShippingThreshold ?? null;

  // Stok kontrolü geldiyse adedi mevcut stoğu aşan satır varken ödemeye geçilmez; satır
  // sepette kalır (stok başka bir müşterinin ayrımından dönebilir).
  const shortLines = stockByKey
    ? items.filter((item) => {
        const available = stockByKey.get(cartKey(item.id, item.size));
        return available !== undefined && item.qty > available;
      })
    : [];
  const [checkoutBlocked, setCheckoutBlocked] = useState(false);

  const handleCheckout = () => {
    if (shortLines.length) {
      // Stok arada dönmüş olabilir: yeniden kontrol edilir (sepet değişirse sonucu
      // uygulanmaz); döndüyse uyarı kalkar ve müşteri tekrar tıklar.
      setCheckoutBlocked(true);
      setStockTick((n) => n + 1);
      return;
    }
    setCheckoutBlocked(false);
    if (!isLoggedIn) {
      setShowLoginModal(true);
    } else {
      navigate("/checkout");
    }
  };

  const applyCoupon = () => {
    const normalized = String(couponInput || "").trim().toUpperCase();
    if (!normalized) {
      setCouponError("Lütfen bir kupon kodu girin.");
      return;
    }

    setCouponError(null);
    if (selectedCampaignId) setSelectedCampaignId(null);
    setSelectedCouponCode(normalized);
  };

  const removeCoupon = () => {
    setSelectedCouponCode(null);
    setAppliedCoupon(null);
    setCouponError(null);
  };

  /* ─────────── sepet boş ─────────── */
  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-dark1 px-4 text-center">
        <FaShoppingCart size={60} className="mb-4 text-gray-400" />
        <h2 className="text-3xl font-semibold mb-2">Sepetiniz boş</h2>
        <p className="text-gray-500 mb-6">
          Alışverişe devam ederek favori ürünleri ekleyebilirsiniz.
        </p>
        <button
          onClick={() => navigate("/shop")}
          className="bg-dark1 text-white px-8 py-3 rounded-full hover:bg-dark2 transition"
        >
          Alışverişe Başla
        </button>
      </div>
    );
  }

  /* ─────────── normal sepet görünümü ─────────── */
  return (
    <div className="container mx-auto px-4 py-10">
      <h2 className="text-3xl sm:text-4xl font-bold text-dark1 mb-8 sm:mb-10 flex items-center gap-3">
        <FaShoppingCart className="text-dark2" size={26} />
        Sepetim
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Ürün listesi */}
        <section className="lg:col-span-2">
          {stockNotices.length + cartNotices.length > 0 && (
            <div
              role="status"
              className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              <ul className="space-y-1">
                {[...stockNotices, ...cartNotices].map((notice) => (
                  <li key={notice}>{notice}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  setCartNotices([]);
                  setStockNotices([]);
                }}
                className="shrink-0 font-medium underline underline-offset-2"
              >
                Tamam
              </button>
            </div>
          )}
          <div className="space-y-4 sm:space-y-6">
            {items.map((item) => (
              <CartItem
                key={`${item.id}-${item.size || "nosize"}`}
                item={item}
                available={stockByKey ? stockByKey.get(cartKey(item.id, item.size)) : undefined}
              />
            ))}
          </div>
          {/* Masaüstünde satırların altındaki boşlukta; telefonda sipariş özetinden önce */}
          <CartRecommendations inline={isDesktop} />
        </section>

        {/* Özet kartı */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-6 bg-white rounded-xl border border-light2 p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-dark1 mb-4">
              Sipariş Özeti
            </h3>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-dark2">Ara Toplam</span>
                <span className="font-medium">{formatTry(subTotal)}</span>
              </div>

              {campaignDiscount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-dark2">Kampanya İndirimi</span>
                  <span className="font-medium text-emerald-700">
                    -{formatTry(campaignDiscount)}
                  </span>
                </div>
              )}

              {couponDiscount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-dark2">
                    Kupon İndirimi
                    {appliedCoupon?.code ? ` (${appliedCoupon.code})` : ""}
                  </span>
                  <span className="font-medium text-blue-700">
                    -{formatTry(couponDiscount)}
                  </span>
                </div>
              )}

              {(campaignDiscount > 0 || couponDiscount > 0) && (
                <div className="flex items-center justify-between text-[13px] text-gray-600">
                  <span>İndirimli Ara Toplam</span>
                  <span className="font-medium">
                    {formatTry(discountedSubTotal)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-dark2">
                    Kargo{shippingName ? ` (${shippingName})` : ""}
                  </span>
                  {(shipLoading || pricingLoading) && (
                    <span className="text-xs text-gray-500">hesaplanıyor…</span>
                  )}
                  {!pricingSummary && shipError && (
                    <span className="text-xs text-red-600">{shipError}</span>
                  )}
                </div>

                {pricingSummary || shipping ? (
                  isFree ? (
                    <div className="flex items-center gap-2">
                      <s className="text-gray-400">
                        {formatTry(
                          shipping?.fee ?? pricingSummary?.shippingFee ?? 0
                        )}
                      </s>
                      <span className="font-medium">{formatTry(0)}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        Kargo ücretsiz
                      </span>
                    </div>
                  ) : (
                    <span className="font-medium">
                      {formatTry(shippingFee)}
                    </span>
                  )
                ) : (
                  <span className="font-medium">{formatTry(0)}</span>
                )}
              </div>

              {freeShippingThreshold != null && !isFree && (
                <div className="text-xs text-gray-500 text-right">
                  {formatTry(freeShippingThreshold, { fractionDigits: 0 })} ve üzeri
                  alışverişlerde kargo ücretsiz.
                </div>
              )}
            </div>

            <div className="h-px bg-light2 my-4" />

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-dark1">Kupon Kodu</h4>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Kupon kodunuzu girin"
                  className="flex-1 rounded-md border border-light2 px-3 py-2 text-sm outline-none focus:border-dark1"
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={pricingLoading}
                  className="rounded-md bg-dark1 px-4 py-2 text-sm font-medium text-white transition hover:bg-dark2 disabled:opacity-60"
                >
                  Uygula
                </button>
              </div>

              {couponError && (
                <p className="text-xs text-red-600">{couponError}</p>
              )}

              {appliedCoupon?.code && (
                <div className="flex flex-col gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-3 text-sm text-blue-800 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">
                      Uygulanan kupon: {appliedCoupon.code}
                    </div>
                    <div className="text-xs text-blue-700">
                      Sepet kampanyaları ile birlikte kullanılamaz.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="rounded-md border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-800 transition hover:bg-white"
                  >
                    Kuponu Kaldır
                  </button>
                </div>
              )}
            </div>

            <div className="h-px bg-light2 my-4" />

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-dark1">Kampanya Seçimi</h4>

              {pricingLoading && (
                <p className="text-xs text-gray-500">Kampanyalar hesaplanıyor…</p>
              )}

              {pricingError && (
                <p className="text-xs text-red-600">{pricingError}</p>
              )}

              {appliedCoupon?.code && !pricingLoading ? (
                <p className="text-xs text-gray-500">
                  Kupon aktif olduğu için sepet kampanyaları devre dışı bırakıldı.
                </p>
              ) : null}

              {!pricingLoading &&
                !pricingError &&
                !appliedCoupon &&
                eligibleCampaigns.length === 0 && (
                <p className="text-xs text-gray-500">
                  Sepetiniz için uygun kampanya bulunamadı.
                </p>
                )}

              {!pricingLoading && !appliedCoupon && eligibleCampaigns.length > 0 && (
                <div className="space-y-2 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="campaign"
                      checked={!selectedCampaignId}
                      onChange={() => setSelectedCampaignId(null)}
                    />
                    <span>Kampanya kullanma</span>
                  </label>

                  {eligibleCampaigns.map((c) => {
                    const cid = String(c.campaignId);
                    const checked = String(selectedCampaignId || "") === cid;
                    return (
                      <label
                        key={cid}
                        className="flex items-center justify-between gap-2 cursor-pointer p-2 rounded-md border border-light2"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="campaign"
                            checked={checked}
                            onChange={() => {
                              if (selectedCouponCode) setSelectedCouponCode(null);
                              setCouponError(null);
                              setSelectedCampaignId(cid);
                            }}
                          />
                          <span>{c.name}</span>
                        </span>
                        <span className="text-emerald-700 font-medium">
                          -{formatTry(c.savings || 0)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {appliedCampaign?.name && (
                <p className="text-xs text-emerald-700">
                  Uygulanan kampanya: {appliedCampaign.name}
                </p>
              )}
            </div>

            <div className="h-px bg-light2 my-4" />

            <div className="flex items-center justify-between text-base sm:text-lg font-semibold">
              <span>Genel Toplam</span>
              <span>{formatTry(grandTotal)}</span>
            </div>

            <p className="mt-4 text-xs text-dark2">
              Ön bilgilendirme formu ve sözleşme onayı ödeme adımında alınır.
            </p>

            {checkoutBlocked && shortLines.length > 0 && (
              <p role="alert" className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Sepetinizdeki bazı ürünler şu an yeterli stokta değil. Adedi azaltın, ürünü çıkarın ya da biraz sonra
                tekrar deneyin.
              </p>
            )}
            {/* Butonlar */}
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex-1 sm:flex-none sm:min-w-[160px] bg-light2 text-dark2 px-5 py-3 rounded-full hover:bg-light1 transition font-medium"
              >
                Sepeti Temizle
              </button>
              <button
                onClick={handleCheckout}
                className="flex-1 sm:flex-none sm:min-w-[180px] px-6 py-3 rounded-full font-semibold transition bg-dark1 text-white hover:bg-dark2"
              >
                Ödeme Yap
              </button>
            </div>
          </div>
        </aside>
      </div>

      {showLoginModal && (
        <AuthRequiredModal
          open
          onClose={() => setShowLoginModal(false)}
          onLogin={() => navigate("/auth", { state: { from: "/cart" } })}
          onGuest={() => {
            setShowLoginModal(false);
            navigate("/checkout-guest");
          }}
          title="Devam etmek için giriş yapın"
          message="Dilerseniz üye olmadan da devam edebilirsiniz."
        />
      )}

      <ConfirmDialog
        open={showClearConfirm}
        title="Sepeti temizle"
        message="Sepetinizdeki tüm ürünler kaldırılacak. Devam etmek istiyor musunuz?"
        confirmLabel="Sepeti Temizle"
        cancelLabel="Vazgeç"
        tone="danger"
        onCancel={() => setShowClearConfirm(false)}
        onConfirm={() => {
          clearCart();
          setShowClearConfirm(false);
        }}
      />
    </div>
  );
}
