// Yol tarifi bağlantıları (istemci ve sunucuda kullanılır).
export type Place = { name: string; address: string | null; lat: number | null; lng: number | null };

function target(p: Place): string {
  return p.lat !== null && p.lng !== null ? `${p.lat},${p.lng}` : [p.name, p.address].filter(Boolean).join(", ");
}

export function directionLinks(p: Place): { label: string; href: string }[] {
  const t = encodeURIComponent(target(p));
  const hasCoords = p.lat !== null && p.lng !== null;
  return [
    { label: "Google Haritalar", href: `https://www.google.com/maps/dir/?api=1&destination=${t}` },
    { label: "Apple Haritalar", href: `https://maps.apple.com/?daddr=${t}` },
    { label: "Yandex", href: hasCoords ? `https://yandex.com.tr/harita/?rtext=~${t}&rtt=auto` : `https://yandex.com.tr/harita/?text=${t}` },
  ];
}
