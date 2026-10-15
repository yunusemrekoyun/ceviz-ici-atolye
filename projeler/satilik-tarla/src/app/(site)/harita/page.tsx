import type { Metadata } from 'next';
import { getListingStats, getSiteChrome } from '@/lib/data';
import { HaritaMap } from '@/components/listings/harita-map';
import { SectionHeading } from '@/components/site/section-heading';

export const metadata: Metadata = {
  title: 'Haritada Arazi Arama',
  description:
    'Kütahya ve ilçelerindeki satılık arazileri harita üzerinde görün; ilgilendiğiniz bölgeyi çizerek daraltın.',
  alternates: { canonical: '/harita' },
};

export default async function Page() {
  // Pinler sayfa yüküyle değil, harita ilk açılınca ve pan/zoom'da görünür
  // alan (viewport) için canlı yüklenir (bkz. HaritaMap) — binlerce ilanda
  // hepsini tek seferde göndermek sayfayı megabaytlarca ağırlaştırıyordu.
  const [stats, chrome] = await Promise.all([getListingStats(), getSiteChrome()]);

  return (
    <div className="container py-12 lg:py-16">
      <SectionHeading
        eyebrow="Harita"
        title={chrome.sections.mapTitle || 'Haritada Arazi Arama'}
        subtitle={
          chrome.sections.mapSubtitle ||
          'İlgilendiğiniz bölgeyi çizin; içindeki ilanları anında görün.'
        }
      />
      <div className="mt-8">
        <HaritaMap totalCount={stats.total} />
      </div>
    </div>
  );
}
