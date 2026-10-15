// src/pages/PaymentResultPage.jsx
// Ödeme sonucunu yalnız sunucudan öğrenir; adresteki "status" yalnız hangi kontrolün
// yapılacağını belirler, adresteki metinler ekranda gösterilmez.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "../context/useCart";
import { useAuth } from "../context/AuthContext";
import api from "../../api";
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";
import usePageMeta from "../hooks/usePageMeta";
import { forgetCheckout } from "../utils/checkoutSession";

const POLL_INTERVAL_MS = 2000;
const POLL_LIMIT_MS = 30000;

const REVIEW_MESSAGE =
  "Ödemeniz alındı; siparişiniz kontrol için incelemeye alındı. Ekibimiz sizinle iletişime geçecek.";

// Sunucu yanıtını tek bir duruma çevirir: paid | review | failed | invalid | pending
async function fetchPaymentState(conversationId) {
  try {
    const { data } = await api.post("/orders/confirm", { conversationId }, { timeout: 10000 });
    return { state: data?.state || "paid", orderNumber: data?.orderNumber || "" };
  } catch (err) {
    const data = err?.response?.data || {};
    if (data.state === "review" || data.code === "PAYMENT_REVIEW") {
      return { state: "review", orderNumber: data.orderNumber || "", message: data.message };
    }
    if (data.state === "failed") return { state: "failed" };
    if (err?.response?.status === 404) return { state: "failed" };
    if (err?.response?.status === 400) return { state: "invalid" };
    // Bekliyor, ağ hatası veya zaman aşımı: tekrar denenir.
    return { state: "pending" };
  }
}

