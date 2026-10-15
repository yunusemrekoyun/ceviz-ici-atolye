'use client';

import { useRef, useState, type ElementType } from 'react';
import {
  ChevronLeft, Wifi, Tv, Wind, Wine, Lock, Coffee, Car, Bath, Waves, Utensils, Check,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import type { RoomData } from '../types';

// Best-effort amenity → icon map (amenities are free-text, TR or EN).
function amenityIcon(name: string): ElementType {
  const s = name.toLowerCase();
  if (s.includes('wifi') || s.includes('wi-fi') || s.includes('internet')) return Wifi;
  if (s.includes('klima') || s.includes('air') || s.includes('a/c') || s === 'ac') return Wind;
  if (s.includes('tv') || s.includes('televiz')) return Tv;
  if (s.includes('minibar') || s.includes('mini bar') || s.includes('buzdolab') || s.includes('fridge')) return Wine;
  if (s.includes('kasa') || s.includes('safe')) return Lock;
  if (s.includes('kahvalt') || s.includes('breakfast') || s.includes('kahve') || s.includes('coffee')) return Coffee;
  if (s.includes('otopark') || s.includes('park') || s.includes('vale')) return Car;
  if (s.includes('havuz') || s.includes('pool') || s.includes('spa')) return Waves;
  if (s.includes('duş') || s.includes('banyo') || s.includes('bath') || s.includes('shower') || s.includes('saç') || s.includes('hair') || s.includes('fön')) return Bath;
  if (s.includes('restoran') || s.includes('restaurant') || s.includes('yemek')) return Utensils;
  return Check;
}

function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div>
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto rounded-2xl border border-hotel-border no-scrollbar"
      >
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={src}
            alt={alt}
            className="h-full w-full shrink-0 snap-start object-cover"
          />
        ))}
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {images.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? 'w-5 bg-hotel-peach' : 'w-1.5 bg-hotel-text-muted/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Room detail — design-refs/refs.pdf pages 3-4:
// gallery (dot indicator) + serif title + peach price + capacity + 2x3 amenity
// grid (dark surface + peach icon) + description + "Rezervasyon Yap" CTA.
export function MobileRoomDetail({
  room,
  onBack,
  onBook,
}: {
  room: RoomData | null;
  onBack: () => void;
  onBook: () => void;
}) {
  const { language } = useLanguage();
  const tr = language === 'tr';

  if (!room) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-serif text-2xl text-hotel-text-primary">
          {tr ? 'Oda bulunamadı' : 'Room not found'}
        </p>
        <button type="button" onClick={onBack} className="btn-hotel-outline px-6">
          {tr ? 'Geri' : 'Back'}
        </button>
      </div>
    );
  }

  const images = room.media
    .filter((m) => !m.mimeType.startsWith('video/'))
    .map((m) => `/uploads/${m.pathMedium ?? m.pathOriginal}`);
  const gallery = images.length > 0 ? images : ['/logo.png'];
  const amenities = (room.roomType?.amenities ?? []).slice(0, 6);

  return (
    <div className="space-y-5 px-4 py-5">
      {/* Gallery + back */}
      <div className="relative">
        <Gallery images={gallery} alt={room.name} />
        <button
          type="button"
          onClick={onBack}
          aria-label={tr ? 'Geri' : 'Back'}
          className="absolute left-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-hotel-text-primary backdrop-blur-sm"
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      {/* Title + price */}
      <div>
        {room.roomType?.name && <p className="hotel-eyebrow">{room.roomType.name}</p>}
        <h1 className="mt-1.5 font-serif text-[2.4rem] font-bold leading-[1.04] tracking-tight text-hotel-text-primary">
          {room.name}
        </h1>
        <p className="mt-1.5">
          <span className="text-2xl font-bold text-hotel-peach">
            ₺{room.basePrice.toLocaleString('tr-TR')}
          </span>{' '}
          <span className="font-hotel text-hotel-text-muted">{tr ? '/ gece' : '/ night'}</span>
        </p>
        <p className="mt-1 font-hotel text-sm text-hotel-text-muted">
          {room.maxAdults} {tr ? 'Kişilik' : 'Guests'}
        </p>
      </div>

      {/* Amenity grid — icon over a centered 2-line label (handles long names) */}
      {amenities.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {amenities.map((a, i) => {
            const Icon = amenityIcon(a);
            return (
              <div
                key={i}
                className="flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border border-hotel-border bg-hotel-surface px-2 py-3 text-center"
              >
                <Icon size={22} className="shrink-0 text-hotel-peach" strokeWidth={1.8} />
                <span className="font-hotel text-[11px] leading-tight text-hotel-text-primary line-clamp-2">
                  {a}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Description */}
      {room.description && (
        <p className="font-hotel text-sm leading-relaxed text-hotel-text-muted">
          {room.description}
        </p>
      )}

      {/* CTA */}
      <button type="button" onClick={onBook} className="btn-hotel">
        {tr ? 'Rezervasyon Yap' : 'Book Now'}
      </button>
    </div>
  );
}
