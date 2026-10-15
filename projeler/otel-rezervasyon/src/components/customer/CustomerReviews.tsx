'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BedDouble, CheckCircle2, Clock, Send, Star, XCircle } from 'lucide-react';
import type { AuthUser } from '@/lib/auth/session';

interface ReviewItem {
  reservation: {
    id: string;
    confirmationId: string;
    roomName: string;
    roomTypeName: string;
    checkInDate: string;
    checkOutDate: string;
  };
  review: {
    id: string;
    rating: number;
    comment: string;
    status: string;
    createdAt: string;
    approvedAt: string | null;
  } | null;
}

function formatDate(value: string, tr: boolean) {
  return new Date(value.slice(0, 10) + 'T12:00:00').toLocaleDateString(tr ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function statusMeta(status: string, tr: boolean) {
  switch (status) {
    case 'approved':
      return { label: tr ? 'Yayında' : 'Published', Icon: CheckCircle2, cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' };
    case 'rejected':
      return { label: tr ? 'Yayına alınmadı' : 'Not published', Icon: XCircle, cls: 'text-red-400 bg-red-400/10 border-red-400/20' };
    default:
      return { label: tr ? 'Onay bekliyor' : 'Awaiting approval', Icon: Clock, cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20' };
  }
}

export function CustomerReviews({ user, tr, focusConfirmationId }: { user: AuthUser; tr: boolean; focusConfirmationId?: string | null }) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/account/reviews')
      .then((response) => response.json())
      .then((payload) => {
        if (payload.ok) {
          setItems(payload.items);
          const focused = focusConfirmationId
            ? (payload.items as ReviewItem[]).find((item) => item.reservation.confirmationId === focusConfirmationId)
            : null;
          if (focused && !focused.review) setActiveId(focused.reservation.id);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [focusConfirmationId, user.id]);

  const reviewedCount = useMemo(() => items.filter((item) => item.review).length, [items]);

  async function submitReview(reservationId: string) {
    setError('');
    if (comment.trim().length < 10) {
      setError(tr ? 'Yorum en az 10 karakter olmalı.' : 'Review must be at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/account/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId, rating, comment }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || (tr ? 'Yorum kaydedilemedi.' : 'Review could not be saved.'));
      }

      setItems((prev) => prev.map((item) => (
        item.reservation.id === reservationId
          ? { ...item, review: payload.review }
          : item
      )));
      setActiveId(null);
      setRating(5);
      setComment('');
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : (tr ? 'Yorum kaydedilemedi.' : 'Review could not be saved.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="surface-panel p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-main flex items-center gap-2">
              <Star size={14} className="text-brand-accent" />
              {tr ? 'Konaklama Yorumlarım' : 'My Stay Reviews'}
            </h3>
            <p className="text-xs text-muted mt-1">
              {tr
                ? 'Tamamlanan konaklamalarınız için kısa bir yorum bırakabilirsiniz. Yorumlar yayınlanmadan önce kontrol edilir.'
                : 'Leave a short review for completed stays. Reviews are checked before publication.'}
            </p>
          </div>
          <span className="rounded-full border border-m-border bg-m-surface2 px-3 py-1 text-[10px] text-muted">
            {reviewedCount}/{items.length} {tr ? 'yorum' : 'reviewed'}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="surface-panel p-8 text-center text-sm text-subtle">
          {tr ? 'Yorum alanı yükleniyor…' : 'Loading reviews…'}
        </div>
      ) : items.length === 0 ? (
        <div className="surface-panel p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-m-border bg-m-surface2">
            <BedDouble size={20} className="text-subtle" />
          </div>
          <p className="text-sm text-muted">
            {tr ? 'Yorum bırakabileceğiniz tamamlanmış konaklama bulunmuyor.' : 'No completed stays are ready for review yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isActive = activeId === item.reservation.id;
            const meta = item.review ? statusMeta(item.review.status, tr) : null;
            const StatusIcon = meta?.Icon;

            return (
              <motion.div
                key={item.reservation.id}
                layout
                className={`surface-card p-4 ${focusConfirmationId === item.reservation.confirmationId ? 'border-brand-accent/35' : ''}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-accent/20 bg-brand-accent/10">
                        <BedDouble size={15} className="text-brand-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-main">{item.reservation.roomName}</p>
                        <p className="text-[11px] text-subtle">{item.reservation.roomTypeName} · {item.reservation.confirmationId}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      {formatDate(item.reservation.checkInDate, tr)} → {formatDate(item.reservation.checkOutDate, tr)}
                    </p>
                  </div>

                  {item.review && meta && StatusIcon ? (
                    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold ${meta.cls}`}>
                      <StatusIcon size={11} />
                      {meta.label}
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setActiveId(isActive ? null : item.reservation.id);
                        setError('');
                      }}
                      className="btn-primary rounded-lg px-3 py-2 text-xs"
                    >
                      {tr ? 'Yorum Yaz' : 'Write Review'}
                    </button>
                  )}
                </div>

                {item.review && (
                  <div className="mt-4 rounded-xl border border-m-border bg-m-surface2 p-3">
                    <div className="mb-2 flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          size={13}
                          className={index < item.review!.rating ? 'fill-brand-accent text-brand-accent' : 'text-subtle'}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted leading-relaxed">"{item.review.comment}"</p>
                    {item.review.status === 'pending' && (
                      <p className="mt-2 text-[11px] text-amber-400">
                        {tr ? 'Yorumunuz kontrol edildikten sonra yayınlanacak.' : 'Your review will be published after moderation.'}
                      </p>
                    )}
                  </div>
                )}

                {isActive && !item.review && (
                  <div className="mt-4 rounded-xl border border-brand-accent/20 bg-brand-accent/8 p-4 space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-subtle mb-2">{tr ? 'Puanınız' : 'Your rating'}</p>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setRating(index + 1)}
                            className="rounded-lg p-1 hover:bg-m-hover"
                          >
                            <Star
                              size={20}
                              className={index < rating ? 'fill-brand-accent text-brand-accent' : 'text-subtle'}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      className="control-base min-h-24 resize-none px-3 py-2 text-sm"
                      placeholder={tr ? 'Konaklamanızla ilgili kısa bir yorum yazın…' : 'Write a short note about your stay…'}
                    />
                    {error && <p className="text-xs text-red-400">{error}</p>}
                    <div className="flex justify-end">
                      <button
                        onClick={() => submitReview(item.reservation.id)}
                        disabled={submitting}
                        className="btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs disabled:opacity-60"
                      >
                        <Send size={12} />
                        {submitting ? (tr ? 'Gönderiliyor…' : 'Sending…') : (tr ? 'Yorumu Gönder' : 'Submit Review')}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
