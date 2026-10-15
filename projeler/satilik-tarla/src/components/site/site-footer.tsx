'use client';

import Link from 'next/link';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { Logo } from './logo';
import { TopoLines } from './topo';
import { useStore, telLink, waLink } from '@/store';

export function SiteFooter() {
  const { content } = useStore();
  const { phone, whatsapp, email } = content.contact;

  return (
    <footer
      id="iletisim"
      className="relative overflow-hidden border-t border-white/10 bg-primary text-primary-foreground/70"
    >
      {/* Filigran: pafta motifi — koyu bantların ortak dili */}
      <TopoLines className="inset-0 h-full w-full text-white/[0.04]" />

      {/* Tablette 2 kolon ara adım — tek sütun yalnızca telefonda */}
      <div className="container relative grid gap-12 py-16 sm:grid-cols-2 sm:py-20 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
        <div>
          <Logo brand={content.brand} tone="light" />
          <p className="mt-5 max-w-xs text-[15px] leading-relaxed text-primary-foreground/60">
            Kütahya ve ilçelerinde tarla, arsa ve arazi alıp satmak isteyenleri buluşturan yerel
            platform. Gerçek fotoğraf, net bilgi, kolay iletişim.
          </p>
        </div>

        <div>
          <h3 className="rule-brass rule-brass-sm font-heading text-[16px] font-semibold text-white">
            Kurumsal
          </h3>
          <ul className="mt-6 space-y-1 text-[15px]">
            {[
              { href: '#ilanlar', label: 'İlanlar' },
              { href: '#nasil-calisir', label: 'Nasıl Çalışır' },
              { href: '/ilan-ver', label: 'İlan Ver' },
              { href: '/harita', label: 'Haritada Ara' },
              { href: '/rehber', label: 'Arazi Rehberi' },
              { href: '/', label: 'Ana Sayfa' },
            ].map((l) => (
              <li key={l.href + l.label}>
                <a
                  href={l.href}
                  className="inline-block py-1.5 text-primary-foreground/65 transition-colors hover:text-white"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="rule-brass rule-brass-sm font-heading text-[16px] font-semibold text-white">
            Bölgeler
          </h3>
          <ul className="mt-6 space-y-1 text-[15px]">
            {content.districts.slice(0, 6).map((d) => (
              <li key={d.name}>
                <Link
                  href={`/ilanlar?ilce=${encodeURIComponent(d.name)}`}
                  className="inline-block py-1.5 text-primary-foreground/65 transition-colors hover:text-white"
                >
                  {d.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="rule-brass rule-brass-sm font-heading text-[16px] font-semibold text-white">
            İletişim
          </h3>
          <a
            href={telLink(phone)}
            className="nums mt-6 inline-flex items-center gap-2.5 font-heading text-[26px] font-bold leading-none text-white transition-colors hover:text-brass-ondark"
          >
            {phone}
          </a>
          <div className="mt-5 flex flex-col gap-1 text-[15px]">
            <a
              href={waLink(whatsapp, 'Merhaba, bilgi almak istiyorum.')}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-10 items-center gap-2.5 text-primary-foreground/65 transition-colors hover:text-white"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp’tan yazın
            </a>
            <a
              href={`mailto:${email}`}
              className="flex min-h-10 items-center gap-2.5 text-primary-foreground/65 transition-colors hover:text-white"
            >
              <Mail className="h-4 w-4" />
              {email}
            </a>
            <span className="mt-2 flex items-center gap-2.5 text-primary-foreground/60">
              <Phone className="h-4 w-4" />
              Hafta içi ve hafta sonu 09.00–19.00
            </span>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="container flex flex-col items-center justify-between gap-3 py-6 text-sm text-primary-foreground/55 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {content.brand}. Tüm hakları saklıdır.
          </p>
          <nav
            aria-label="Yasal bağlantılar"
            className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-[13px]"
          >
            {[
              { key: 'kvkk', label: 'KVKK' },
              { key: 'gizlilik', label: 'Gizlilik' },
              { key: 'cerez', label: 'Çerezler' },
              { key: 'kosullar', label: 'Kullanım Koşulları' },
            ].map((l) => (
              <Link
                key={l.key}
                href={`/yasal/${l.key}`}
                className="py-1 text-primary-foreground/55 transition-colors hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <p className="nums text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/55">
            39.42° K · 29.98° D · Kütahya
          </p>
        </div>
      </div>
    </footer>
  );
}
