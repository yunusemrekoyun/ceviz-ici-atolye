'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, RefreshCw, RotateCcw, Star, XCircle } from 'lucide-react';

interface AdminReview {
  id: string;
  rating: number;
  comment: string;
  status: string;
  source: string;
  createdAt: string;
  approvedAt: string | null;
  user: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  reservation: {
    confirmationId: string;
    firstName: string;
    lastName: string;
    email: string;
    checkInDate: string;
    checkOutDate: string;
    roomName: string;
    roomTypeName: string;
  };
}

type Filter = 'all' | 'pending' | 'approved' | 'rejected';

const FILTERS: { id: Filter; tr: string; en: string }[] = [
  { id: 'all', tr: 'Tümü', en: 'All' },
  { id: 'pending', tr: 'Onay Bekleyen', en: 'Pending' },
  { id: 'approved', tr: 'Yayında', en: 'Published' },
  { id: 'rejected', tr: 'Reddedilen', en: 'Rejected' },
];

function statusMeta(status: string, tr: boolean) {
  switch (status) {
    case 'approved':
      return { label: tr ? 'Yayında' : 'Published', Icon: CheckCircle2, cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' };
    case 'rejected':
      return { label: tr ? 'Reddedildi' : 'Rejected', Icon: XCircle, cls: 'text-red-400 bg-red-400/10 border-red-400/20' };
    default:
      return { label: tr ? 'Onay bekliyor' : 'Pending', Icon: Clock, cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20' };
  }
}

function guestName(review: AdminReview) {
  return `${review.reservation.firstName} ${review.reservation.lastName}`.trim();
}

export function AdminReviewsPanel({ tr }: { tr: boolean }) {
  const [filter, setFilter] = useState<Filter>('pending');
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    fetch('/api/reviews')
      .then((response) => response.json())
      .then((payload) => { if (payload.ok) setReviews(payload.reviews.filter(Boolean)); })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => ({
    pending: reviews.filter((review) => review.status === 'pending').length,
    approved: reviews.filter((review) => review.status === 'approved').length,
    rejected: reviews.filter((review) => review.status === 'rejected').length,
  }), [reviews]);

  const visibleReviews = useMemo(() => (
    filter === 'all' ? reviews : reviews.filter((review) => review.status === filter)
  ), [filter, reviews]);

  async function updateStatus(id: string, action: 'approve' | 'reject' | 'reset') {
    setActionId(id);
    try {
      const response = await fetch('/api/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const payload = await response.json().catch(() => null);
      if (response.ok && payload?.ok) {
        setReviews((prev) => prev.map((review) => review.id === id ? payload.review : review));
      }
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: tr ? 'Onay Bekleyen' : 'Pending', value: counts.pending, cls: 'text-amber-400' },
          { label: tr ? 'Yayındaki Yorum' : 'Published', value: counts.approved, cls: 'text-emerald-400' },
          { label: tr ? 'Reddedilen' : 'Rejected', value: counts.rejected, cls: 'text-red-400' },
        ].map((item) => (
          <div key={item.label} className="surface-card p-4">
            <p className={`text-2xl font-black tabular-nums ${item.cls}`}>{item.value}</p>
            <p className="text-[11px] text-subtle mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="tab-list w-fit max-w-full overflow-x-auto no-scrollbar">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`tab-item shrink-0 ${filter === item.id ? 'tab-item-active' : ''}`}
            >
              {tr ? item.tr : item.en}
            </button>
          ))}
        </div>
        <button onClick={() => load()} className="btn-secondary h-9 px-3 text-xs">
          <RefreshCw size={13} />
          {tr ? 'Yenile' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="surface-panel p-10 text-center text-sm text-subtle">
          {tr ? 'Yorumlar yükleniyor…' : 'Loading reviews…'}
        </div>
      ) : visibleReviews.length === 0 ? (
        <div className="surface-panel p-10 text-center">
          <Star size={24} className="mx-auto text-subtle mb-3" />
          <p className="text-sm text-muted">
            {tr ? 'Bu filtrede yorum bulunmuyor.' : 'No reviews in this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleReviews.map((review) => {
            const meta = statusMeta(review.status, tr);
            const StatusIcon = meta.Icon;

            return (
              <div key={review.id} className="surface-card p-4">
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-main">{guestName(review)}</p>
                      <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${meta.cls}`}>
                        <StatusIcon size={10} />
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-subtle font-mono">#{review.reservation.confirmationId}</span>
                    </div>
                    <p className="text-[11px] text-subtle mt-1">
                      {review.reservation.roomName} · {review.reservation.roomTypeName} · {review.reservation.email}
                    </p>
                    <div className="mt-3 flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          size={14}
                          className={index < review.rating ? 'fill-brand-accent text-brand-accent' : 'text-subtle'}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-sm text-muted leading-relaxed">"{review.comment}"</p>
                    <p className="mt-2 text-[10px] text-subtle">
                      {new Date(review.createdAt).toLocaleDateString(tr ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>

                  <div className="flex flex-wrap xl:justify-end gap-2">
                    {review.status !== 'approved' && (
                      <button
                        onClick={() => updateStatus(review.id, 'approve')}
                        disabled={actionId === review.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/18 disabled:opacity-50"
                      >
                        <CheckCircle2 size={12} />
                        {tr ? 'Onayla' : 'Approve'}
                      </button>
                    )}
                    {review.status !== 'rejected' && (
                      <button
                        onClick={() => updateStatus(review.id, 'reject')}
                        disabled={actionId === review.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/18 disabled:opacity-50"
                      >
                        <XCircle size={12} />
                        {tr ? 'Reddet' : 'Reject'}
                      </button>
                    )}
                    {review.status !== 'pending' && (
                      <button
                        onClick={() => updateStatus(review.id, 'reset')}
                        disabled={actionId === review.id}
                        className="btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs disabled:opacity-50"
                      >
                        <RotateCcw size={12} />
                        {tr ? 'Onaya Al' : 'Reset'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
