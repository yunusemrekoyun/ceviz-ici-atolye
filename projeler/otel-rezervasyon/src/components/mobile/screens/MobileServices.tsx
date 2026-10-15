'use client';

import { useEffect, useState, type ElementType, type ReactNode } from 'react';
import {
  ChevronRight,
  Coffee,
  ConciergeBell,
  MapPin,
  Sparkles,
  Star,
  Wifi,
  Wind,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { ScreenHeader } from '../ScreenHeader';
import { roomImage, type RoomData } from '../types';

// Services hub — the bottom-tab "Services" entry groups Reviews + Contact
// (agreed routing; the PDF ships these as separate screens). Image-backed
// entry cards + hotel facilities grid in the Home/RoomDetail editorial language.
export function MobileServices({
  rooms,
  onReviews,
  onContact,
}: {
  rooms: RoomData[];
  onReviews: () => void;
  onContact: () => void;
}) {
  const { language } = useLanguage();
  const tr = language === 'tr';

  // Live rating teaser for the reviews card (same endpoint MobileReviews uses).
  const [summary, setSummary] = useState<{ rating: number; count: number } | null>(null);
  useEffect(() => {
    fetch('/api/public/reviews')
      .then((r) => r.json())
      .then((d) => {
        if (d?.summary) {
          setSummary({ rating: d.summary.rating, count: d.summary.count });
        } else if (Array.isArray(d?.reviews) && d.reviews.length) {
          const avg = d.reviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / d.reviews.length;
          setSummary({ rating: avg, count: d.reviews.length });
        }
      })
      .catch(() => undefined);
  }, []);

  const images = rooms.map(roomImage).filter(Boolean) as string[];

  const facilities: { icon: ElementType; label: string }[] = [
    { icon: Wifi, label: tr ? 'Ücretsiz Wi-Fi' : 'Free Wi-Fi' },
    { icon: Coffee, label: tr ? 'Kahvaltı Seçeneği' : 'Breakfast Option' },
    { icon: ConciergeBell, label: tr ? '7/24 Resepsiyon' : '24/7 Reception' },
    { icon: Sparkles, label: tr ? 'Günlük Temizlik' : 'Daily Housekeeping' },
    { icon: Wind, label: tr ? 'Klima' : 'Air Conditioning' },
    { icon: MapPin, label: tr ? 'Merkezi Konum' : 'Central Location' },
  ];

  return (
    <div className="space-y-6 px-4 py-5">
      <ScreenHeader eyebrow={tr ? 'Otel' : 'Hotel'} title={tr ? 'Hizmetler' : 'Services'} />

      <div className="space-y-4">
        <HubCard
          image={images[0] ?? null}
          eyebrow={tr ? 'Yorumlar' : 'Reviews'}
          title={tr ? 'Misafir Değerlendirmeleri' : 'Guest Reviews'}
          onClick={onReviews}
        >
          {summary ? (
            <span className="mt-1.5 flex items-center gap-2">
              <Star size={15} className="fill-hotel-peach text-hotel-peach" />
              <span className="font-hotel text-sm text-hotel-text-primary">
                <span className="font-semibold text-hotel-peach">{summary.rating.toFixed(1)}</span>
                {' · '}
                {summary.count} {tr ? 'değerlendirme' : 'reviews'}
              </span>
            </span>
          ) : (
            <span className="mt-1.5 block font-hotel text-sm text-hotel-text-muted">
              {tr ? 'Puanlar ve yorumlar' : 'Ratings & reviews'}
            </span>
          )}
        </HubCard>

        <HubCard
          image={images[1] ?? images[0] ?? null}
          eyebrow={tr ? 'İletişim' : 'Contact'}
          title={tr ? 'İletişim & Konum' : 'Contact & Location'}
          onClick={onContact}
        >
          <span className="mt-1.5 block font-hotel text-sm text-hotel-text-muted">
            {tr ? 'Adres, telefon, mesaj' : 'Address, phone, message'}
          </span>
        </HubCard>
      </div>

      {/* Hotel-level facilities (RoomDetail amenity-tile language) */}
      <div className="space-y-4">
        <div>
          <p className="hotel-eyebrow">{tr ? 'Konfor' : 'Comfort'}</p>
          <h2 className="mt-1.5 font-serif text-[2rem] font-bold leading-none tracking-tight text-hotel-text-primary">
            {tr ? 'Otel Olanakları' : 'Hotel Facilities'}
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {facilities.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border border-hotel-border bg-hotel-surface px-2 py-3 text-center"
            >
              <Icon size={22} className="shrink-0 text-hotel-peach" strokeWidth={1.8} />
              <span className="font-hotel text-[11px] leading-tight text-hotel-text-primary line-clamp-2">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Full-bleed image entry card: photo + dark gradient + eyebrow/serif title +
// peach chevron pill (Home atmosphere-section language).
function HubCard({
  image,
  eyebrow,
  title,
  onClick,
  children,
}: {
  image: string | null;
  eyebrow: string;
  title: string;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative block h-48 w-full overflow-hidden rounded-3xl border border-hotel-border text-left transition-transform active:scale-[0.99]"
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-hotel-surface-2" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-hotel-bg via-hotel-bg/45 to-hotel-bg/10" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="hotel-eyebrow">{eyebrow}</p>
          <p className="mt-1 font-serif text-2xl font-bold leading-tight text-hotel-text-primary drop-shadow-lg">
            {title}
          </p>
          {children}
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-hotel-peach text-hotel-bg shadow-lg shadow-hotel-peach/25">
          <ChevronRight size={19} />
        </span>
      </div>
    </button>
  );
}
