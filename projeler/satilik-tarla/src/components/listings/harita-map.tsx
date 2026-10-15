'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Map as LeafletMap, LayerGroup, Marker, Polygon, Polyline } from 'leaflet';
import { Eraser, MapPin, PenLine, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { thumbUrl } from '@/lib/img';
import { parsePrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { MapPoint } from '@/lib/data';

const KUTAHYA: [number, number] = [39.42, 29.5];
const MOVE_DEBOUNCE_MS = 400;

/** Fiyatı işaretçi pili için kısaltır: ₺1,85M · ₺540B */
function shortPrice(price: string): string {
  const n = parsePrice(price);
  if (n >= 1_000_000)
    return `₺${(n / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}M`;
  if (n >= 1_000) return `₺${Math.round(n / 1_000)}B`;
  return `₺${n}`;
}

/** Kullanıcı verisi popup HTML'ine kaçışsız giremez (üye başlığı vb.). */
function esc(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Harita araması: pinler yalnızca görünen alan (viewport) için canlı yüklenir
 * — ilk açılışta ve her pan/zoom'da sunucudan gelir (bkz. src/lib/data.ts
 * getMapPointsInBounds), tüm aktif ilanlar tek seferde client'a inmez.
 * "Bölge Çiz" ile köşe noktaları tıklanır, kapatınca sunucudan (PostGIS
 * ST_Within, bkz. src/lib/geo.ts) içeride kalan slug'lar gelir. */
export function HaritaMap({ totalCount }: { totalCount: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const drawLayerRef = useRef<LayerGroup | null>(null);
  const previewRef = useRef<Polyline | null>(null);
  const polygonRef = useRef<Polygon | null>(null);
  const verticesRef = useRef<[number, number][]>([]);
  const drawingRef = useRef(false);
  const moveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ready, setReady] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [vertexCount, setVertexCount] = useState(0);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [truncated, setTruncated] = useState(false);
  const [selected, setSelected] = useState<MapPoint[] | null>(null);
  const [filtering, setFiltering] = useState(false);
  const [error, setError] = useState(false);

  /** Haritanın o anki görünür alanı için pinleri sunucudan getirir. */
  const loadViewport = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    setMapLoading(true);
    const b = map.getBounds();
    const params = new URLSearchParams({
      minLat: String(b.getSouth()),
      maxLat: String(b.getNorth()),
      minLng: String(b.getWest()),
      maxLng: String(b.getEast()),
    });
    try {
      const res = await fetch(`/api/harita/pinler?${params}`);
      if (!res.ok) throw new Error('pin yükleme başarısız');
      const data: { points: MapPoint[]; truncated: boolean } = await res.json();
      setPoints(data.points);
      setTruncated(data.truncated);
    } catch {
      setPoints([]);
      setTruncated(false);
    } finally {
      setMapLoading(false);
    }
  }, []);

  async function applyFilter(polygon: [number, number][] | null) {
    if (!polygon) {
      setSelected(null);
      setError(false);
      markersRef.current.forEach((m) => m.setOpacity(1));
      return;
    }
    setFiltering(true);
    setError(false);
    try {
      const res = await fetch('/api/harita/bolge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: polygon.map(([lat, lng]) => ({ lat, lng })) }),
      });
      if (!res.ok) throw new Error('bölge araması başarısız');
      const data: { slugs: string[] } = await res.json();
      const insideSlugs = new Set(data.slugs);
      setSelected(points.filter((p) => insideSlugs.has(p.slug)));
      markersRef.current.forEach((m, i) => {
        m.setOpacity(insideSlugs.has(points[i].slug) ? 1 : 0.25);
      });
    } catch {
      setError(true);
      setSelected([]);
      markersRef.current.forEach((m) => m.setOpacity(0.25));
    } finally {
      setFiltering(false);
    }
  }

  function startDraw() {
    if (!mapRef.current) return;
    resetDraw(false);
    drawingRef.current = true;
    setDrawing(true);
    mapRef.current.getContainer().style.cursor = 'crosshair';
  }

  async function finishDraw() {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || verticesRef.current.length < 3) return;
    drawingRef.current = false;
    setDrawing(false);
    map.getContainer().style.cursor = '';
    previewRef.current?.remove();
    previewRef.current = null;
    polygonRef.current = L.polygon(verticesRef.current, {
      color: '#a8742c',
      weight: 2,
      fillColor: '#a8742c',
      fillOpacity: 0.08,
    }).addTo(map);
    await applyFilter(verticesRef.current);
  }

  function resetDraw(clearFilter = true) {
    drawingRef.current = false;
    setDrawing(false);
    setVertexCount(0);
    verticesRef.current = [];
    previewRef.current?.remove();
    previewRef.current = null;
    polygonRef.current?.remove();
    polygonRef.current = null;
    drawLayerRef.current?.clearLayers();
    if (mapRef.current) mapRef.current.getContainer().style.cursor = '';
    if (clearFilter) void applyFilter(null);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css' as string);
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;

      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(KUTAHYA, 9);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar',
      }).addTo(map);

      drawLayerRef.current = L.layerGroup().addTo(map);

      map.on('click', (e) => {
        if (!drawingRef.current || !drawLayerRef.current) return;
        const v: [number, number] = [e.latlng.lat, e.latlng.lng];
        verticesRef.current.push(v);
        setVertexCount(verticesRef.current.length);
        L.circleMarker(v, {
          radius: 5,
          color: '#a8742c',
          fillColor: '#a8742c',
          fillOpacity: 1,
        }).addTo(drawLayerRef.current);
        if (previewRef.current) previewRef.current.remove();
        previewRef.current = L.polyline(verticesRef.current, {
          color: '#a8742c',
          weight: 2,
          dashArray: '6 4',
        }).addTo(drawLayerRef.current);
      });

      // Pan/zoom sonrası pinler yeniden yüklenir; çizim sürerken dokunulmaz
      // (kullanıcı vertex yerleştirirken harita kayarsa çizim bozulmasın).
      map.on('moveend', () => {
        if (drawingRef.current) return;
        if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
        moveTimerRef.current = setTimeout(() => {
          resetDraw();
          void loadViewport();
        }, MOVE_DEBOUNCE_MS);
      });

      mapRef.current = map;
      setReady(true);
      void loadViewport();
    })();
    return () => {
      cancelled = true;
      if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Görünür alan (points) her yenilendiğinde marker'lar yeniden kurulur.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = points.map((p) => {
      const icon = L.divIcon({
        className: 'kst-pin-wrap',
        html: `<span class="kst-pin">${shortPrice(p.price)}</span>`,
        iconSize: [0, 0],
      });
      const marker = L.marker([p.lat, p.lng], { icon, title: p.title }).addTo(map);
      const img = p.img
        ? `<img src="${thumbUrl(p.img)}" alt="" style="width:100%;height:96px;object-fit:cover;border-radius:6px" />`
        : '';
      marker.bindPopup(
        `<div style="width:200px">${img}
         <div style="font-weight:600;margin-top:6px;line-height:1.3">${esc(p.title)}</div>
         <div style="margin-top:2px;color:#5b6b57">${esc(p.district)} · ${esc(p.area)}</div>
         <div style="margin-top:2px;font-weight:700">${esc(p.price)}</div>
         <a href="/ilan/${encodeURIComponent(p.slug)}" style="display:inline-block;margin-top:6px;font-weight:600;color:#8a5a1e">İlana Git →</a>
        </div>`,
        { closeButton: true },
      );
      return marker;
    });
  }, [points]);

  const results = selected ?? points;
  const initialLoading = mapLoading && points.length === 0 && !selected;

  return (
    <div>
      {/* Araç çubuğu */}
      <div className="flex flex-wrap items-center gap-3">
        {!drawing ? (
          <Button type="button" variant="brass" onClick={startDraw} disabled={!ready || filtering}>
            <PenLine className="h-4 w-4" />
            Bölge Çiz
          </Button>
        ) : (
          <>
            <Button type="button" variant="brass" onClick={finishDraw} disabled={vertexCount < 3}>
              Bölgeyi Kapat ({vertexCount} nokta)
            </Button>
            <Button type="button" variant="outline" onClick={() => resetDraw()}>
              <X className="h-4 w-4" />
              Vazgeç
            </Button>
          </>
        )}
        {selected ? (
          <Button type="button" variant="outline" onClick={() => resetDraw()} disabled={filtering}>
            <Eraser className="h-4 w-4" />
            Bölgeyi Temizle
          </Button>
        ) : null}
        <span className="text-[15px] text-muted-foreground">
          {drawing ? (
            'Haritaya tıklayarak bölgenin köşelerini işaretleyin.'
          ) : filtering ? (
            'Bölge aranıyor…'
          ) : error ? (
            <span className="text-destructive">Bölge araması başarısız oldu, tekrar deneyin.</span>
          ) : initialLoading ? (
            'Harita yükleniyor…'
          ) : (
            <>
              <b className="font-semibold text-foreground">{results.length}</b> ilan{' '}
              {selected ? 'seçili bölgede' : 'bu bölgede'}
              {!selected && truncated ? (
                <span className="ml-2 text-brass-strong">— daha fazlası için yakınlaştırın</span>
              ) : null}
              {!selected ? <span className="ml-2">· toplam {totalCount} ilan</span> : null}
            </>
          )}
        </span>
      </div>

      {/* Harita */}
      <div className="mt-4 overflow-hidden rounded-lg border border-border shadow-soft">
        <div
          ref={containerRef}
          className="h-[52vh] min-h-[22rem] w-full bg-muted lg:h-[60vh]"
          aria-label="İlan haritası"
        />
      </div>

      {/* Sonuçlar */}
      <div className="mt-8">
        {initialLoading ? null : results.length === 0 ? (
          <div className="rounded-lg border border-dashed border-input bg-muted/50 py-12 text-center">
            <MapPin className="mx-auto h-8 w-8 text-brass-strong" aria-hidden="true" />
            <p className="mt-3 text-muted-foreground">
              {selected
                ? 'Çizdiğiniz bölgede ilan yok — bölgeyi genişletmeyi deneyin.'
                : 'Bu bölgede haritalı ilan yok — haritayı kaydırın veya uzaklaştırın.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((p) => (
              <Link
                key={p.slug}
                href={`/ilan/${p.slug}`}
                className={cn(
                  'group overflow-hidden rounded-lg border border-border bg-card shadow-soft-sm transition-colors hover:border-primary',
                )}
              >
                <div className="relative aspect-[16/10] bg-muted">
                  {p.img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbUrl(p.img) ?? p.img}
                      alt={p.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted-foreground">
                      <MapPin className="h-7 w-7" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="truncate font-heading text-[15px] font-semibold text-foreground">
                    {p.title}
                  </h3>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {p.district} · {p.area}
                  </p>
                  <p className="nums mt-1.5 font-heading text-[17px] font-bold text-foreground">
                    {p.price}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
