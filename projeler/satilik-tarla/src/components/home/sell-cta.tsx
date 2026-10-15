'use client';

import Link from 'next/link';
import { ArrowRight, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/reveal';
import { TopoLines } from '@/components/site/topo';
import { useStore, telLink } from '@/store';

export function SellCta() {
  const { content } = useStore();
  return (
    <section id="ilan-ver" aria-label="İlan verin" className="relative overflow-hidden bg-primary">
      <TopoLines className="inset-0 h-full w-full text-white/[0.05]" />
      <div className="container relative flex flex-col items-start justify-between gap-8 py-12 sm:py-20 md:flex-row md:items-center">
        <Reveal className="max-w-2xl">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-brass-ondark">
            Satıcılar için
          </p>
          <h2 className="mt-4 font-heading text-3xl font-bold leading-[1.1] tracking-tight text-primary-foreground sm:text-4xl">
            Arazinizi mi satmak istiyorsunuz?
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-primary-foreground/75">
            İlanınızı ücretsiz verin. Ekibimiz fotoğraf ve drone çekimini yapar, arazinizi doğru
            alıcıyla buluşturur; siz yalnızca görüşmeleri yaparsınız.
          </p>
        </Reveal>
        <Reveal delay={120} className="w-full md:w-auto">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="brass" size="lg" className="h-[52px] px-8 text-[15px]">
              <Link href="/ilan-ver">
                İlanımı Ücretsiz Ver
                <ArrowRight className="size-5" />
              </Link>
            </Button>
            <Button asChild variant="outlineOnDark" size="lg" className="h-[52px] px-8 text-[15px]">
              <a href={telLink(content.contact.phone)}>
                <Phone className="size-5" />
                {content.contact.phone}
              </a>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
