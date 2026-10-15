'use client';

import Link from 'next/link';
import { ArrowRight, MapPin, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CornerMark } from '@/components/site/topo';
import { CountUp } from '@/components/motion/count-up';
import { imgSrcSet } from '@/lib/img';
import { useParallax } from '@/lib/parallax';
import { useStore, waLink } from '@/store';
import type { Listing } from '@/content';

/**
 * Vitrin parseli: ilk ilan, kesikli parsel sınırı ve pafta köşe
 * işaretleriyle çerçevelenmiş büyük yatay kart. Bölüm görününce köşe
 * işaretleri belirir; görsel kaydırdıkça çerçevesi içinde hafifçe kayar;
 * bilgi sayıları sayarak yükselir. (Kapsayan Reveal FeaturedListings'te.)
 */
export function ShowcaseListing({ listing }: { listing: Listing }) {
  const { content } = useStore();
  const coverRef = useParallax<HTMLImageElement>(24);
  const cover = listing.images?.[0];
  const wa = waLink(
    content.contact.whatsapp,
    `Merhaba, "${listing.title}" (${listing.price}) ilanı hakkında bilgi almak istiyorum.`,
  );

  // Bilgi: konum satırıyla tekrara düşmeyen kayıtlar (ilk spec = tapu durumu)
  const specs: Array<[string, string]> = [
    ['Alan', listing.area],
    ['Tür', listing.type],
    ['Birim', listing.pricePerM2],
    ...(listing.specs?.[0]
      ? [[listing.specs[0].label, listing.specs[0].value] as [string, string]]
      : []),
  ];

  const corners = [
    '-left-px -top-px',
    '-right-px -top-px rotate-90',
    '-bottom-px -right-px rotate-180',
    '-bottom-px -left-px -rotate-90',
  ];

  return (
    <div className="relative">
      {/* Kesikli parsel sınırı + köşe işaretleri (bölüm girince çizilir) */}
      <div
        className="pointer-events-none absolute -inset-2.5 rounded-lg border border-dashed border-primary/30"
        aria-hidden="true"
      >
        {corners.map((c, i) => (
          <CornerMark
            key={c}
            className={`draw-pop ${c}`}
            style={{ transitionDelay: `${200 + i * 90}ms` }}
          />
        ))}
      </div>

      {/* Tablette (md) de yan yana vitrin düzeni — dikey yığın yalnızca telefonda */}
      <article className="group grid overflow-hidden rounded-lg border border-border bg-card md:grid-cols-[1.4fr_1fr] lg:grid-cols-[1.55fr_1fr]">
        <Link
          href={`/ilan/${listing.id}`}
          className="relative block aspect-[16/10] w-full overflow-hidden bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset md:aspect-auto md:min-h-[22rem] lg:min-h-[26rem]"
          aria-label={`${listing.badge ? `${listing.badge}: ` : ''}${listing.title} detaylarını açın`}
        >
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={coverRef}
              src={cover}
              srcSet={imgSrcSet(cover)}
              sizes="(min-width: 1024px) 55vw, 100vw"
              alt={listing.title}
              className="parallax-cover absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground">
              <MapPin className="h-10 w-10" />
            </div>
          )}
          {listing.badge ? (
            <span className="absolute left-5 top-5 rounded-sm bg-background/90 px-3 py-1.5 text-[12px] font-semibold text-foreground backdrop-blur-sm">
              {listing.badge}
            </span>
          ) : null}
        </Link>

        <div className="flex flex-col p-6 sm:p-8 md:border-l md:border-dashed md:border-border">
          <p className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-brass-strong">
            <span className="draw-dash h-0.5 w-6 bg-brass" aria-hidden="true" />
            Öne çıkan parsel
          </p>
          <h2 className="mt-3 font-heading text-2xl font-bold leading-tight tracking-[-0.01em] text-foreground sm:text-[1.75rem]">
            {listing.title}
          </h2>
          <p className="mt-2 flex items-center gap-1.5 text-[15px] text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0 text-brass-strong" />
            {listing.location}
          </p>

          <dl className="mt-6 divide-y divide-border border-y border-border">
            {specs.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {label}
                </dt>
                <dd className="nums text-right text-[15px] font-semibold text-foreground">
                  <CountUp value={value} />
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-auto pt-6">
            <div className="font-heading text-3xl font-bold leading-none text-foreground">
              <span className="sr-only">Fiyat: </span>
              <CountUp value={listing.price} className="nums" />
            </div>
            <div className="mt-5 flex items-center gap-3">
              <Button asChild size="lg" className="h-12 flex-1">
                <Link href={`/ilan/${listing.id}`}>
                  Detayları Gör
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp’tan yazın"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-sm border border-border text-whatsapp transition-colors hover:border-whatsapp/40 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
