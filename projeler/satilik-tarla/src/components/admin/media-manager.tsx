'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Clapperboard, Loader2, Trash2, Upload } from 'lucide-react';
import { deleteMediaItem, moveMediaItem } from '@/app/admin/ilanlar/media-actions';
import { outlineBtn, primaryBtn } from './ui';

export type MediaItem = {
  id: string;
  type: 'image' | 'video';
  /** Küçük önizleme URL'i (görselde 480 webp ya da kaynak; videoda poster) */
  previewUrl: string | null;
  /** Yüklenmiş ama varyantları/posteri henüz üretilmemiş */
  processing: boolean;
  external: boolean;
};

const MAX_MEDIA = 25;

/** İlan galerisi: gerçek dosya yükleme + sıralama + silme. Harici URL
 * satırları formdaki textarea'dan yönetilir ve burada rozetle gösterilir. */
export function MediaManager({ listingId, items }: { listingId: string; items: MediaItem[] }) {
  const router = useRouter();
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const images = items.filter((i) => i.type === 'image');
  const video = items.find((i) => i.type === 'video') ?? null;
  const uploadedImages = images.filter((i) => !i.external);

  async function upload(files: FileList | null, type: 'image' | 'video') {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files);
    for (const [i, file] of list.entries()) {
      setBusy(`Yükleniyor ${i + 1}/${list.length} — ${file.name}`);
      try {
        const res = await fetch(
          `/api/admin/medya/${listingId}?type=${type}&filename=${encodeURIComponent(file.name)}`,
          { method: 'POST', body: file },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? 'Yükleme başarısız.');
          break;
        }
      } catch {
        setError('Bağlantı hatası — tekrar deneyin.');
        break;
      }
    }
    setBusy(null);
    router.refresh();
    // varyantlar worker'da üretilir; kısa bir gecikmeyle bir kez daha tazele
    setTimeout(() => router.refresh(), 2500);
  }

  function mutate(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await fn();
      setError(result.ok ? null : (result.error ?? 'İşlem başarısız.'));
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => imageInput.current?.click()}
          disabled={!!busy || items.length >= MAX_MEDIA}
          className={primaryBtn}
        >
          <Upload size={15} />
          Görsel Yükle
        </button>
        <button
          type="button"
          onClick={() => videoInput.current?.click()}
          disabled={!!busy || !!video || items.length >= MAX_MEDIA}
          className={outlineBtn}
          title={video ? 'Önce mevcut videoyu silin' : undefined}
        >
          <Clapperboard size={15} />
          {video ? 'Video mevcut' : 'Drone Videosu Yükle (mp4)'}
        </button>
        <span className="text-xs text-[#4b5b47]">
          {items.length}/{MAX_MEDIA} öğe · jpg/png/webp ≤20MB · mp4 ≤500MB
        </span>
        <input
          ref={imageInput}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          multiple
          hidden
          onChange={(e) => {
            void upload(e.target.files, 'image');
            e.target.value = '';
          }}
        />
        <input
          ref={videoInput}
          type="file"
          accept=".mp4,video/mp4"
          hidden
          onChange={(e) => {
            void upload(e.target.files, 'video');
            e.target.value = '';
          }}
        />
      </div>

      {busy ? (
        <p className="flex items-center gap-2 text-sm text-[#3d5638]">
          <Loader2 size={15} className="animate-spin" />
          {busy}
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#D9E3D5] bg-white/60 p-6 text-center text-sm text-[#4b5b47]">
          Henüz medya yok — çekim görsellerini buradan yükleyin.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {images.map((item, i) => (
            <li
              key={item.id}
              className="group relative overflow-hidden rounded-xl border border-[#D9E3D5] bg-white"
            >
              <div className="relative aspect-[4/3] bg-[#F4EFE6]">
                {item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.previewUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : null}
                {i === 0 ? (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-[#1f2a1d]/80 px-2 py-0.5 text-[10px] font-semibold text-[#FAF7EF]">
                    KAPAK
                  </span>
                ) : null}
                {item.external ? (
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-[#8A6A43]/85 px-2 py-0.5 text-[10px] font-semibold text-[#FAF7EF]">
                    URL
                  </span>
                ) : null}
                {item.processing ? (
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-[#1f2a1d]/70 py-1 text-[11px] text-[#FAF7EF]">
                    <Loader2 size={11} className="animate-spin" />
                    İşleniyor
                  </span>
                ) : null}
              </div>
              {!item.external ? (
                <div className="flex items-center justify-between px-1.5 py-1">
                  <div className="flex">
                    <button
                      type="button"
                      aria-label="Öne taşı"
                      disabled={pending || uploadedImages[0]?.id === item.id}
                      onClick={() => mutate(() => moveMediaItem(item.id, 'up'))}
                      className="grid h-7 w-7 place-items-center rounded-md text-[#2d3a2a] hover:bg-[#1f2a1d]/5 disabled:opacity-30"
                    >
                      <ArrowLeft size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label="Arkaya taşı"
                      disabled={
                        pending || uploadedImages[uploadedImages.length - 1]?.id === item.id
                      }
                      onClick={() => mutate(() => moveMediaItem(item.id, 'down'))}
                      className="grid h-7 w-7 place-items-center rounded-md text-[#2d3a2a] hover:bg-[#1f2a1d]/5 disabled:opacity-30"
                    >
                      <ArrowRight size={14} />
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-label="Görseli sil"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm('Bu görseli silmek istediğinize emin misiniz?')) return;
                      mutate(() => deleteMediaItem(item.id));
                    }}
                    className="grid h-7 w-7 place-items-center rounded-md text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <p className="px-2 py-1.5 text-[11px] leading-tight text-[#4b5b47]">
                  Formdaki URL listesinden yönetilir
                </p>
              )}
            </li>
          ))}

          {video ? (
            <li className="relative overflow-hidden rounded-xl border border-[#D9E3D5] bg-white">
              <div className="relative aspect-[4/3] bg-[#1f2a1d]">
                {video.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={video.previewUrl}
                    alt=""
                    className="h-full w-full object-cover opacity-80"
                  />
                ) : null}
                <span className="absolute inset-0 grid place-items-center">
                  <Clapperboard size={22} className="text-[#FAF7EF]" />
                </span>
                {video.processing ? (
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-[#1f2a1d]/70 py-1 text-[11px] text-[#FAF7EF]">
                    <Loader2 size={11} className="animate-spin" />
                    İşleniyor
                  </span>
                ) : null}
              </div>
              {!video.external ? (
                <div className="flex items-center justify-end px-1.5 py-1">
                  <button
                    type="button"
                    aria-label="Videoyu sil"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm('Videoyu silmek istediğinize emin misiniz?')) return;
                      mutate(() => deleteMediaItem(video.id));
                    }}
                    className="grid h-7 w-7 place-items-center rounded-md text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <p className="px-2 py-1.5 text-[11px] leading-tight text-[#4b5b47]">
                  Formdaki video URL alanından yönetilir
                </p>
              )}
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
