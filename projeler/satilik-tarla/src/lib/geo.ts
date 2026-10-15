import 'server-only';
import { prisma } from './prisma';

export type LatLng = { lat: number; lng: number };

/** Kapalı bir halka WKT POLYGON'a çevirir (lng lat sırası — PostGIS x/y).
 * 3'ten az köşe geçersiz sonuç üretir (poligon değil). */
export function pointsToWkt(points: LatLng[]): string | null {
  if (points.length < 3) return null;
  const ring = [...points, points[0]].map((p) => `${p.lng} ${p.lat}`).join(', ');
  return `POLYGON((${ring}))`;
}

/** Çizilen bölge içindeki aktif ilanların slug'ları — ST_Within, geom
 * kolonundaki GIST index'i kullanır (bkz. migration faz6_harita_postgis).
 * Poligon geçersizse (< 3 köşe) boş dizi döner. */
export async function findListingSlugsInPolygon(points: LatLng[]): Promise<string[]> {
  const wkt = pointsToWkt(points);
  if (!wkt) return [];
  const rows = await prisma.$queryRaw<{ slug: string }[]>`
    SELECT slug FROM "Listing"
    WHERE status = 'aktif'
      AND geom IS NOT NULL
      AND ST_Within(geom, ST_SetSRID(ST_GeomFromText(${wkt}), 4326))
  `;
  return rows.map((r) => r.slug);
}
