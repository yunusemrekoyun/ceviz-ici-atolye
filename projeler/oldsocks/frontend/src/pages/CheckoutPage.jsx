// src/pages/CheckoutPage.jsx
import React, { useState, useMemo, useEffect } from "react";
import { IMaskInput } from "react-imask";
import { Navigate, useNavigate } from "react-router-dom";
import { useCart } from "../context/useCart";
import { useAuth } from "../context/AuthContext";
import AuthRequiredModal from "../components/auth/AuthRequireModal";
import ToastAlert from "../components/ui/ToastAlert";
import api from "../../api";
import { formatTry } from "../utils/currency";
import PageLoading from "../components/common/PageLoading";
import OrderConsent from "../components/legal/OrderConsent";
import { LEGAL_VERSION } from "../legal/store";
import usePageMeta from "../hooks/usePageMeta";
import { previousCheckout, rememberCheckout } from "../utils/checkoutSession";

function getPhoneDigits(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(-10);
}

export default function CheckoutPage() {
  usePageMeta({ title: "Ödeme", noindex: true });
  const {
    items,
    selectedCampaignId,
    setSelectedCampaignId,
    selectedCouponCode,
    setSelectedCouponCode,
  } = useCart();
  const { isLoggedIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [addrLoading, setAddrLoading] = useState(true);
  const [addrError, setAddrError] = useState("");
  const [addressReloadKey, setAddressReloadKey] = useState(0);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [pricingSummary, setPricingSummary] = useState(null);
  const [appliedCampaign, setAppliedCampaign] = useState(null);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState(null);

  // kargo state
  const [shipping, setShipping] = useState(null);
  const [shipLoading, setShipLoading] = useState(true);
  // null: henüz bilinmiyor, "": profilde telefon yok
  const [profilePhone, setProfilePhone] = useState(null);
  const [profile, setProfile] = useState(null);
  const [consent, setConsent] = useState({ preInformation: false, distanceSales: false });
  const consentOk = consent.preInformation && consent.distanceSales;
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // ürün ara toplamı
  const subTotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.qty, 0),
    [items]
  );

  // kargo bilgisi çek
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setShipLoading(true);
        const { data } = await api.get("/shipping");
        if (!alive) return;
        const list = Array.isArray(data) ? data : [];
        setShipping(list[0] || null);
      } catch (e) {
        console.error("shipping load error:", e);
      } finally {
        if (alive) setShipLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const isFree =
    shipping?.freeShippingThreshold != null &&
    subTotal >= Number(shipping.freeShippingThreshold);

  const shippingFee = shipping ? (isFree ? 0 : Number(shipping.fee || 0)) : 0;
  const grandTotal = subTotal + shippingFee;

  useEffect(() => {
    if (!items.length) {
      setPricingSummary(null);
      setAppliedCampaign(null);
      setAppliedCoupon(null);
      setPricingError(null);
      setPricingLoading(false);
      return;
    }

    let alive = true;
    const controller = new AbortController();
    setPricingLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.post("/cart-campaigns/preview", {
          cartItems: items,
          selectedCampaignId: selectedCampaignId || null,
          couponCode: selectedCouponCode || null,
          heldBy: previousCheckout(),
        }, { signal: controller.signal, guestOnRefreshFail: true });
        if (!alive) return;
        setPricingSummary(data?.summary || null);
        setAppliedCampaign(data?.appliedCampaign || null);
        setAppliedCoupon(data?.appliedCoupon || null);
        setPricingError(null);
      } catch (err) {
        if (!alive) return;
        console.error("checkout pricing preview error:", err);
        const source = err?.response?.data?.source || null;
        setPricingSummary(null);
        setAppliedCampaign(null);
        setAppliedCoupon(null);
        setPricingError(
          err?.response?.data?.message || "Sipariş özeti güncellenemedi."
        );
        if (source === "campaign" && selectedCampaignId) {
          setSelectedCampaignId(null);
        }
        if (source === "coupon" && selectedCouponCode) {
          setSelectedCouponCode(null);
        }
      } finally {
        if (alive) setPricingLoading(false);
      }
    }, 350);

    return () => {
      alive = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    items,
    selectedCampaignId,
    selectedCouponCode,
    setSelectedCampaignId,
    setSelectedCouponCode,
  ]);

  const displaySubTotal = Number(pricingSummary?.subTotal ?? subTotal);
  const displayCampaignDiscount = Number(
    pricingSummary?.campaignDiscount ?? 0
  );
  const displayCouponDiscount = Number(pricingSummary?.couponDiscount ?? 0);
  const displayDiscountedSubTotal = Number(
    pricingSummary?.discountedSubTotal ??
      Math.max(0, displaySubTotal - displayCampaignDiscount - displayCouponDiscount)
  );
  const displayShippingFee = Number(pricingSummary?.shippingFee ?? shippingFee);
  const displayGrandTotal = Number(pricingSummary?.grandTotal ?? grandTotal);
  const displayIsFree = pricingSummary ? Boolean(pricingSummary.isFree) : isFree;
  const displayShippingName = pricingSummary?.shippingName || shipping?.name || null;
  const displayFreeShippingThreshold =
    pricingSummary?.freeShippingThreshold ?? shipping?.freeShippingThreshold ?? null;

  useEffect(() => {
    let alive = true;
    setAddrLoading(true);
    setAddrError("");
    api
      .get("/users/me/addresses")
      .then(({ data }) => {
        if (!alive) return;
        const list = Array.isArray(data) ? data : [];
        setAddresses(list);
        if (list.length) setSelectedAddress(list[0]._id);
      })
      .catch(() => {
        if (!alive) return;
        setAddresses([]);
        setAddrError("Adresleriniz alınamadı. Bağlantınızı kontrol edip tekrar deneyin.");
      })
      .finally(() => {
        if (alive) setAddrLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [addressReloadKey]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    let alive = true;
    api
      .get("/users/me")
      .then(({ data }) => {
        if (!alive) return;
        setProfilePhone(String(data?.phone || ""));
        setProfile(data || null);
      })
      .catch(() => {
        // Bilinmiyorsa alanı gösterme; sunucu eksik bilgiyi zaten bildirir.
        if (alive) setProfilePhone(null);
      });
    return () => {
      alive = false;
    };
  }, [isLoggedIn]);

  if (authLoading) return <PageLoading />;

  if (!isLoggedIn) {
    return (
      <AuthRequiredModal
        open
        onClose={() => navigate(-1)}
        onLogin={() => navigate("/profile")}
      />
    );
  }

  if (items.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  if (addrLoading) return <div className="p-4">Adresler yükleniyor…</div>;

  if (addrError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="mb-4 text-red-700">{addrError}</p>
        <button
          type="button"
          onClick={() => setAddressReloadKey((value) => value + 1)}
          className="rounded bg-dark1 px-5 py-2 text-white"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (addresses.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <p className="mb-4">
          Ödeme yapabilmek için önce bir adres eklemeniz gerekiyor.
        </p>
        <button
          onClick={() => navigate("/profile")}
          className="px-4 py-2 bg-dark1 text-white rounded"
        >
          Adres Ekle
        </button>
      </div>
    );
  }

  const attemptPayment = async () => {
    if (!selectedAddress) {
      setToast({ type: "error", msg: "Lütfen bir adres seçin." });
      return;
    }
    if (!consentOk) {
      setToast({ type: "error", msg: "Devam etmek için ön bilgilendirme formunu ve sözleşmeyi onaylayın." });
      return;
    }
    const needsPhone = profilePhone === "";
    if (needsPhone && getPhoneDigits(phoneInput).length !== 10) {
      setPhoneError("Telefon numarasını 10 haneli girin.");
      return;
    }
    setLoading(true);
    try {
      if (needsPhone) {
        const phone = `+90${getPhoneDigits(phoneInput)}`;
        try {
          await api.put("/users/me", { phone });
        } catch (err) {
          setPhoneError(err.response?.data?.message || "Telefon kaydedilemedi.");
          return;
        }
        setProfilePhone(phone);
        setPhoneError("");
      }

      const { data } = await api.post("/payment/start", {
        cartItems: items,
        addressId: selectedAddress,
        selectedCampaignId: selectedCampaignId || null,
        couponCode: selectedCouponCode || null,
        consent: { ...consent, version: LEGAL_VERSION },
        previousConversationId: previousCheckout(),
      });
      if (data?.conversationId) rememberCheckout(data.conversationId);

      if (data?.conversationId) {
        const serverSummary = data.summary || null;
        const summary = serverSummary
          ? {
              subTotal: Number(serverSummary.subTotal ?? 0),
              shippingFee: Number(serverSummary.shippingFee ?? 0),
              grandTotal: Number(serverSummary.grandTotal ?? 0),
              isFree: Boolean(serverSummary.isFree),
              shippingName: serverSummary.shippingName ?? null,
              freeShippingThreshold:
                serverSummary.freeShippingThreshold ?? null,
              campaignDiscount: Number(serverSummary.campaignDiscount ?? 0),
              couponDiscount: Number(serverSummary.couponDiscount ?? 0),
              discountedSubTotal: Number(
                serverSummary.discountedSubTotal ??
                  serverSummary.subTotal ??
                  0
              ),
              appliedCampaign: data?.appliedCampaign || null,
              appliedCoupon: data?.appliedCoupon || null,
            }
          : {
              subTotal,
              shippingFee,
              grandTotal,
              isFree,
              shippingName: shipping?.name || null,
              freeShippingThreshold:
                shipping?.freeShippingThreshold ?? null,
              campaignDiscount: 0,
              couponDiscount: 0,
              discountedSubTotal: subTotal,
              appliedCampaign: null,
              appliedCoupon: null,
            };
        navigate("/payment", {
          state: {
            conversationId: data.conversationId,
            selectedAddress: selectedAddress,
            reservedUntil: data.reservedUntil || null,
            summary,
          },
        });
        return;
      }

      setToast({ type: "error", msg: "Ödeme başlatılamadı." });
    } catch (err) {
      console.error("Ödeme başlatılamadı:", err);
      if (err.response?.status === 401) {
        setShowLoginModal(true);
      } else if (err.response?.status === 422) {
        const msg =
          err.response?.data?.message ||
          "Ödeme başlatılamadı. Lütfen bilgilerinizi kontrol edin.";
        setToast({ type: "error", msg });
      } else {
        setToast({
          type: "error",
          msg:
            err?.response?.data?.message ||
            "Ödeme başlatılamadı. Lütfen tekrar deneyin.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-light1 px-4 py-8 text-dark1 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-2xl font-semibold">Siparişi Tamamla</h1>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          {/* 1. Teslimat adresi */}
          <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6 lg:col-start-1 lg:row-start-1">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-dark1 text-xs text-white">1</span>
              Teslimat Adresi
            </h2>
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="sr-only">Teslimat adresi seçin</legend>
              {addresses.map((addr) => (
                <label
                  key={addr._id}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-4 text-sm transition ${
                    selectedAddress === addr._id ? "border-dark1 ring-1 ring-dark1" : "border-light2 hover:border-dark2"
                  }`}
                >
                  <input
                    type="radio"
                    name="addr"
                    value={addr._id}
                    checked={selectedAddress === addr._id}
                    onChange={() => setSelectedAddress(addr._id)}
                    className="mt-0.5 accent-black"
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold">{addr.title}</span>
                    <span className="block text-dark2">{addr.mainaddress}</span>
                    <span className="block text-dark2">{[addr.district, addr.city].filter(Boolean).join(", ")}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <button
              type="button"
              onClick={() => navigate("/profile", { state: { tab: "addresses" } })}
              className="mt-3 text-sm font-medium text-dark2 underline underline-offset-2 hover:text-dark1"
            >
              Adresleri yönet
            </button>
            {profilePhone === "" && (
          <div className="mt-5">
            <label htmlFor="checkout-phone" className="block text-sm mb-1">
              Telefon
            </label>
            <div
              className={[
                "flex items-center overflow-hidden rounded transition",
                phoneError ? "border border-red-500 bg-red-50" : "border border-light2",
              ].join(" ")}
            >
              <span className="px-3 py-2 bg-light1 text-dark2 border-r border-light2">
                +90
              </span>
              <IMaskInput
                id="checkout-phone"
                mask="500 000 00 00"
                definitions={{ 0: /[0-9]/ }}
                value={phoneInput}
                onAccept={(value) => {
                  setPhoneInput(value);
                  if (phoneError) setPhoneError("");
                }}
                unmask={false}
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="5__ ___ __ __"
                aria-invalid={Boolean(phoneError)}
                aria-describedby="checkout-phone-help"
                className="w-full px-3 py-2 bg-white outline-none"
              />
            </div>
            <p id="checkout-phone-help" className={`mt-1 text-xs ${phoneError ? "text-red-600" : "text-dark2"}`}>
              {phoneError || "Kargo ve ödeme için gerekli; hesabınıza kaydedilir."}
            </p>
          </div>
        )}

          </section>

          {/* Sipariş özeti: masaüstünde sağda sabit */}
          <aside className="rounded-2xl bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <h2 className="mb-4 text-base font-semibold">Sipariş Özeti</h2>
            <ul className="mb-4 max-h-80 space-y-3 overflow-y-auto pr-1">
              {items.map((it, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-light1">
                    {it.image && <img src={it.image} alt="" loading="lazy" className="h-full w-full object-cover" />}
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-dark1 px-1 text-[10px] font-bold text-white">{it.qty}</span>
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-medium">{it.name}</p>
                    <p className="text-dark2">{[it.size && `Beden: ${it.size}`, it.color].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="text-sm font-semibold">{formatTry(it.price * it.qty)}</div>
                </li>
              ))}
            </ul>
        <div className="space-y-2 border-t border-light2 pt-4 text-sm">
          <div className="flex justify-between">
            <span>Ara Toplam</span>
            <span>{formatTry(displaySubTotal)}</span>
          </div>

          {displayCampaignDiscount > 0 && (
            <div className="flex justify-between text-emerald-700 text-base">
              <span>Kampanya İndirimi</span>
              <span>-{formatTry(displayCampaignDiscount)}</span>
            </div>
          )}

          {displayCouponDiscount > 0 && (
            <div className="flex justify-between text-blue-700 text-base">
              <span>
                Kupon İndirimi
                {appliedCoupon?.code ? ` (${appliedCoupon.code})` : ""}
              </span>
              <span>-{formatTry(displayCouponDiscount)}</span>
            </div>
          )}

          {(displayCampaignDiscount > 0 || displayCouponDiscount > 0) && (
            <div className="flex justify-between text-base">
              <span>İndirimli Ara Toplam</span>
              <span>{formatTry(displayDiscountedSubTotal)}</span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span>
              Kargo{displayShippingName ? ` (${displayShippingName})` : ""}
            </span>
            {shipLoading || pricingLoading ? (
              <span className="text-gray-500">Kargo yükleniyor…</span>
            ) : shipping || pricingSummary ? (
              displayIsFree ? (
                <span className="flex items-center gap-2">
                  <span className="line-through text-gray-500">
                    {formatTry(shipping?.fee ?? displayShippingFee)}
                  </span>
                  <span className="text-emerald-600 font-bold">Ücretsiz</span>
                </span>
              ) : (
                <span>{formatTry(displayShippingFee)}</span>
              )
            ) : (
              <span className="text-gray-500">Tanımlı kargo yok</span>
            )}
          </div>

          {displayFreeShippingThreshold != null && !displayIsFree && (
            <p className="text-sm text-gray-500">
              {formatTry(displayFreeShippingThreshold, { fractionDigits: 0 })} ve üzeri
              alışverişlerde kargo ücretsiz.
            </p>
          )}

          <div className="flex justify-between border-t border-light2 pt-3 text-lg font-semibold">
            <span>Genel Toplam</span>
            <span>{formatTry(displayGrandTotal)}</span>
          </div>
        </div>

        {(appliedCampaign?.name || appliedCoupon?.code || pricingError) && (
          <div className="mt-4 space-y-1 text-sm">
            {appliedCampaign?.name && (
              <p className="text-emerald-700">
                Uygulanan kampanya: <b>{appliedCampaign.name}</b>
              </p>
            )}
            {appliedCoupon?.code && (
              <p className="text-blue-700">
                Uygulanan kupon: <b>{appliedCoupon.code}</b>
              </p>
            )}
            {pricingError && <p className="text-red-600">{pricingError}</p>}
          </div>
        )}

            <div className="mt-5 hidden lg:block">
              <button
            type="button"
            onClick={() => attemptPayment(false)}
            disabled={loading || !consentOk}
            className={` h-12 w-full rounded-lg text-sm font-semibold uppercase tracking-wider text-white transition ${
              loading || !consentOk ? "cursor-not-allowed bg-gray-400" : "bg-dark1 hover:bg-black"
            }`}
          >
            {loading ? "Yönlendiriliyor…" : "Ödemeye Geç"}
          </button>
              {!consentOk && <p className="mt-2 text-center text-xs text-dark2">Ödemeye geçmek için soldaki iki onay kutusunu işaretleyin.</p>}
            </div>
          </aside>

          {/* 2. Onay */}
          <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6 lg:col-start-1 lg:row-start-2">
            <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-dark1 text-xs text-white">2</span>
              Ön Bilgilendirme ve Sözleşme
            </h2>
        <OrderConsent
          items={items}
          totals={{
            subTotal: displaySubTotal,
            discount: displayCampaignDiscount + displayCouponDiscount,
            shippingFee: displayShippingFee,
            grandTotal: displayGrandTotal,
          }}
          address={addresses.find((a) => a._id === selectedAddress)}
          buyer={{
            name: [profile?.firstName, profile?.lastName].filter(Boolean).join(" "),
            email: profile?.email,
            phone: profile?.phone,
          }}
          value={consent}
          onChange={setConsent}
        />

            <div className="mt-6 lg:hidden">
              <button
            type="button"
            onClick={() => attemptPayment(false)}
            disabled={loading || !consentOk}
            className={` h-12 w-full rounded-lg text-sm font-semibold uppercase tracking-wider text-white transition ${
              loading || !consentOk ? "cursor-not-allowed bg-gray-400" : "bg-dark1 hover:bg-black"
            }`}
          >
            {loading ? "Yönlendiriliyor…" : "Ödemeye Geç"}
          </button>
            </div>
          </section>
        </div>
      </div>

      {showLoginModal && (
        <AuthRequiredModal
          open
          onClose={() => setShowLoginModal(false)}
          onLogin={() => navigate("/auth", { state: { from: "/checkout" } })}
        />
      )}

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
