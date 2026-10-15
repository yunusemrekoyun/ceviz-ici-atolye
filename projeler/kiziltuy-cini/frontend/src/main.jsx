import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Layout } from "./layouts/Layout";
import CartProvider from "./context/CartProvider";
import App from "./App";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./index.css";
import ScrollToTop from "./components/ScrollToTop";

// ✅ Ant Design mesaj bileşeni
import { message } from "antd";

// ✅ Global fetch override (performansa etkisiz, sadece 429 kontrolü)
const origFetch = window.fetch;
window.fetch = async (input, init = {}) => {
  const token = localStorage.getItem("token");
  if (token) {
    init.headers = {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    };
  }

  try {
    const response = await origFetch(input, init);

    if (response.status === 429) {
      message.error(
        "Çok fazla istek yaptınız. Lütfen daha sonra tekrar deneyin."
      );
    }

    return response;
  } catch (error) {
    message.error("Bir hata oluştu. Lütfen tekrar deneyin.");
    throw error;
  }
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ScrollToTop />
    <CartProvider>
      <Layout>
        <App />
      </Layout>
    </CartProvider>
  </BrowserRouter>
);
