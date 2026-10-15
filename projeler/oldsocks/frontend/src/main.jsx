// src/main.jsx
// Fontlar kendi sunucumuzdan gelir (Google'a istek ve çerez onayı gerekmez).
// @font-face tanımları yalnız sayfada kullanılan font dosyasını indirir.
import "@fontsource/playfair-display/700.css";
import "@fontsource-variable/manrope";
import "@fontsource-variable/bodoni-moda";
// Header markası için seçilebilen yazı tipleri (admin → Site İçeriği).
import "@fontsource/pirata-one/400.css";
import "@fontsource/grenze-gotisch/700.css";
import "@fontsource/unifrakturmaguntia/400.css";
import "./index.css";
import { prefetchHero } from "./services/heroMedia";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import CartProvider from "./context/CartContext.jsx";
import UploadQueueOverlay from "./components/ui/UploadQueueOverlay.jsx";
import { UploadQueueProvider } from "./context/UploadQueueContext.jsx";
import AppErrorBoundary from "./components/common/AppErrorBoundary.jsx";

// Açık kalan sekmeler bir dağıtımdan sonra eski parça dosyasını isteyebilir.
// Yeni index.html'i bir kez al; sorun sürerse hata sınırı kullanıcıya yenileme sunar.
window.addEventListener("vite:preloadError", (event) => {
  const url = new URL(window.location.href);
  const lastRetry = Number(url.searchParams.get("_chunkRetry")) || 0;
  const now = Date.now();
  if (now - lastRetry < 60_000) return;

  event.preventDefault();
  url.searchParams.set("_chunkRetry", String(now));
  window.location.replace(url.toString());
});

const RootWrapper =
  import.meta.env.MODE === "production"
    ? ({ children }) => children
    : StrictMode;

if (window.location.pathname === "/") prefetchHero();

createRoot(document.getElementById("root")).render(
  <RootWrapper>
    <AuthProvider>
      <CartProvider>
        <UploadQueueProvider>
          <AppErrorBoundary>
            <App />
            <UploadQueueOverlay />
          </AppErrorBoundary>
        </UploadQueueProvider>
      </CartProvider>
    </AuthProvider>
  </RootWrapper>
);
