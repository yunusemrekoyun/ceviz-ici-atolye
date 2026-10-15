import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ListingNotFound() {
  return (
    <div className="container py-24 text-center">
      <h1 className="font-heading text-2xl font-bold text-foreground">İlan bulunamadı</h1>
      <p className="mx-auto mt-3 max-w-md leading-relaxed text-muted-foreground">
        Aradığınız ilan yayından kaldırılmış ya da bağlantı hatalı olabilir.
      </p>
      <Button asChild className="mt-8">
        <Link href="/ilanlar">Tüm ilanlara dönün</Link>
      </Button>
    </div>
  );
}
