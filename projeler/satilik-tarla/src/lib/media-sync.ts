import type { Prisma } from '@prisma/client';

const MAX_MEDIA = 25; // PDD: ilan başına en fazla 25 medya öğesi

type Tx = Prisma.TransactionClient;

// Boş url = yüklemesi henüz tamamlanmamış satır (upload route önce satırı
// açar) — harici sayılıp SİLİNMEMELİ; yüklenen sınıfında değerlendirilir.
const isUploaded = (url: string) => url === '' || url.startsWith('/m/');

/** Admin formundaki HARİCİ görsel URL listesi + video URL'ini Media satırlarıyla
 * senkronlar. YALNIZCA harici (URL ile girilmiş) satırları yönetir — yüklenen
 * dosyalar (/m/ altı) galeri yöneticisine aittir, buradan asla silinmez/taşınmaz.
 * Harici görseller yüklenenlerin ARKASINA sıralanır. $transaction içinde çağrılmalı. */
export async function syncListingMedia(
  tx: Tx,
  listingId: string,
  imageUrls: string[],
  videoUrl?: string,
) {
  const images = imageUrls
    .map((u) => u.trim())
    .filter(Boolean)
    .filter((u) => !isUploaded(u)); // /m/ URL'i elle girilirse yok say — yönetimi galeride
  const video = videoUrl?.trim() || null;

  const existing = await tx.media.findMany({
    where: { listingId },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  });
  const urlOf = (m: (typeof existing)[number]) =>
    ((m.variants as { url?: string }[] | null)?.[0]?.url ?? '').trim();

  const uploadedImages = existing.filter((m) => m.type === 'image' && isUploaded(urlOf(m)));
  const externalImages = existing.filter((m) => m.type === 'image' && !isUploaded(urlOf(m)));
  const uploadedVideo = existing.find((m) => m.type === 'video' && isUploaded(urlOf(m))) ?? null;
  const externalVideo = existing.find((m) => m.type === 'video' && !isUploaded(urlOf(m))) ?? null;

  const total = uploadedImages.length + images.length + (uploadedVideo || video ? 1 : 0);
  if (total > MAX_MEDIA) {
    throw new Error(`En fazla ${MAX_MEDIA} medya öğesi eklenebilir (şu an ${total}).`);
  }

  // Listeden çıkarılan HARİCİ görseller silinir (yüklenenlere dokunulmaz)
  const keep = new Set(images);
  const byUrl = new Map(externalImages.map((m) => [urlOf(m), m]));
  const toDelete = externalImages.filter((m) => !keep.has(urlOf(m))).map((m) => m.id);
  if (toDelete.length) {
    await tx.media.deleteMany({ where: { id: { in: toDelete } } });
  }

  // Harici görseller yüklenenlerin arkasından başlar
  const offset = uploadedImages.length;
  for (const [i, url] of images.entries()) {
    const current = byUrl.get(url);
    const position = offset + i;
    if (current) {
      if (current.position !== position) {
        await tx.media.update({ where: { id: current.id }, data: { position } });
      }
    } else {
      await tx.media.create({
        data: {
          listingId,
          type: 'image',
          variants: [{ width: 0, format: 'source', url }],
          position,
        },
      });
    }
  }

  // Video: yüklenen video varsa alan yönetilmez (galeriden silinmeli);
  // yoksa harici URL tek satır olarak güncellenir/oluşturulur/kaldırılır.
  if (uploadedVideo) return;
  const videoPosition = offset + images.length;
  if (video && !isUploaded(video)) {
    if (externalVideo) {
      await tx.media.update({
        where: { id: externalVideo.id },
        data: {
          variants: [{ width: 0, format: 'mp4', url: video }],
          position: videoPosition,
        },
      });
    } else {
      await tx.media.create({
        data: {
          listingId,
          type: 'video',
          variants: [{ width: 0, format: 'mp4', url: video }],
          position: videoPosition,
        },
      });
    }
  } else if (externalVideo) {
    await tx.media.delete({ where: { id: externalVideo.id } });
  }
}
