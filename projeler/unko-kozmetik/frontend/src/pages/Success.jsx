// src/pages/Success.jsx
import { Button, Result, Spin } from "antd";
import { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import CartContext from "../context/CartContext";
import { fetchWithAuth } from "../components/Auth/fetchWithAuth";
import { readError } from "../config/api";
import { isAdmin } from "../config/isAdmin";
import { formatPrice } from "../utils/cart";

const Success = () => {
  const { clearCart } = useContext(CartContext);
  const [searchParams] = useSearchParams();
  const [state, setState] = useState({ status: "loading" });
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const navigate = useNavigate();
  const started = useRef(false);

  const sessionId = searchParams.get("session_id");
  const orderId = searchParams.get("order_id");

  useEffect(() => {
    // Ödeme doğrulaması sayfa başına yalnızca bir kez yapılır
    if (started.current) return;
    started.current = true;

    if (!sessionId && !orderId) {
      setState({
        status: "error",
        message: "Doğrulanacak bir ödeme bulunamadı.",
      });
      return;
    }

    (async () => {
      try {
        const res = await fetchWithAuth(`${apiUrl}/api/payment/confirm`, {
          method: "POST",
          body: JSON.stringify(sessionId ? { sessionId } : { orderId }),
        });
        if (!res.ok)
          throw new Error(await readError(res, "Ödeme doğrulanamadı."));
        const { data } = await res.json();

        if (data.paymentStatus === "paid") {
          clearCart();
          setState({ status: "paid", order: data });
        } else {
          setState({ status: "pending", order: data });
        }
      } catch (err) {
        setState({ status: "error", message: err.message });
      }
    })();
  }, [apiUrl, sessionId, orderId, clearCart]);

  const goToOrders = () =>
    navigate(isAdmin() ? "/admin/orders" : "/account", {
      state: { tab: "orders" },
    });

  return (
    <div className="success-page result-page">
      <div className="container">
        {state.status === "loading" && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "100px 0",
            }}
          >
            <Spin size="large" tip="Ödemeniz doğrulanıyor...">
              <div style={{ minHeight: 100, minWidth: 200 }} />
            </Spin>
          </div>
        )}

        {state.status === "paid" && (
          <Result
            status="success"
            title="Ödeme Başarılı!"
            subTitle={`Siparişiniz alındı. Sipariş No: #${String(
              state.order.orderId
            ).slice(-6)} · Tutar: ${formatPrice(state.order.total)}`}
            extra={[
              <Link to="/" key="home">
                <Button type="primary">Ana Sayfa</Button>
              </Link>,
              <Button key="order" onClick={goToOrders}>
                Siparişlerim
              </Button>,
            ]}
          />
        )}

        {state.status === "pending" && (
          <Result
            status="info"
            title="Ödemeniz henüz onaylanmadı"
            subTitle="Ödeme sağlayıcısından onay bekleniyor. Birkaç dakika sonra siparişlerinizi kontrol edebilirsiniz."
            extra={[
              <Button
                key="retry"
                type="primary"
                onClick={() => window.location.reload()}
              >
                Tekrar Kontrol Et
              </Button>,
              <Button key="order" onClick={goToOrders}>
                Siparişlerim
              </Button>,
            ]}
          />
        )}

        {state.status === "error" && (
          <Result
            status="error"
            title="Ödeme doğrulanamadı"
            subTitle={state.message}
            extra={[
              <Link to="/cart" key="cart">
                <Button type="primary">Sepete Dön</Button>
              </Link>,
            ]}
          />
        )}
      </div>
    </div>
  );
};

export default Success;
