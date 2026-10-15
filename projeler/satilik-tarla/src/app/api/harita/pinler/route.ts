import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getMapPointsInBounds, MAP_POINTS_LIMIT } from '@/lib/data';

const querySchema = z.object({
  minLat: z.coerce.number().min(-90).max(90),
  maxLat: z.coerce.number().min(-90).max(90),
  minLng: z.coerce.number().min(-180).max(180),
  maxLng: z.coerce.number().min(-180).max(180),
});

/** Haritanın görünür alanındaki (viewport) aktif ilan pinleri — pan/zoom'da
 * çağrılır, tüm ilanları tek seferde göndermek yerine yalnızca görünen
 * bölgeyi yükler (bkz. src/lib/data.ts getMapPointsInBounds).
 * GET /api/harita/pinler?minLat=&maxLat=&minLng=&maxLng= → { points, truncated } */
export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz sınırlar.' }, { status: 400 });
  }
  const { minLat, maxLat, minLng, maxLng } = parsed.data;
  if (minLat > maxLat || minLng > maxLng) {
    return NextResponse.json({ error: 'Geçersiz sınırlar.' }, { status: 400 });
  }
  const points = await getMapPointsInBounds({ minLat, maxLat, minLng, maxLng });
  return NextResponse.json({ points, truncated: points.length >= MAP_POINTS_LIMIT });
}
