import process from "node:process";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function originOf(value) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

// API ve medya sunucusuna bağlantıyı sayfa açılır açılmaz kur (DNS + TLS).
// Adresler derleme ortamından gelir; yerel derleme canlı sunuculara bağlanmaz.
function preconnectOrigins(env) {
  const api = originOf(env.VITE_API_BASE_URL);
  const media = originOf(env.VITE_MEDIA_ORIGIN);
  return {
    name: "oldsocks-preconnect",
    transformIndexHtml() {
      const tags = [];
      // Vitrin istekleri çerezsiz CORS ile gider; preconnect de anonim olmalı.
      if (api) tags.push({ tag: "link", attrs: { rel: "preconnect", href: api, crossorigin: "" }, injectTo: "head-prepend" });
      // Görseller CORS'suz istenir.
      if (media && media !== api) tags.push({ tag: "link", attrs: { rel: "preconnect", href: media }, injectTo: "head-prepend" });
      return tags;
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    plugins: [react(), preconnectOrigins(env)],
    base: "/",
    build: {
      rollupOptions: {
        output: {
          // Nadiren değişen kütüphaneler ayrı dosyada: her dağıtımda yeniden indirilmez.
          manualChunks(id) {
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id)) {
              return "vendor-react";
            }
            if (/[\\/]node_modules[\\/]axios[\\/]/.test(id)) return "vendor-axios";
            return undefined;
          },
        },
      },
    },
  };
});
