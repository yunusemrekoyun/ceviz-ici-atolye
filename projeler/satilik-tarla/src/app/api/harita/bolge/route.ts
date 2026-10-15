import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { findListingSlugsInPolygon } from '@/lib/geo';

const bodySchema = z.object({
  points: z
    .array(
      z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      }),
    )
    .min(3)
    .max(200),
});

/** Haritada çizilen bölgenin içindeki aktif ilanlar — sunucu tarafında
 * PostGIS ST_Within ile (bkz. src/lib/geo.ts). Yanıt yalnızca slug listesi:
 * istemci başlık/fiyat/görsel gibi alanları zaten SSR'dan aldığı `points`
 * dizisinden süzer, burada tekrar taşınmaz.
 * POST /api/harita/bolge → { slugs: string[] } */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz bölge.' }, { status: 400 });
  }
  const slugs = await findListingSlugsInPolygon(parsed.data.points);
  return NextResponse.json({ slugs });
}
