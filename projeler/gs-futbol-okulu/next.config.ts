import type { NextConfig } from "next";

// Admin ve API yanıtları hiçbir zaman cache'lenmesin ve arama motorlarınca indekslenmesin.
const noStoreNoIndexHeaders = [
  { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Kamera yalnız kendi sayfalarımızda (kart okutma); mikrofon ve konum kapalı.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  agentRules: false,
  devIndicators: false,
  // Yerel denemede telefondan açmak için (yalnız geliştirme): DEV_ORIGINS=192.168.1.20 npm run dev -- -H 0.0.0.0
  allowedDevOrigins: process.env.DEV_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean),
  // better-sqlite3 native modül olduğu için sunucu bundle'ına dahil edilmez, Node require ile yüklenir.
  // pdfmake yazı tiplerini node_modules'tan dosya olarak okur; bundle'a alınmaz.
  serverExternalPackages: ["better-sqlite3", "pdfmake"],
  // Fotoğraf / dekont yükleme (istemcide küçültülür; küçültülemeyen dosyalar için pay bırakıldı).
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin", headers: noStoreNoIndexHeaders },
      { source: "/admin/:path*", headers: noStoreNoIndexHeaders },
      { source: "/api/:path*", headers: noStoreNoIndexHeaders },
      { source: "/antrenor/:path*", headers: noStoreNoIndexHeaders },
      { source: "/antrenor", headers: noStoreNoIndexHeaders },
      { source: "/veli/:path*", headers: noStoreNoIndexHeaders },
      { source: "/veli", headers: noStoreNoIndexHeaders },
      { source: "/giris", headers: noStoreNoIndexHeaders },
      { source: "/k/:path*", headers: noStoreNoIndexHeaders },
    ];
  },
};

export default nextConfig;
