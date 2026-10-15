'use client';

import {
  BadgeCheck,
  Camera,
  MapPinned,
  Maximize,
  MessageCircle,
  Search,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { useStore } from '@/store';
import { SectionHeading } from '@/components/site/section-heading';
import { Reveal } from '@/components/motion/reveal';

const steps = [
  {
    icon: Search,
    title: 'Arayın',
    text: 'İlçe ve arazi türünü seçin; size uygun ilanlar saniyeler içinde listelensin.',
  },
  {
    icon: Maximize,
    title: 'İnceleyin',
    text: 'Gerçek fotoğraflar, konum haritası ve net arazi bilgisiyle araziyi uzaktan tanıyın.',
  },
  {
    icon: MessageCircle,
    title: 'İletişime geçin',
    text: 'Tek dokunuşla telefonla arayın ya da WhatsApp’tan yazın; ekibimiz yanınızda.',
  },
];

const FEATURE_ICONS: Record<string, LucideIcon> = {
  local: MapPinned,
  drone: Camera,
  verified: ShieldCheck,
  invest: TrendingUp,
};

export function HowItWorks() {
  const { content } = useStore();
  return (
    <section id="nasil-calisir" className="bg-background py-14 sm:py-28">
      <div className="container">
        <SectionHeading
          index="04"
          eyebrow="Süreç"
          title="Nasıl çalışır?"
          subtitle="Arazi almak güven ister. Süreci üç basit adıma indirdik; her adımda yanınızdayız."
        />

        {/* Adımlar: işaretler arası ölçüm hattı, her adım görününce soldan
            sağa çizilir; son adımdan sonra hat yok. */}
        <ol className="mt-14 grid gap-12 md:grid-cols-3 md:gap-8">
          {steps.map((s, i) => (
            <li key={s.title} className="relative">
              <Reveal delay={i * 120}>
                {i < steps.length - 1 ? (
                  // md'de (dar 3 kolon) left-32 ikon bloğuyla örtüşmüyor — hat lg'de
                  <span
                    className="draw-dash absolute left-32 top-6 hidden h-px bg-primary/25 lg:block"
                    style={{ right: '-2rem' }}
                    aria-hidden="true"
                  />
                ) : null}
                <div className="relative inline-flex items-center gap-4 bg-background pr-5">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-sm bg-primary text-primary-foreground">
                    <s.icon className="h-6 w-6" />
                  </span>
                  <span
                    className="nums font-heading text-2xl font-bold text-brass-strong"
                    aria-hidden="true"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-5 font-heading text-[1.35rem] font-semibold tracking-[-0.01em] text-foreground">
                  {s.title}
                </h3>
                <p className="mt-2 max-w-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </Reveal>
            </li>
          ))}
        </ol>

        {/* Neden biz: güven şeridi — başlığı admin panelinden düzenlenir */}
        <Reveal delay={120}>
          <h3 className="mt-16 border-t border-border pt-10 text-[13px] font-semibold uppercase tracking-[0.18em] text-brass-strong">
            {content.sections.aboutTitle}
          </h3>
          <div className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {content.features.map((f) => {
              const Icon = FEATURE_ICONS[f.iconKey] ?? BadgeCheck;
              return (
                <div key={f.title} className="flex items-start gap-3.5">
                  <Icon className="mt-0.5 h-6 w-6 shrink-0 text-brass-strong" />
                  <div>
                    <h4 className="text-[16px] font-semibold text-foreground">{f.title}</h4>
                    <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
                      {f.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
