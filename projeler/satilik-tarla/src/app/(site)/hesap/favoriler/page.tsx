import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Heart } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/get-session';
import { mapListingRow } from '@/lib/mappers';
import { ListingCard } from '@/components/listings/listing-card';
import { SectionHeading } from '@/components/site/section-heading';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Favorilerim' };

export default async function Page() {
  const session = await getServerSession();
  if (!session) redirect('/giris?callbackURL=/hesap/favoriler');

  const rows = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    include: {
      listing: { include: { media: { orderBy: { position: 'asc' } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  // Yayından kalkanlar listede kalır ama işaretlenir — kullanıcı kararı verebilsin
  const items = rows.map((r) => ({
    listing: mapListingRow(r.listing),
    active: r.listing.status === 'aktif',
  }));

  return (
    <div className="container py-12 lg:py-16">
      <SectionHeading
        eyebrow="Hesabım"
        title="Favorilerim"
        subtitle="Beğendiğiniz araziler — fiyat değişirse zil bildirimlerinden takip edebilirsiniz."
      />

      <div className="mt-8">
        {items.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-10 text-center shadow-soft-sm">
            <Heart className="mx-auto h-8 w-8 text-brass-strong" aria-hidden="true" />
            <h3 className="mt-3 font-heading text-lg font-semibold text-foreground">
              Henüz favoriniz yok
            </h3>
            <p className="mx-auto mt-2 max-w-sm leading-relaxed text-muted-foreground">
              İlan kartlarındaki kalp simgesiyle beğendiğiniz arazileri burada toplayın.
            </p>
            <Button asChild variant="brass" className="mt-6">
              <Link href="/ilanlar">İlanlara Göz At</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {items.map(({ listing, active }) => (
              <div key={listing.id} className="relative h-full">
                {!active ? (
                  <span className="absolute left-3 top-3 z-10 rounded-full bg-[hsl(155_30%_7%_/_0.75)] px-3 py-1 text-[12px] font-semibold text-white">
                    Yayında değil
                  </span>
                ) : null}
                {/* Yayında olmayan ilanın detay sayfası 404 verir — linki kapat */}
                <div className={active ? 'h-full' : 'pointer-events-none h-full opacity-70'}>
                  <ListingCard listing={listing} className="h-full" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
