'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, X } from 'lucide-react';
import {
  applyPriceRequest,
  approveListing,
  rejectListing,
  rejectPriceRequest,
} from '@/app/admin/actions';
import { inputClass, primaryBtn, dangerBtn, outlineBtn } from './ui';
import { cn } from '@/lib/utils';
import type { ActionResult } from '@/lib/action-result';

/** Bekleyen başvuru satırının onay/red aksiyonları. */
export function ModerationActions({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectState, rejectAction] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      const result = await rejectListing(listingId, prev, formData);
      if (result.ok) router.refresh();
      return result;
    },
    { ok: false },
  );

  function approve() {
    startTransition(async () => {
      const result = await approveListing(listingId);
      setError(result.ok ? null : (result.error ?? 'İşlem başarısız.'));
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={approve} disabled={pending} className={primaryBtn}>
          <Check size={15} />
          Onayla — Çekime Al
        </button>
        <button type="button" onClick={() => setRejectOpen((v) => !v)} className={dangerBtn}>
          <X size={15} />
          Reddet
          <ChevronDown
            size={14}
            className={cn('transition-transform', rejectOpen && 'rotate-180')}
          />
        </button>
        {error ? <span className="text-sm text-red-600">{error}</span> : null}
      </div>

      {rejectOpen ? (
        <form action={rejectAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            name="reason"
            placeholder="Üyeye gösterilecek red nedeni…"
            className={cn(inputClass, 'flex-1')}
            required
          />
          <button type="submit" className={dangerBtn}>
            Reddi Gönder
          </button>
        </form>
      ) : null}
      {rejectOpen && !rejectState.ok && rejectState.fieldErrors?.reason ? (
        <p className="mt-1 text-xs text-red-600">{rejectState.fieldErrors.reason[0]}</p>
      ) : null}
      {rejectOpen && !rejectState.ok && rejectState.error ? (
        <p className="mt-1 text-xs text-red-600">{rejectState.error}</p>
      ) : null}
    </div>
  );
}

/** Fiyat talebi satırının uygula/reddet aksiyonları. */
export function PriceRequestActions({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: (id: string) => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await fn(requestId);
      setError(result.ok ? null : (result.error ?? 'İşlem başarısız.'));
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => run(applyPriceRequest)}
        disabled={pending}
        className={primaryBtn}
      >
        <Check size={15} />
        Uygula
      </button>
      <button
        type="button"
        onClick={() => run(rejectPriceRequest)}
        disabled={pending}
        className={outlineBtn}
      >
        Reddet
      </button>
      {error ? <span className="text-sm text-red-600">{error}</span> : null}
    </div>
  );
}
