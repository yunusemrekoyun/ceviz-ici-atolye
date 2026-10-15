import React, { useMemo, useState, useEffect } from "react";
import { IMaskInput } from "react-imask";
import { Navigate, useNavigate } from "react-router-dom";
import { useCart } from "../context/useCart";
import ToastAlert from "../components/ui/ToastAlert";
import api from "../../api";
import { formatTry } from "../utils/currency";
import usePageMeta from "../hooks/usePageMeta";
import OrderConsent from "../components/legal/OrderConsent";
import { LEGAL_VERSION } from "../legal/store";
import { previousCheckout, rememberCheckout } from "../utils/checkoutSession";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const GUEST_FIELD_KEYS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "identityNumber",
  "mainaddress",
  "street",
  "city",
];

function getPhoneDigits(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(-10);
}

function toE164TrPhone(value) {
  const digits = getPhoneDigits(value);
  return digits.length === 10 ? `+90${digits}` : "";
}

// T.C. kimlik no isteğe bağlı; boş bırakılırsa sunucu 11111111111 atar.
function normalizeIdentityNumber(value) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, 11);
}

function validateGuestCheckout(buyer, address) {
  const errors = {};

  if (!buyer.firstName.trim()) errors.firstName = "Ad zorunlu.";
  if (!buyer.lastName.trim()) errors.lastName = "Soyad zorunlu.";

  const email = buyer.email.trim().toLowerCase();
  if (!email) {
    errors.email = "E-posta zorunlu.";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Geçerli bir e-posta adresi girin.";
  }

  const phoneDigits = getPhoneDigits(buyer.phone);
  if (phoneDigits.length !== 10) {
    errors.phone = "Telefon numarasını 10 haneli girin.";
  }

  const identityNumber = normalizeIdentityNumber(buyer.identityNumber);
  if (identityNumber && identityNumber.length !== 11) {
    errors.identityNumber = "T.C. Kimlik No 11 haneli olmalı.";
  }

  if (!address.mainaddress.trim()) {
    errors.mainaddress = "Adres zorunlu.";
  }
  if (!address.street.trim()) {
    errors.street = "Cadde/Sokak zorunlu.";
  }
  if (!address.city.trim()) {
    errors.city = "Şehir zorunlu.";
  }

  return errors;
}

function focusFirstInvalidField(errors) {
  const firstInvalidField = GUEST_FIELD_KEYS.find((key) => errors[key]);
  if (!firstInvalidField || typeof document === "undefined") return;
  const target = document.getElementById(firstInvalidField);
  if (target && typeof target.focus === "function") {
    target.focus();
  }
}