export default function PaymentResultPage() {
  usePageMeta({ title: "Ödeme Sonucu", noindex: true });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const { isLoggedIn } = useAuth();

  const urlStatus = searchParams.get("status");
  const conversationId =
    searchParams.get("merchant_oid") ||
    searchParams.get("conversationId") ||
    searchParams.get("conversation_id") ||
    "";
  const paymentId = searchParams.get("paymentId") || "";

  const [phase, setPhase] = useState(conversationId ? "checking" : "invalid");
  const [orderNumber, setOrderNumber] = useState("");
  const [reviewMessage, setReviewMessage] = useState(REVIEW_MESSAGE);
  const [attempt, setAttempt] = useState(0);
  const clearCartRef = useRef(clearCart);

  useEffect(() => {
    clearCartRef.current = clearCart;
  }, [clearCart]);

  // Sepet her ödeme için yalnız bir kez temizlenir; sonuç sayfası yenilenince
  // sonradan eklenen ürünler silinmez.
  const clearCartOnce = useCallback(() => {
    const key = `payment-cart-cleared:${conversationId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Depolama kapalıysa yine de temizle.
    }
    try {
      clearCartRef.current();
    } catch {
      // Sepet temizlenemezse sonuç ekranı yine gösterilir.
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return undefined;
    let active = true;
    let timer = null;
    const startedAt = Date.now();

    const finish = (result) => {
      if (!active) return;
      if (result.orderNumber) setOrderNumber(result.orderNumber);
      if (result.state === "paid" || result.state === "review") clearCartOnce();
      // Başarısızsa oturum hatırlanır: yeniden ödemede eski oturum kapatılır.
      if (["paid", "review", "invalid"].includes(result.state)) forgetCheckout(conversationId);
      if (result.state === "review" && result.message) setReviewMessage(result.message);
      setPhase(result.state);
    };

    const poll = async () => {
      const result = await fetchPaymentState(conversationId);
      if (!active) return;
      if (result.state !== "pending") return finish(result);
      // PayTR "başarısız" dönüşünde beklemeye gerek yok.
      if (urlStatus === "failure") return finish({ state: "failed" });
      if (Date.now() - startedAt >= POLL_LIMIT_MS) {
        // Ödeme sayfası başarılı döndü, onay gecikiyor: yeni ödeme bu oturumu kapatmasın.
        if (urlStatus === "success") forgetCheckout(conversationId);
        return setPhase("slow");
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    (async () => {
      setPhase("checking");
      if (urlStatus === "success" && paymentId.startsWith("mock_") && attempt === 0) {
        await api.post("/payment/mock-complete", { conversationId }).catch(() => {});
      }
      poll();
    })();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [conversationId, urlStatus, paymentId, attempt, clearCartOnce]);

  const ordersButton = (
    <button
      type="button"
      onClick={() =>
        isLoggedIn
          ? navigate("/profile", { state: { tab: "orders" } })
          : navigate("/siparis-takip")
      }
      className="flex-1 py-3 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition"
    >
      {isLoggedIn ? "Siparişlerim" : "Sipariş Takibi"}
    </button>
  );
  const homeButton = (
    <button
      type="button"
      onClick={() => navigate("/")}
      className="flex-1 py-3 bg-dark1 text-white rounded-lg shadow-md hover:bg-dark2 transition"
    >
      Ana Sayfa
    </button>
  );

  const screens = {
    checking: {
      icon: <ClockIcon className="w-20 h-20 text-gray-400 mx-auto mb-6 animate-pulse" />,
      title: "Ödemeniz doğrulanıyor",
      titleClass: "text-dark1",
      body: "Bu birkaç saniye sürebilir. Lütfen sayfayı kapatmayın.",
      actions: null,
    },
    paid: {
      icon: <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-6 drop-shadow" />,
      title: "Siparişiniz alındı",
      titleClass: "text-green-600",
      body: "Ödemeniz onaylandı. Sipariş özetini e-posta adresinize gönderdik.",
      actions: (
        <>
          {homeButton}
          {ordersButton}
        </>
      ),
    },
    review: {
      icon: <ExclamationTriangleIcon className="w-20 h-20 text-orange-500 mx-auto mb-6 drop-shadow" />,
      title: "Ödeme alındı, sipariş incelemede",
      titleClass: "text-orange-600",
      body: reviewMessage,
      actions: (
        <>
          {homeButton}
          {ordersButton}
        </>
      ),
    },
    failed: {
      icon: <XCircleIcon className="w-20 h-20 text-red-500 mx-auto mb-6 drop-shadow" />,
      title: "Ödeme tamamlanamadı",
      titleClass: "text-red-600",
      body: "Kartınızdan çekim yapılmadıysa sepetinizdeki ürünlerle tekrar deneyebilirsiniz. Çekim yapıldığını görüyorsanız bizimle iletişime geçin.",
      actions: (
        <>
          <button
            type="button"
            onClick={() => navigate("/cart")}
            className="flex-1 py-3 bg-dark1 text-white rounded-lg shadow-md hover:bg-dark2 transition"
          >
            Sepete Dön
          </button>
          <button
            type="button"
            onClick={() => navigate("/contact")}
            className="flex-1 py-3 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition"
          >
            İletişim
          </button>
        </>
      ),
    },
    slow: {
      icon: <ClockIcon className="w-20 h-20 text-amber-500 mx-auto mb-6" />,
      title: "Onay gecikiyor",
      titleClass: "text-amber-600",
      body: "Ödeme sağlayıcısından onay henüz gelmedi. Kartınızdan çekim yapıldıysa siparişiniz birkaç dakika içinde onaylanır ve e-posta alırsınız. Sepetiniz korunuyor; tekrar ödeme yapmadan önce e-postanızı kontrol edin.",
      actions: (
        <>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="flex-1 py-3 bg-dark1 text-white rounded-lg shadow-md hover:bg-dark2 transition"
          >
            Tekrar Kontrol Et
          </button>
          {ordersButton}
        </>
      ),
    },
    invalid: {
      icon: <XCircleIcon className="w-20 h-20 text-gray-400 mx-auto mb-6" />,
      title: "Geçersiz bağlantı",
      titleClass: "text-dark1",
      body: "Bu bağlantıda sipariş bilgisi yok. Siparişinizi sipariş takibi sayfasından sorgulayabilirsiniz.",
      actions: (
        <>
          {homeButton}
          {ordersButton}
        </>
      ),
    },
  };
  const screen = screens[phase] || screens.checking;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 px-4 py-10">
      <div className="w-full max-w-lg bg-white shadow-2xl rounded-2xl p-8 text-center" aria-live="polite">
        {screen.icon}
        <h1 className={`text-3xl font-bold mb-3 ${screen.titleClass}`}>{screen.title}</h1>
        {orderNumber && (
          <p className="text-sm text-gray-500 mb-3">
            Sipariş No: <strong>{orderNumber}</strong>
          </p>
        )}
        <p className="text-gray-700 mb-6">{screen.body}</p>
        {screen.actions && <div className="flex flex-col sm:flex-row gap-3">{screen.actions}</div>}
      </div>
    </div>
  );
}
