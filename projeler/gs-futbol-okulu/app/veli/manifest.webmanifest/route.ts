/**
 * Veli paneli "Ana ekrana ekle" tanımı: telefonda uygulama gibi, adres çubuğu olmadan veli paneline açılır.
 * Simgeye basılı tutunca "Dijital kart" kısayolu çıkar (Android).
 */
export const dynamic = "force-static";

export function GET(): Response {
  const icon = (size: number) => ({ src: `/veli/ikon/${size}`, sizes: `${size}x${size}`, type: "image/png" });
  return Response.json(
    {
      id: "/veli",
      name: "Kütahya Galatasaray Futbol Okulu · Veli",
      short_name: "KGS Veli",
      description: "Öğrenci profili, antrenman takibi ve dijital kart",
      start_url: "/veli",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#ffffff",
      theme_color: "#ffffff",
      lang: "tr",
      icons: [
        { ...icon(192), purpose: "any" },
        { ...icon(512), purpose: "any" },
        { ...icon(512), purpose: "maskable" },
      ],
      shortcuts: [
        { name: "Dijital kart", short_name: "Kart", url: "/veli/kart", icons: [icon(192)] },
        { name: "Antrenman takibi", short_name: "Antrenmanlar", url: "/veli/antrenmanlar", icons: [icon(192)] },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } },
  );
}