export default function GuestCheckoutPage() {
  usePageMeta({ title: "Misafir Ödeme", noindex: true });
  const {
    items,
    selectedCampaignId,
    setSelectedCampaignId,
    selectedCouponCode,
    setSelectedCouponCode,
  } = useCart();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState({ preInformation: false, distanceSales: false });
  const consentOk = consent.preInformation && consent.distanceSales;
  const [buyer, setBuyer] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    identityNumber: "",
  });
  const [address, setAddress] = useState({
    title: "Teslimat Adresi",
    mainaddress: "",
    street: "",
    district: "",
    city: "",
    postalCode: "",
  });
  const [touched, setTouched] = useState({});

  const [shipping, setShipping] = useState(null);
  const [shipLoading, setShipLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [pricingSummary, setPricingSummary] = useState(null);
  const [appliedCampaign, setAppliedCampaign] = useState(null);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState(null);

  const subTotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.qty, 0),
    [items]
  );

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
        const email =
          EMAIL_REGEX.test(String(buyer.email || "").trim().toLowerCase())
            ? String(buyer.email || "").trim().toLowerCase()
            : null;
        const { data } = await api.post("/cart-campaigns/preview", {
          cartItems: items,
          selectedCampaignId: selectedCampaignId || null,
          couponCode: selectedCouponCode || null,
          heldBy: previousCheckout(),
          customerEmail: email,
        }, { signal: controller.signal, guestOnRefreshFail: true });
        if (!alive) return;
        setPricingSummary(data?.summary || null);
        setAppliedCampaign(data?.appliedCampaign || null);
        setAppliedCoupon(data?.appliedCoupon || null);
        setPricingError(null);
      } catch (err) {
        if (!alive) return;
        console.error("guest checkout pricing preview error:", err);
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
    buyer.email,
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

  const validationErrors = useMemo(
    () => validateGuestCheckout(buyer, address),
    [buyer, address]
  );

  const setBuyerField = (field, value) => {
    setBuyer((prev) => ({ ...prev, [field]: value }));
  };

  const setAddressField = (field, value) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  const touchField = (field) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const markAllTouched = () => {
    setTouched((prev) => {
      const next = { ...prev };
      GUEST_FIELD_KEYS.forEach((field) => {
        next[field] = true;
      });
      return next;
    });
  };

  const getFieldClassName = (field) => {
    const hasError = touched[field] && validationErrors[field];
    return [
      "w-full rounded px-3 py-2 outline-none transition",
      hasError
        ? "border border-red-500 bg-red-50 focus:border-red-600"
        : "border border-light2 focus:border-dark1",
    ].join(" ");
  };

  const startGuestPayment = async () => {
    if (!consentOk) {
      setToast({ type: "error", msg: "Devam etmek için ön bilgilendirme formunu ve sözleşmeyi onaylayın." });
      return;
    }
    if (Object.keys(validationErrors).length > 0) {
      markAllTouched();
      focusFirstInvalidField(validationErrors);
      setToast({
        type: "error",
        msg: "Lütfen işaretli alanları kontrol edin.",
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        cartItems: items,
        selectedCampaignId: selectedCampaignId || null,
        couponCode: selectedCouponCode || null,
        guest: {
          firstName: buyer.firstName.trim(),
          lastName: buyer.lastName.trim(),
          email: buyer.email.trim().toLowerCase(),
          phone: toE164TrPhone(buyer.phone),
          identityNumber: normalizeIdentityNumber(buyer.identityNumber),
          registrationAddress: address.mainaddress.trim(),
        },
        address: {
          title: address.title || "Teslimat Adresi",
          mainaddress: address.mainaddress.trim(),
          street: address.street.trim(),
          district: address.district?.trim() || "",
          city: address.city.trim(),
          postalCode: address.postalCode?.trim() || "",
        },
        consent: { ...consent, version: LEGAL_VERSION },
        previousConversationId: previousCheckout(),
      };

      const { data } = await api.post("/payment/start-guest", payload);
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
            guest: true,
            reservedUntil: data.reservedUntil || null,
            summary,
          },
        });
        return;
      }

      setToast({ type: "error", msg: "Ödeme başlatılamadı." });
    } catch (e) {
      console.error("guest payment start error:", e);
      if (e.response?.status === 422) {
        const msg =
          e.response?.data?.message ||
          "Ödeme başlatılamadı. Lütfen bilgilerinizi kontrol edin.";
        setToast({ type: "error", msg });
      } else {
        setToast({
          type: "error",
          msg:
            e?.response?.data?.message ||
            "Ödeme başlatılamadı. Lütfen tekrar deneyin.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  return (
    <div className="min-h-screen bg-light1 px-4 py-8 text-dark1 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-2xl font-semibold">Üye Olmadan Ödeme</h1>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        {/* 1. İletişim ve teslimat */}
        <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6 lg:col-start-1 lg:row-start-1">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-dark1 text-xs text-white">1</span>
          İletişim ve Teslimat
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="firstName" className="block text-sm mb-1">
              Ad
            </label>
            <input
              id="firstName"
              className={getFieldClassName("firstName")}
              value={buyer.firstName}
              onChange={(e) => setBuyerField("firstName", e.target.value)}
              onBlur={() => touchField("firstName")}
              autoComplete="given-name"
              maxLength={80}
            />
            {touched.firstName && validationErrors.firstName && (
              <p className="mt-1 text-xs text-red-600">
                {validationErrors.firstName}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm mb-1">
              Soyad
            </label>
            <input
              id="lastName"
              className={getFieldClassName("lastName")}
              value={buyer.lastName}
              onChange={(e) => setBuyerField("lastName", e.target.value)}
              onBlur={() => touchField("lastName")}
              autoComplete="family-name"
              maxLength={80}
            />
            {touched.lastName && validationErrors.lastName && (
              <p className="mt-1 text-xs text-red-600">
                {validationErrors.lastName}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm mb-1">
              E-posta
            </label>
            <input
              id="email"
              type="email"
              className={getFieldClassName("email")}
              value={buyer.email}
              onChange={(e) => setBuyerField("email", e.target.value)}
              onBlur={() => touchField("email")}
              autoComplete="email"
              inputMode="email"
              placeholder="ornek@mail.com"
              maxLength={100}
            />
            {touched.email && validationErrors.email && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm mb-1">
              Telefon
            </label>
            <div
              className={[
                "flex items-center overflow-hidden rounded transition",
                touched.phone && validationErrors.phone
                  ? "border border-red-500 bg-red-50"
                  : "border border-light2",
              ].join(" ")}
            >
              <span className="px-3 py-2 bg-light1 text-dark2 border-r border-light2">
                +90
              </span>
              <IMaskInput
                id="phone"
                mask="500 000 00 00"
                definitions={{ 0: /[0-9]/ }}
                value={buyer.phone}
                onAccept={(value) => setBuyerField("phone", value)}
                onBlur={() => touchField("phone")}
                unmask={false}
                inputMode="tel"
                placeholder="5__ ___ __ __"
                className="w-full px-3 py-2 bg-white outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-dark2">Başına +90 otomatik eklenir.</p>
            {touched.phone && validationErrors.phone && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.phone}</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="identityNumber" className="block text-sm mb-1">
              T.C. Kimlik No (Opsiyonel)
            </label>
            <input
              id="identityNumber"
              className={getFieldClassName("identityNumber")}
              value={buyer.identityNumber}
              onChange={(e) => setBuyerField("identityNumber", normalizeIdentityNumber(e.target.value))}
              onBlur={() => touchField("identityNumber")}
              inputMode="numeric"
              placeholder="11 haneli T.C. Kimlik No"
            />
            <p className="mt-1 text-xs text-dark2">Girilecekse sadece rakam ve 11 hane olmalı.</p>
            {touched.identityNumber && validationErrors.identityNumber && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.identityNumber}</p>
            )}
          </div>

        </div>

        <div className="space-y-3 mb-6">
          <div>
            <label htmlFor="mainaddress" className="block text-sm mb-1">
              Adres (Zorunlu)
            </label>
            <input
              id="mainaddress"
              className={getFieldClassName("mainaddress")}
              value={address.mainaddress}
              onChange={(e) => setAddressField("mainaddress", e.target.value)}
              onBlur={() => touchField("mainaddress")}
              placeholder="Sokak, bina, daire no…"
              autoComplete="street-address"
              maxLength={500}
            />
            {touched.mainaddress && validationErrors.mainaddress && (
              <p className="mt-1 text-xs text-red-600">
                {validationErrors.mainaddress}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="district" className="block text-sm mb-1">
                Mahalle/Semt
              </label>
              <input
                id="district"
                className="w-full border border-light2 rounded px-3 py-2 outline-none transition focus:border-dark1"
                value={address.district}
                onChange={(e) => setAddressField("district", e.target.value)}
                autoComplete="address-level3"
                maxLength={120}
              />
            </div>
            <div>
              <label htmlFor="street" className="block text-sm mb-1">
                Cadde/Sokak (Zorunlu)
              </label>
              <input
                id="street"
                className={getFieldClassName("street")}
                value={address.street}
                onChange={(e) => setAddressField("street", e.target.value)}
                onBlur={() => touchField("street")}
                autoComplete="address-line2"
                maxLength={180}
              />
              {touched.street && validationErrors.street && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.street}</p>
              )}
            </div>
            <div>
              <label htmlFor="city" className="block text-sm mb-1">
                Şehir (Zorunlu)
              </label>
              <input
                id="city"
                className={getFieldClassName("city")}
                value={address.city}
                onChange={(e) => setAddressField("city", e.target.value)}
                onBlur={() => touchField("city")}
                autoComplete="address-level2"
                maxLength={100}
              />
              {touched.city && validationErrors.city && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.city}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="postalCode" className="block text-sm mb-1">
              Posta Kodu
            </label>
            <input
              id="postalCode"
              className="w-full border border-light2 rounded px-3 py-2 outline-none transition focus:border-dark1"
              value={address.postalCode}
              onChange={(e) => setAddressField("postalCode", e.target.value)}
              autoComplete="postal-code"
              inputMode="numeric"
              maxLength={20}
            />
          </div>
        </div>

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
            onClick={startGuestPayment}
            disabled={loading || !consentOk}
            className={`h-12 w-full rounded-lg text-sm font-semibold uppercase tracking-wider text-white transition ${
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
          address={address}
          buyer={{
            name: `${buyer.firstName} ${buyer.lastName}`.trim(),
            email: buyer.email,
            phone: buyer.phone,
          }}
          value={consent}
          onChange={setConsent}
        />

        <div className="mt-6 flex gap-3 lg:hidden">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="h-12 w-1/3 rounded-lg bg-light2 text-sm font-medium text-dark2 transition hover:bg-light1"
          >
            Geri
          </button>
          <div className="w-2/3">
          <button
            type="button"
            onClick={startGuestPayment}
            disabled={loading || !consentOk}
            className={`h-12 w-full rounded-lg text-sm font-semibold uppercase tracking-wider text-white transition ${
              loading || !consentOk ? "cursor-not-allowed bg-gray-400" : "bg-dark1 hover:bg-black"
            }`}
          >
            {loading ? "Yönlendiriliyor…" : "Ödemeye Geç"}
          </button>
          </div>
        </div>
        </section>
        </div>

        {toast && (
          <ToastAlert
            msg={toast.msg}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
}
