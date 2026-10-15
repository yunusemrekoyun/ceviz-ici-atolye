import { describe, expect, it, vi } from 'vitest';

// server-only paketi Next.js dışında (plain Node/Vitest) her zaman fırlatır;
// geo.ts findListingSlugsInPolygon için prisma'yı da import ediyor — ikisi de
// boş mock'lanır (saf pointsToWkt'yi test ediyoruz, DB/bundler gerekmez).
vi.mock('server-only', () => ({}));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { pointsToWkt } from '@/lib/geo';

describe('pointsToWkt', () => {
  it('üç noktadan kapalı bir WKT POLYGON üretir (lng lat sırası)', () => {
    const wkt = pointsToWkt([
      { lat: 39.42, lng: 29.5 },
      { lat: 39.5, lng: 29.6 },
      { lat: 39.3, lng: 29.6 },
    ]);
    expect(wkt).toBe('POLYGON((29.5 39.42, 29.6 39.5, 29.6 39.3, 29.5 39.42))');
  });

  it('halkayı kendiliğinden kapatır (ilk nokta sona eklenir)', () => {
    const wkt = pointsToWkt([
      { lat: 1, lng: 2 },
      { lat: 3, lng: 4 },
      { lat: 5, lng: 6 },
    ]);
    const coords = wkt?.match(/\(\((.+)\)\)/)?.[1].split(', ') ?? [];
    expect(coords[0]).toBe(coords[coords.length - 1]);
    expect(coords).toHaveLength(4);
  });

  it("3'ten az köşede null döner", () => {
    expect(pointsToWkt([])).toBeNull();
    expect(pointsToWkt([{ lat: 1, lng: 2 }])).toBeNull();
    expect(
      pointsToWkt([
        { lat: 1, lng: 2 },
        { lat: 3, lng: 4 },
      ]),
    ).toBeNull();
  });
});
