'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, ExternalLink, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ListingApplicationForm, type ApplicationDefaults } from './listing-application-form';
import { cn } from '@/lib/utils';
import type { ActionResult } from '@/lib/action-result';
import {
  requestPriceUpdate,
  resubmitListing,
  setMyListingStatus,
} from '@/app/(site)/hesap/ilanlarim/actions';

const TONE_CLASSES: Record<string, string> = {
  muted: 'bg-secondary text-secondary-foreground',
  info: 'bg-[hsl(210_60%_92%)] text-[hsl(210_50%_25%)]',
  warning: 'bg-[hsl(40_80%_90%)] text-[hsl(35_60%_28%)]',
  success: 'bg-[hsl(150_45%_88%)] text-[hsl(154_42%_20%)]',
  danger: 'bg-[hsl(4_70%_93%)] text-[hsl(4_60%_35%)]',
};

export type MyListing = {
  id: string;
  slug: string;
  title: string;
  district: string;
  price: string;
  area: string;
  status: string;
  statusLabel: string;
  statusTone: string;
  statusNote?: string;
  rejectReason?: string | null;
  coverUrl?: string | null;
  hasPendingPriceRequest: boolean;
  defaults: ApplicationDefaults;
};

const fieldLabel =
  'mb-2 block text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-foreground';

export function MyListingCard({ listing, districts }: { listing: MyListing; districts: string[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [priceOpen, setPriceOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [priceState, setPriceState] = useState<ActionResult | null>(null);

  function mutateStatus(target: 'satildi' | 'kiralandi' | 'pasif' | 'aktif') {
    startTransition(async () => {
      await setMyListingStatus(listing.id, target);
      router.refresh();
    });
  }

  async function submitPrice(formData: FormData) {
    const result = await requestPriceUpdate(listing.id, { ok: false }, formData);
    setPriceState(result);
    if (result.ok) {
      setPriceOpen(false);
      router.refresh();
    }
  }

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card shadow-soft-sm">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="h-20 w-full shrink-0 overflow-hidden rounded-md bg-muted sm:w-28">
          {listing.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground">
              <MapPin className="h-6 w-6" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]',
                TONE_CLASSES[listing.statusTone] ?? TONE_CLASSES.muted,
              )}
            >
              {listing.statusLabel}
            </span>
            {listing.hasPendingPriceRequest ? (
              <span className="rounded-full bg-brass/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-brass-strong">
                Fiyat talebi inceleniyor
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 truncate font-heading text-[17px] font-semibold text-foreground">
            {listing.title}
          </h3>
          <p className="nums mt-1 text-[14px] text-muted-foreground">
            {listing.district} · {listing.area} · {listing.price}
          </p>
          {listing.statusNote ? (
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              {listing.statusNote}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {listing.status === 'aktif' ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/ilan/${listing.slug}`} target="_blank">
                  <ExternalLink className="h-4 w-4" />
                  Görüntüle
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => mutateStatus('satildi')}
              >
                Satıldı
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => mutateStatus('kiralandi')}
              >
                Kiralandı
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => mutateStatus('pasif')}
              >
                Pasife Al
              </Button>
              {!listing.hasPendingPriceRequest ? (
                <Button variant="outline" size="sm" onClick={() => setPriceOpen((v) => !v)}>
                  Fiyat Güncelle
                  <ChevronDown
                    className={cn('h-4 w-4 transition-transform', priceOpen && 'rotate-180')}
                  />
                </Button>
              ) : null}
            </>
          ) : null}

          {listing.status === 'pasif' ? (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => mutateStatus('aktif')}
            >
              Yeniden Yayına Al
            </Button>
          ) : null}

          {listing.status === 'reddedildi' ? (
            <Button variant="outline" size="sm" onClick={() => setEditOpen((v) => !v)}>
              Düzelt ve Yeniden Gönder
              <ChevronDown
                className={cn('h-4 w-4 transition-transform', editOpen && 'rotate-180')}
              />
            </Button>
          ) : null}
        </div>
      </div>

      {listing.status === 'reddedildi' && listing.rejectReason ? (
        <div className="border-t border-border bg-[hsl(4_70%_97%)] px-5 py-3 text-[14px] leading-relaxed text-[hsl(4_50%_35%)]">
          <span className="font-semibold">Red nedeni:</span> {listing.rejectReason}
        </div>
      ) : null}

      {priceOpen ? (
        <div className="border-t border-border bg-muted/60 p-5">
          <form action={submitPrice} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor={`price-${listing.id}`} className={fieldLabel}>
                Yeni Fiyat (₺)
              </Label>
              <Input
                id={`price-${listing.id}`}
                name="requestedPrice"
                type="number"
                inputMode="numeric"
                min={1}
                required
                className="h-11 bg-white"
              />
            </div>
            <div className="flex-[2]">
              <Label htmlFor={`note-${listing.id}`} className={fieldLabel}>
                Not <span className="normal-case tracking-normal">(isteğe bağlı)</span>
              </Label>
              <Input
                id={`note-${listing.id}`}
                name="note"
                placeholder="örn. pazarlık payı bırakıldı"
                className="h-11 bg-white"
              />
            </div>
            <Button type="submit" size="sm" className="h-11 px-6">
              Talep Gönder
            </Button>
          </form>
          {priceState && !priceState.ok ? (
            <p className="mt-2 text-sm text-destructive">
              {priceState.error ?? priceState.fieldErrors?.requestedPrice?.[0]}
            </p>
          ) : null}
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            Fiyat değişikliği, doğrulanmış ilan bilgisi korunacak şekilde ekibimizin onayıyla yayına
            yansır.
          </p>
        </div>
      ) : null}

      {editOpen && listing.status === 'reddedildi' ? (
        <div className="border-t border-border bg-muted/60 p-5">
          <ListingApplicationForm
            action={resubmitListing.bind(null, listing.id)}
            districts={districts}
            defaults={listing.defaults}
            submitLabel="Yeniden Gönder"
          />
        </div>
      ) : null}
    </article>
  );
}
