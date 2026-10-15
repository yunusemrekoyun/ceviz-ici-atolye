import { prisma } from '@/lib/prisma';
import { Card } from '@/components/admin/ui';
import {
  BrandHeroForm,
  ContactForm,
  SectionsForm,
  StatsForm,
  FeaturesForm,
  DistrictsEditor,
} from '@/components/admin/icerik-forms';

export default async function AdminContentPage() {
  const [siteContent, stats, districts, features] = await Promise.all([
    prisma.siteContent.findUnique({ where: { id: 1 } }),
    prisma.stat.findMany({ orderBy: { position: 'asc' } }),
    prisma.district.findMany({ orderBy: { position: 'asc' } }),
    prisma.feature.findMany({ orderBy: { position: 'asc' } }),
  ]);

  if (!siteContent) {
    return (
      <Card title="İçerik">
        <p className="text-sm text-red-600">
          Site içeriği bulunamadı — veritabanı seed edilmemiş görünüyor (npx tsx prisma/seed.ts).
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Marka & Hero">
        <BrandHeroForm
          defaults={{
            brand: siteContent.brand,
            heroBadge: siteContent.heroBadge,
            heroTitleLine1: siteContent.heroTitleLine1,
            heroTitleAccent: siteContent.heroTitleAccent,
            heroSubtitle: siteContent.heroSubtitle,
          }}
        />
      </Card>

      <Card title="İstatistik Şeridi">
        <StatsForm stats={stats} />
      </Card>

      <Card title="İletişim Bilgileri">
        <ContactForm
          defaults={{
            contactPhone: siteContent.contactPhone,
            contactWhatsapp: siteContent.contactWhatsapp,
            contactEmail: siteContent.contactEmail,
          }}
        />
      </Card>

      <Card title="Bölüm Başlıkları ve Açıklamaları">
        <SectionsForm sections={siteContent.sections as Record<string, string>} />
      </Card>

      <Card title="Bölgeler">
        <DistrictsEditor
          districts={districts.map((d) => ({
            id: d.id,
            name: d.name,
            count: d.count,
            text: d.text,
          }))}
        />
      </Card>

      <Card title="Özellikler (Neden Biz)">
        <FeaturesForm features={features} />
      </Card>
    </div>
  );
}
