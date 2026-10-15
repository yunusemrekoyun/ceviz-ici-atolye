'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin } from 'lucide-react';

export type MapMarker = {
  lat: number;
  lng: number;
  title: string;
  price?: string;
  onClick?: () => void;
};

type Props = {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  interactive?: boolean;
  fitBounds?: boolean;
};

const pinHtml = `
  <div class="kst-pin">
    <div class="kst-pin-inner"></div>
  </div>
`;

const icon = L.divIcon({
  className: 'kst-pin-wrap',
  html: pinHtml,
  iconSize: [30, 38],
  iconAnchor: [15, 36],
  popupAnchor: [0, -34],
});

export default function LeafletMap({
  markers,
  center,
  zoom = 9,
  className,
  interactive = true,
  fitBounds = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  // Dokunmatikte tek parmak sürükleme sayfa kaydırmayı yutmasın: harita
  // "dokun ve etkinleştir" örtüsüyle kilitli başlar; dokununca pan açılır.
  const [touchDevice, setTouchDevice] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR bilemez; hydration sonrası tek seferlik yetenek tespiti
    setTouchDevice(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current || markers.length === 0) return;

    const map = L.map(el, {
      scrollWheelZoom: false,
      zoomControl: interactive,
      dragging: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
      attributionControl: true,
    }).setView(center ?? [markers[0].lat, markers[0].lng], zoom);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    const latlngs: L.LatLngExpression[] = [];
    markers.forEach((m) => {
      // title: klavye odaklı pin'e (role=button) erişilebilir ad verir
      const marker = L.marker([m.lat, m.lng], { icon, title: m.title }).addTo(map);
      const label = m.price ? `${m.title} · ${m.price}` : m.title;
      marker.bindTooltip(label, { direction: 'top', offset: [0, -32] });
      if (m.onClick) {
        marker.on('click', m.onClick);
      }
      latlngs.push([m.lat, m.lng]);
    });

    if (fitBounds && markers.length > 1) {
      map.fitBounds(L.latLngBounds(latlngs).pad(0.25));
    }

    mapRef.current = map;

    // Map mounts inside animated/flex containers — recalc size once laid out.
    const t = window.setTimeout(() => map.invalidateSize(), 250);

    // Ekran dönmesi/yeniden boyutlanmada tile'lar bozuk kalmasın.
    let rt = 0;
    const onResize = () => {
      window.clearTimeout(rt);
      rt = window.setTimeout(() => map.invalidateSize(), 180);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    return () => {
      window.clearTimeout(t);
      window.clearTimeout(rt);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Örtü kalkana kadar dokunmatik sürükleme kapalı; kilit açılınca etkin.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !interactive) return;
    if (touchDevice && !unlocked) map.dragging.disable();
    else map.dragging.enable();
  }, [touchDevice, unlocked, interactive]);

  if (markers.length === 0) {
    return (
      <div className={className}>
        <div className="grid h-full w-full place-items-center bg-muted text-muted-foreground">
          <MapPin className="h-8 w-8" aria-hidden="true" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={containerRef} className={className} />
      {interactive && touchDevice && !unlocked ? (
        <button
          type="button"
          onClick={() => setUnlocked(true)}
          className="absolute inset-0 z-[3] flex items-end justify-center bg-transparent pb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Haritayı etkinleştirin"
        >
          <span className="pointer-events-none rounded-full bg-primary/85 px-4 py-2 text-[12px] font-semibold text-white shadow-soft">
            Haritayı kullanmak için dokunun
          </span>
        </button>
      ) : null}
    </div>
  );
}
