import { parsePrice } from '@/lib/format';
import type { Listing } from '@/content';

/** İlan detayına schema.org yapısal verisi: RealEstateListing + BreadcrumbList.
 * Server component — script içeriği build/ISR'da üretilir. */
/** '<' kaçışı: açıklamadaki '</script>' etiketi script bloğunu kıramasın. */
function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function ListingJsonLd({ listing }: { listing: Listing }) {
  const base = process.env.SITE_URL ?? '';
  const url = `${base}/ilan/${listing.id}`;

  const realEstate = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: listing.title,
    description: listing.description,
    url,
    image: listing.images,
    datePosted: undefined as string | undefined,
    offers: {
      '@type': 'Offer',
      price: parsePrice(listing.price),
      priceCurrency: 'TRY',
      availability: 'https://schema.org/InStock',
    },
    ...(listing.lat && listing.lng
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: listing.lat,
            longitude: listing.lng,
          },
        }
      : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: listing.district,
      addressRegion: 'Kütahya',
      addressCountry: 'TR',
    },
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Alan', value: listing.area },
      ...listing.specs.map((s) => ({
        '@type': 'PropertyValue',
        name: s.label,
        value: s.value,
      })),
    ],
  };

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'İlanlar', item: `${base}/ilanlar` },
      { '@type': 'ListItem', position: 2, name: listing.title, item: url },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(realEstate) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbs) }}
      />
    </>
  );
}
