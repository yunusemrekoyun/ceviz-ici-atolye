import type { MetadataRoute } from "next";

/** Panel telefonda "Ana ekrana ekle" ile uygulama gibi açılır (adres çubuğu olmadan, doğrudan panele). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kütahya Galatasaray Futbol Okulları · Panel",
    short_name: "KGS Panel",
    description: "Ön kayıt, randevu ve öğrenci yönetimi",
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
    orientation: "portrait",
    background_color: "#101114",
    theme_color: "#a90432",
    lang: "tr",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
