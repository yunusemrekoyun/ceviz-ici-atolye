import { Card } from '@/components/admin/ui';
import { ListingForm, EMPTY_LISTING_DEFAULTS } from '@/components/admin/listing-form';
import { saveListing } from '../actions';

export default function NewListingPage() {
  return (
    <Card title="Yeni İlan">
      <p className="mb-4 text-sm text-[#8A6A43]">
        Ekip adına doğrudan ilan girişi — üye başvuruları panel ana sayfasındaki kuyruğa düşer.
        Çekim görsellerini yüklemek için ilanı kaydettikten sonra düzenleme sayfasındaki Galeri
        bölümünü kullanın.
      </p>
      <ListingForm
        action={saveListing.bind(null, null)}
        defaults={EMPTY_LISTING_DEFAULTS}
        submitLabel="İlanı Oluştur"
      />
    </Card>
  );
}
