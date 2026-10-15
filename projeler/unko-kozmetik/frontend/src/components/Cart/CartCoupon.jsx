import { message, Modal } from "antd";
import { useContext, useState } from "react";
import CartContext from "../../context/CartContext";

const CartCoupon = () => {
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { coupon, setCoupon, clearCart } = useContext(CartContext);
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const applyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) {
      return message.warning("Boş değer girilemez.");
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${apiUrl}/api/coupons/code/${encodeURIComponent(code)}`
      );
      if (!res.ok) {
        return message.warning("Girdiğiniz kupon kodu yanlış!");
      }
      const { data } = await res.json();
      // İndirim tutarı sepet özetinde sunucu tarafından hesaplanır
      setCoupon({ code: data.code, discountPercent: data.discountPercent });
      setCouponCode("");
      message.success(`${data.code} kupon kodu başarıyla uygulandı.`);
    } catch {
      message.error("Kupon doğrulanamadı. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    message.info("Kupon kaldırıldı.");
  };

  const handleClearCart = () => {
    Modal.confirm({
      title: "Sepeti temizle",
      content: "Sepetinizdeki tüm ürünler kaldırılacak. Emin misiniz?",
      okText: "Evet",
      cancelText: "Vazgeç",
      onOk: () => {
        clearCart();
        message.info("Sepetiniz temizlendi.");
      },
    });
  };

  return (
    <div className="actions-wrapper">
      {coupon ? (
        <div className="applied-coupon-message">
          <i className="bi bi-ticket-perforated" aria-hidden="true" />
          <p>
            <strong>{coupon.code}</strong> kuponu uygulandı · %
            {coupon.discountPercent} indirim
          </p>
          <button type="button" className="text-link" onClick={removeCoupon}>
            Kaldır
          </button>
        </div>
      ) : (
        <div className="coupon">
          <label htmlFor="coupon-code" className="visually-hidden">
            Kupon kodu
          </label>
          <input
            id="coupon-code"
            type="text"
            className="input-text"
            placeholder="Kupon kodunuz"
            autoComplete="off"
            onChange={(e) => setCouponCode(e.target.value)}
            value={couponCode}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyCoupon();
              }
            }}
          />
          <button
            className="btn"
            type="button"
            onClick={applyCoupon}
            disabled={loading}
          >
            Uygula
          </button>
        </div>
      )}

      <button
        type="button"
        className="text-link clear-cart"
        onClick={handleClearCart}
      >
        Sepeti temizle
      </button>
    </div>
  );
};

export default CartCoupon;
