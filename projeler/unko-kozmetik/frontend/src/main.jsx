import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import trTR from "antd/locale/tr_TR";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import CartProvider from "./context/CartProvider";
import App from "./App";
import "./index.css";
import ScrollToTop from "./components/ScrollToTop";

dayjs.locale("tr");

// antd bileşenleri (hesabım, admin paneli, modallar) site paletini kullanır
const theme = {
  token: {
    colorPrimary: "#241b1e",
    colorLink: "#9b4a5c",
    colorLinkHover: "#833b4c",
    colorSuccess: "#3f7a5a",
    colorError: "#b3403a",
    colorText: "#241b1e",
    colorTextSecondary: "#5a4d51",
    colorBorder: "#d6c8c2",
    colorBorderSecondary: "#e8ddd8",
    fontFamily:
      '"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    borderRadius: 8,
  },
};

// message, Modal.confirm gibi statik fonksiyonlar da aynı temayı kullansın
ConfigProvider.config({
  holderRender: (children) => (
    <ConfigProvider theme={theme} locale={trTR}>
      {children}
    </ConfigProvider>
  ),
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ScrollToTop />
    <ConfigProvider theme={theme} locale={trTR}>
      <CartProvider>
        <App />
      </CartProvider>
    </ConfigProvider>
  </BrowserRouter>
);
