'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ListingCard } from '@/components/listings/listing-card';
import { SectionHeading } from '@/components/site/section-heading';
import { Reveal } from '@/components/motion/reveal';
import { useStore } from '@/store';
import type { Listing } from '@/content';

/**
 * Vitrin grid'i: açılış sekansındaki öne çıkan ilanın ardından gelen diğer
 * parseller ve tüm ilanlara kapı. Filtreleme/gezinme /ilanlar sayfasında.
 */
export function FeaturedListings({ listings }: { listings: Listing[] }) {
  const { content } = useStore();
  // İlk ilan açılış sekansında sunulur; grid sonraki üç parseli gösterir.
  const cards = listings.slice(1, 4);

  if (cards.length === 0) return null;

  return (
    <section id="ilanlar" className="bg-background py-14 sm:py-28">
      <div className="container">
        <SectionHeading
          index="02"
          eyebrow="Vitrin"
          title={content.sections.listingsTitle}
          subtitle={content.sections.listingsSubtitle}
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((l, i) => (
            <Reveal key={l.id} delay={(i % 3) * 90} className="h-full">
              <ListingCard listing={l} className="h-full" />
            </Reveal>
          ))}
        </div>

        <Reveal delay={100} className="mt-12 flex justify-center">
          <Button asChild size="lg" variant="outline" className="h-12 px-8 text-[15px]">
            <Link href="/ilanlar">
              Tüm ilanları görün
              <ArrowRight className="size-5" />
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
