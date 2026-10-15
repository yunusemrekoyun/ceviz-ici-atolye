'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { ScreenHeader } from '../ScreenHeader';

interface Review {
  id: string;
  userName: string;
  rating: number;
  date: string;
  comment: string;
}
interface Summary {
  rating: number;
  count: number;
  source: string;
}

type Filter = 'all' | 'new' | 'top';

function relTime(dateStr: string, tr: boolean): string {
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return dateStr;
  const days = Math.floor((Date.now() - t) / 86400000);
  if (days <= 0) return tr ? 'bugün' : 'today';
  if (days < 7) return tr ? `${days} gün önce` : `${days} day${days > 1 ? 's' : ''} ago`;
  const w = Math.floor(days / 7);
  if (w < 5) return tr ? `${w} hafta önce` : `${w} week${w > 1 ? 's' : ''} ago`;
  const mo = Math.floor(days / 30);
  return tr ? `${mo} ay önce` : `${mo} month${mo > 1 ? 's' : ''} ago`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Stars({ rating, size = 18 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < Math.round(rating) ? 'fill-hotel-peach text-hotel-peach' : 'text-hotel-text-muted/40'}
        />
      ))}
    </div>
  );
}

// Reviews — design-refs/refs.pdf pages 11-12.
export function MobileReviews({ onBack }: { onBack: () => void }) {
  const { language } = useLanguage();
  const tr = language === 'tr';

  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    fetch('/api/public/reviews')
      .then((r) => r.json())
      .then((d) => {
        if (!d?.ok) return;
        if (d.summary) setSummary(d.summary);
        if (Array.isArray(d.reviews)) setReviews(d.reviews);
      })
      .catch(() => undefined);
  }, []);

  const avg =
    summary?.rating ?? (reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0);

  const dist = [5, 4, 3, 2, 1].map((star) => {
    const c = reviews.filter((r) => Math.round(r.rating) === star).length;
    return { star, pct: reviews.length ? Math.round((c / reviews.length) * 100) : 0 };
  });

  const sorted = [...reviews].sort((a, b) =>
    filter === 'new' ? Date.parse(b.date) - Date.parse(a.date) : filter === 'top' ? b.rating - a.rating : 0,
  );

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: tr ? 'Tümü' : 'All' },
    { id: 'new', label: tr ? 'En Yeni' : 'Newest' },
    { id: 'top', label: tr ? 'En Yüksek' : 'Top' },
  ];

  return (
    <div className="space-y-5 px-4 py-5">
      <ScreenHeader
        eyebrow={tr ? 'Yorumlar' : 'Reviews'}
        title={tr ? 'Misafir Değerlendirmeleri' : 'Guest Reviews'}
        onBack={onBack}
        backLabel={tr ? 'Geri' : 'Back'}
        size="h2"
      />

      {/* Big rating */}
      <div className="flex items-center gap-3">
        <span className="font-serif text-6xl font-bold leading-none text-hotel-peach">{avg.toFixed(1)}</span>
        <Stars rating={avg} size={24} />
      </div>

      {/* Distribution */}
      <div className="space-y-2">
        {dist.map((d) => (
          <div key={d.star} className="flex items-center gap-3">
            <span className="w-16 shrink-0 font-hotel text-sm text-hotel-text-muted">
              {d.star} {tr ? 'Yıldız' : 'Star'}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-hotel-surface-2">
              <div className="h-full rounded-full bg-hotel-peach" style={{ width: `${d.pct}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {filters.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-4 py-2 font-hotel text-sm transition-colors ${
                active
                  ? 'bg-hotel-beige text-hotel-text-on-beige'
                  : 'border border-hotel-border text-hotel-text-muted'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Review cards */}
      <div className="space-y-3">
        {sorted.map((r) => (
          <div key={r.id} className="card-hotel space-y-2 p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-hotel-peach font-hotel text-sm font-bold text-hotel-bg">
                {initials(r.userName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-hotel font-semibold text-hotel-text-primary">{r.userName}</p>
                <p className="font-hotel text-xs text-hotel-text-muted">{relTime(r.date, tr)}</p>
              </div>
              <Stars rating={r.rating} size={14} />
            </div>
            <p className="font-hotel text-sm leading-relaxed text-hotel-text-muted">{r.comment}</p>
          </div>
        ))}
        {reviews.length === 0 && (
          <p className="py-6 text-center font-hotel text-sm text-hotel-text-muted">
            {tr ? 'Henüz değerlendirme yok.' : 'No reviews yet.'}
          </p>
        )}
      </div>
    </div>
  );
}
