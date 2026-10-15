import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CircleCheck, Plus } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/get-session';
import { getSiteChrome } from '@/lib/data';
import { STATUS_LABELS, TYPE_LABELS } from '@/lib/mappers';
import { parsePrice } from '@/lib/format';
import { thumbUrl } from '@/lib/img';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '@/components/site/section-heading';
import { MyListingCard, type MyListing } from '@/components/account/my-listing-card';

export const metadata: Metadata = {
  title: 'İlanlarım',
};

const STATUS_NOTES: Record<string, string | undefined> = {
  incelemede: 'Başvurunuz ekibimiz tarafından inceleniyor.',
  cekimBekliyor: 'Başvurunuz onaylandı — saha çekimi için ekibimiz sizinle iletişime geçecek.',
  reddedildi: undefined, // red nedeni ayrıca gösterilir
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ basvuru?: string }>;
}) {
  const session = await getServerSession();
  if (!session) redirect('/giris?callbackURL=/hesap/ilanlarim');
  const { basvuru } = await searchParams;

  const [rows, chrome] = await Promise.all([
    prisma.listing.findMany({
      where: { ownerId: session.user.id },
      include: {
        media: { where: { type: 'image' }, orderBy: { position: 'asc' }, take: 1 },
        priceRequests: { where: { status: 'bekliyor' }, select: { id: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    getSiteChrome(),
  ]);
  const districts = chrome.districts.map((d) => d.name);

  const listings: MyListing[] = rows.map((row) => {
    const s = STATUS_LABELS[row.status];
    const cover = thumbUrl((row.media[0]?.variants as { url?: string }[] | null)?.[0]?.url ?? null);
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      district: row.district,
      price: row.price,
      area: row.area,
      status: row.status,
      statusLabel: s.label,
      statusTone: s.tone,
      statusNote: STATUS_NOTES[row.status],
      rejectReason: row.rejectReason,
      coverUrl: cover,
      hasPendingPriceRequest: row.priceRequests.length > 0,
      defaults: {
        title: row.title,
        district: row.district,
        location: row.location,
        type: TYPE_LABELS[row.type],
        purpose: row.purpose,
        areaM2: String(Math.round(parsePrice(row.area))),
        priceTRY: String(parsePrice(row.price)),
        description: row.description,
        droneRequested: row.droneRequested,
      },
    };
  });

  return (
    <div className="container py-12 lg:py-16">
      <SectionHeading
        eyebrow="Hesabım"
        title="İlanlarım"
        subtitle="Başvurularınızın durumunu takip edin, yayındaki ilanlarınızı yönetin."
      />

      {basvuru === 'alindi' || basvuru === 'guncellendi' ? (
        <p className="mt-6 flex items-start gap-2.5 rounded-lg border border-[hsl(150_40%_75%)] bg-[hsl(150_45%_94%)] px-4 py-3 text-[15px] leading-relaxed text-[hsl(154_42%_20%)]">
          <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          {basvuru === 'alindi'
            ? 'Başvurunuz alındı. Ekibimiz inceledikten sonra e-posta ile bilgilendirileceksiniz.'
            : 'Başvurunuz güncellendi ve yeniden incelemeye alındı.'}
        </p>
      ) : null}

      <div className="mt-8 space-y-4">
        {listings.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-10 text-center shadow-soft-sm">
            <h3 className="font-heading text-lg font-semibold text-foreground">
              Henüz ilanınız yok
            </h3>
            <p className="mx-auto mt-2 max-w-sm leading-relaxed text-muted-foreground">
              Arazinizi birkaç dakikada ücretsiz ilana verin; çekim ve doğrulamayı ekibimiz
              üstlensin.
            </p>
            <Button asChild variant="brass" className="mt-6">
              <Link href="/ilan-ver">
                <Plus className="h-4 w-4" />
                İlan Ver
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {listings.map((l) => (
              <MyListingCard key={l.id} listing={l} districts={districts} />
            ))}
            <div className="pt-2">
              <Button asChild variant="outline">
                <Link href="/ilan-ver">
                  <Plus className="h-4 w-4" />
                  Yeni İlan Başvurusu
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
