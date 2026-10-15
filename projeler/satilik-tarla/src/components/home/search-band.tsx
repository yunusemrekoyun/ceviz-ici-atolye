'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SectionHeading } from '@/components/site/section-heading';
import { Reveal } from '@/components/motion/reveal';
import { LAND_TYPES } from '@/content';

const fieldTrigger =
  'h-14 w-full rounded-sm border border-input bg-background px-4 text-left text-[16px] font-medium text-foreground shadow-none transition-colors hover:border-primary/30 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background data-[placeholder]:text-muted-foreground [&>span]:flex [&>span]:items-center [&>span]:gap-2.5';

const fieldLabel =
  'mb-2 block text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-foreground';

/** Ana sayfa arama bandı: seçimleri /ilanlar sayfasına taşır. */
export function SearchBand({ districts }: { districts: string[] }) {
  const router = useRouter();
  const [district, setDistrict] = useState('all');
  const [type, setType] = useState('all');

  function submit(e: FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (district !== 'all') p.set('ilce', district);
    if (type !== 'all') p.set('tur', type);
    router.push(`/ilanlar${p.size ? `?${p.toString()}` : ''}`);
  }

  return (
    <section aria-label="İlan arama" className="bg-background py-12 sm:py-20">
      <div className="container">
        <SectionHeading
          index="01"
          eyebrow="Aramaya başlayın"
          title="Size uygun araziyi bulalım"
          subtitle="İlçe ve arazi türünü seçin; aradığınız kriterlere uyan ilanları hemen listeleyelim."
        />

        <Reveal delay={120}>
          {/* Saha formu: görünür küçük etiketler, komut çubuğu düzeni */}
          <form
            onSubmit={submit}
            className="mt-10 flex flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-soft sm:flex-row sm:items-end sm:gap-3 sm:p-6"
          >
            <div className="flex-1">
              <label htmlFor="filter-district" className={fieldLabel}>
                İlçe
              </label>
              <Select value={district} onValueChange={setDistrict}>
                <SelectTrigger id="filter-district" className={fieldTrigger}>
                  <MapPin className="h-5 w-5 shrink-0 text-brass-strong" />
                  <SelectValue placeholder="Tüm ilçeler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm İlçeler</SelectItem>
                  {districts.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label htmlFor="filter-type" className={fieldLabel}>
                Arazi türü
              </label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="filter-type" className={fieldTrigger}>
                  <Sprout className="h-5 w-5 shrink-0 text-brass-strong" />
                  <SelectValue placeholder="Tüm türler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Türler</SelectItem>
                  {LAND_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" variant="brass" size="lg" className="h-14 px-10 text-[15px]">
              İlanları Göster
            </Button>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
