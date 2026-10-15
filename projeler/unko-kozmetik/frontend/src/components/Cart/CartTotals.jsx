// frontend/src/components/Cart/CartTotals.jsx
import { useContext, useState, useEffect, useMemo } from "react";
import { Alert, Modal, Spin, message } from "antd";
import { useNavigate } from "react-router-dom";
import CartContext from "../../context/CartContext";
import { fetchWithAuth } from "../Auth/fetchWithAuth";
import { readError } from "../../config/api";
import { isLoggedIn } from "../../utils/auth";
import { formatPrice, toQuoteItems } from "../../utils/cart";

const CartTotals = () => {
  const { cartItems, coupon, setCoupon, syncWithQuote } =
    useContext(CartContext);
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState(null);
  const [paymentMode, setPaymentMode] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  // Fiyat gönderilmez; tutarları sunucu veritabanındaki fiyatlarla hesaplar
  const requestBody = useMemo(
    () =>
      JSON.stringify({
        items: toQuoteItems(cartItems),
        couponCode: coupon?.code || undefined,
      }),
    [cartItems, coupon]
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${apiUrl}/api/payment/quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
          signal: controller.signal,
        });
        if (!res.ok)
          throw new Error(await readError(res, "Sepet tutarı hesaplanamadı."));
        const { data } = await res.json();
        setQuote(data);
        setQuoteError(null);
        syncWithQuote(data);
        if (data.couponError) {
          setCoupon(null);
          message.warning(data.couponError);
        }
      } catch (err) {
        if (err.name !== "AbortError") setQuoteError(err.message);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [apiUrl, requestBody, syncWithQuote, setCoupon]);

  useEffect(() => {
    fetch(`${apiUrl}/api/payment/config`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setPaymentMode(json?.data?.mode || null))
      .catch(() => setPaymentMode(null));
  }, [apiUrl]);

  const variantIssues =
    quote?.issues?.filter((i) => i.reason !== "missing") || [];

  const handlePayment = async () => {
    if (!isLoggedIn()) {
      return Modal.confirm({
        title: "Giriş gerekli",
        content: "Ödeme yapabilmek için lütfen giriş yapın.",
        okText: "Giriş yap",
        cancelText: "Kapat",
        onOk() {
          navigate("/auth", { state: { from: "/cart" } });
        },
      });
    }

    setLoading(true);
    try {
      const addrRes = await fetchWithAuth(`${apiUrl}/api/address`);
      if (!addrRes.ok)
        throw new Error(await readError(addrRes, "Adres bilgisi alınamadı."));
      const { data: addresses } = await addrRes.json();
      if (!addresses?.length) {
        setLoading(false);
        return Modal.warning({
          title: "Adres bilgisi eksik",
          content:
            "Ödeme işlemi yapabilmek için adres bilgilerinizi girmelisiniz.",
          okText: "Adres ekle",
          onOk() {
            navigate("/account", { state: { tab: "address" } });
          },
        });
      }

      const res = await fetchWithAuth(`${apiUrl}/api/payment/checkout`, {
        method: "POST",
        body: requestBody,
      });
      if (!res.ok)
        throw new Error(await readError(res, "Ödeme başlatılamadı."));

      const { data } = await res.json();
      window.location.assign(data.url);
    } catch (err) {
      setLoading(false);
      Modal.error({
        title: "Ödeme başlatılamadı",
        content: err.message || "Ödeme sırasında bir hata oluştu.",
      });
    }
  };

  const threshold = quote?.freeShippingThreshold ?? 1750;
  const itemsTotal = quote ? quote.subtotal - quote.couponDiscount : 0;
  const progressBarWidth = Math.min(100, (itemsTotal / threshold) * 100);

  const shippingMessage =
    itemsTotal >= threshold
      ? "Kargonuz ücretsiz."
      : `Ücretsiz kargo için ${formatPrice(threshold - itemsTotal)} kaldı.`;

  return (
    <div className="cart-totals">
      <h2>Sipariş özeti</h2>
      {quoteError && (
        <Alert
          type="error"
          message={quoteError}
          showIcon
          className="cart-alert"
        />
      )}
      <Spin spinning={!quote && !quoteError}>
        <dl className="totals-list price">
          <div>
            <dt>Ara toplam</dt>
            <dd>{formatPrice(quote?.subtotal)}</dd>
          </div>
          {quote?.coupon && quote.couponDiscount > 0 && (
            <div className="is-discount">
              <dt>Kupon ({quote.coupon.code})</dt>
              <dd>−{formatPrice(quote.couponDiscount)}</dd>
            </div>
          )}
          <div>
            <dt>Kargo</dt>
            <dd>
              {quote?.shipping === 0
                ? "Ücretsiz"
                : formatPrice(quote?.shipping)}
            </dd>
          </div>
          <div className="is-total">
            <dt>Toplam</dt>
            <dd>{formatPrice(quote?.total)}</dd>
          </div>
        </dl>
      </Spin>

      <div className="free-progress-bar">
        <p className="progress-bar-title">
          <i className="bi bi-truck" aria-hidden="true" /> {shippingMessage}
        </p>
        <div className="progress-bar">
          <span
            className="progress"
            style={{ width: `${progressBarWidth}%` }}
          />
        </div>
      </div>

      {variantIssues.map((issue) => (
        <Alert
          key={issue.productId}
          type="warning"
          message={issue.message}
          showIcon
          className="cart-alert"
        />
      ))}
      {paymentMode === "mock" && (
        <Alert
          type="info"
          showIcon
          className="cart-alert"
          message="Test modu: Stripe anahtarı tanımlı olmadığı için gerçek ödeme alınmaz."
        />
      )}

      <div className="checkout">
        <button
          type="button"
          className="btn btn-primary btn-lg btn-block"
          onClick={handlePayment}
          disabled={!quote || variantIssues.length > 0 || loading}
        >
          {loading ? "Yönlendiriliyor…" : "Sepeti onayla"}
          {!loading && <i className="bi bi-arrow-right" />}
        </button>
        <p className="checkout-note">
          <i className="bi bi-shield-lock" aria-hidden="true" /> Ödemeniz
          güvenli bağlantı üzerinden alınır.
        </p>
      </div>
    </div>
  );
};

export default CartTotals;
