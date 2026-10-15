'use client';

import { useRef, type ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { MapPin, Wifi, Croissant, Clock, ConciergeBell, ShieldCheck, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { AmenityChip } from '../AmenityChip';
import { RoomCard } from '../RoomCard';
import { roomImage, type RoomData } from '../types';

// Reveal-on-scroll wrapper (native scroll, no hijacking).
function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12%' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// Home — elevated to a scroll-animated landing (design-refs/refs.pdf pages 15-16
// as the base): parallax video hero, scroll-revealed sections, full-bleed
// atmosphere block, closing CTA.
export function MobileHome({
  rooms,
  loading,
  onBook,
  onRooms,
  onSelectRoom,
}: {
  rooms: RoomData[];
  loading: boolean;
  onBook: () => void;
  onRooms: () => void;
  onSelectRoom: (id: string) => void;
}) {
  const { language } = useLanguage();
  const tr = language === 'tr';

  const heroImg = rooms.map(roomImage).find(Boolean) ?? null;
  const featured = rooms.slice(0, 6);
  const gallery = rooms
    .flatMap((r) => r.media.filter((m) => !m.mimeType.startsWith('video/')))
    .map((m) => `/uploads/${m.pathMedium ?? m.pathOriginal}`)
    .slice(0, 8);
  const atmoImg = gallery[1] ?? heroImg;

  // Hero parallax (scroll-linked).
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroP } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroMediaY = useTransform(heroP, [0, 1], ['0%', '26%']);
  const heroContentY = useTransform(heroP, [0, 1], ['0%', '-26%']);
  const heroContentOpacity = useTransform(heroP, [0, 0.85], [1, 0]);

  // Atmosphere parallax.
  const atmoRef = useRef<HTMLElement>(null);
  const { scrollYProgress: atmoP } = useScroll({ target: atmoRef, offset: ['start end', 'end start'] });
  const atmoY = useTransform(atmoP, [0, 1], ['-12%', '12%']);

  const amenities = [
    { icon: Wifi, label: tr ? 'Ücretsiz Wi-Fi' : 'Free Wi-Fi' },
    { icon: Croissant, label: tr ? 'Kahvaltı Dahil' : 'Breakfast Incl.' },
    { icon: Clock, label: tr ? '7/24 Resepsiyon' : '24/7 Reception' },
    { icon: ConciergeBell, label: tr ? 'Vale Hizmeti' : 'Valet Service' },
    { icon: ShieldCheck, label: tr ? 'Güvenli Otopark' : 'Secure Parking' },
  ];

  return (
    <div className="space-y-10 pb-4">
      {/* ── Parallax video hero ── */}
      <section ref={heroRef} className="relative h-[82vh] min-h-[540px] overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{ y: heroMediaY }}
          initial={{ scale: 1.05 }}
          animate={{ scale: 1.16 }}
          transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        >
          <video
            src="/background-video.mp4"
            poster={heroImg ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-hotel-bg via-hotel-bg/40 to-hotel-bg/5" />

        <motion.div
          style={{ y: heroContentY, opacity: heroContentOpacity }}
          className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3.5 p-6 pb-10 text-center"
        >
          <span className="font-hotel text-[11px] font-semibold uppercase tracking-[0.22em] text-hotel-peach drop-shadow">
            {tr ? 'Tarihî Konak · Butik Otel' : 'Historic Mansion · Boutique'}
          </span>
          <h1 className="font-serif text-[2.7rem] font-bold leading-[1.03] text-hotel-text-primary drop-shadow-xl">
            Kütahya Garden Otel
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-hotel-peach/30 bg-hotel-peach/15 px-3.5 py-1.5 text-sm text-hotel-text-primary backdrop-blur-md">
            <MapPin size={14} className="text-hotel-peach" />
            {tr ? 'Kütahya Merkez' : 'Kütahya Center'}
          </span>
          <p className="max-w-[18rem] font-hotel text-sm leading-relaxed text-hotel-text-primary/80">
            {tr
              ? 'Şehrin kalbinde lüks ve tarihi bir dokunuş.'
              : 'A luxurious, historic touch in the heart of the city.'}
          </p>
          <button type="button" onClick={onBook} className="btn-hotel mt-1 shadow-lg shadow-hotel-peach/25">
            {tr ? 'Rezervasyon Yap' : 'Book Now'} →
          </button>
        </motion.div>
      </section>

      {/* ── Amenities ── */}
      <Reveal className="px-4">
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar">
          {amenities.map((a) => (
            <AmenityChip key={a.label} icon={a.icon} label={a.label} />
          ))}
        </div>
      </Reveal>

      {/* ── Full-bleed atmosphere (parallax + revealing line) ──
          Section is always rendered so the useScroll target ref stays hydrated;
          only the image is conditional. */}
      <section ref={atmoRef} className="relative h-[58vh] min-h-[400px] overflow-hidden">
        {atmoImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <motion.img
            src={atmoImg}
            alt=""
            style={{ y: atmoY }}
            className="absolute inset-x-0 -top-[12%] h-[124%] w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-hotel-surface-2" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-hotel-bg via-hotel-bg/30 to-hotel-bg/20" />
        <Reveal className="absolute inset-x-0 bottom-0 p-6">
          <p className="font-hotel text-[11px] font-semibold uppercase tracking-[0.22em] text-hotel-peach">
            {tr ? 'Atmosfer' : 'Atmosphere'}
          </p>
          <p className="mt-2 max-w-[20rem] font-serif text-3xl font-bold leading-tight text-hotel-text-primary drop-shadow-lg">
            {tr ? 'Tarihin ve konforun buluştuğu yer.' : 'Where history meets comfort.'}
          </p>
        </Reveal>
      </section>

      {/* ── Featured rooms ── */}
      <Reveal className="px-4">
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="hotel-eyebrow">{tr ? 'Öne Çıkan' : 'Featured'}</p>
              <h2 className="mt-1.5 font-serif text-[2rem] font-bold leading-none tracking-tight text-hotel-text-primary">
                {tr ? 'Odalar' : 'Rooms'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onRooms}
              className="inline-flex items-center gap-1 pb-1 font-hotel text-sm text-hotel-peach"
            >
              {tr ? 'Tümü' : 'All'}
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 no-scrollbar">
            {featured.map((room) => (
              <RoomCard
                key={room.id}
                className="w-72 shrink-0"
                image={roomImage(room) ?? '/logo.png'}
                name={room.name}
                subtitle={room.roomType?.name}
                priceText={`₺${room.basePrice.toLocaleString('tr-TR')}`}
                perNight={tr ? '/ gece' : '/ night'}
                meta={`${room.maxAdults} ${tr ? 'Kişilik' : 'Guests'}`}
                ctaLabel={tr ? 'İncele' : 'View'}
                onSelect={() => onSelectRoom(room.id)}
              />
            ))}
            {loading && (
              <p className="py-6 font-hotel text-sm text-hotel-text-muted">
                {tr ? 'Odalar yükleniyor…' : 'Loading rooms…'}
              </p>
            )}
            {!loading && featured.length === 0 && (
              <p className="py-6 font-hotel text-sm text-hotel-text-muted">
                {tr ? 'Henüz oda eklenmemiş.' : 'No rooms yet.'}
              </p>
            )}
          </div>
        </div>
      </Reveal>

      {/* ── Gallery strip ── */}
      {gallery.length > 0 && (
        <Reveal className="px-4">
          <div className="space-y-4">
            <div>
              <p className="hotel-eyebrow">{tr ? 'Galeri' : 'Gallery'}</p>
              <h2 className="mt-1.5 font-serif text-[2rem] font-bold leading-none tracking-tight text-hotel-text-primary">
                {tr ? 'Otelden Kareler' : 'From the Hotel'}
              </h2>
            </div>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
              {gallery.map((src, i) => (
                <motion.div
                  key={i}
                  className="h-44 w-36 shrink-0 overflow-hidden rounded-2xl border border-hotel-border shadow-lg shadow-black/30"
                  initial={{ opacity: 0, scale: 0.92 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '-8%' }}
                  transition={{ duration: 0.5, delay: (i % 4) * 0.06, ease: 'easeOut' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </motion.div>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      {/* ── Closing footer (editorial, image-forward) ── */}
      <section className="relative overflow-hidden">
        {(gallery[2] ?? heroImg) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={(gallery[2] ?? heroImg) as string} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-hotel-bg/80 via-hotel-bg/92 to-hotel-bg" />

        <div className="relative space-y-7 px-6 pb-12 pt-14">
          <Reveal className="space-y-4">
            <p className="hotel-eyebrow">{tr ? 'Rezervasyon' : 'Reserve'}</p>
            <h2 className="font-serif text-[2.5rem] font-bold leading-[1.04] tracking-tight text-hotel-text-primary">
              {tr ? 'Sizi ağırlamak için sabırsızlanıyoruz.' : 'We can’t wait to host you.'}
            </h2>
            <button
              type="button"
              onClick={onBook}
              className="inline-flex items-center gap-2 rounded-full bg-hotel-peach px-6 py-3.5 font-hotel text-base font-medium text-hotel-bg shadow-lg shadow-hotel-peach/25 transition-transform active:scale-[0.98]"
            >
              {tr ? 'Rezervasyon Yap' : 'Book Now'}
              <ArrowRight size={18} />
            </button>
          </Reveal>

          {/* Practical info */}
          <div className="space-y-4 pt-2">
            <div className="hotel-rule" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              {[
                { label: tr ? 'Giriş' : 'Check-in', value: '14:00' },
                { label: tr ? 'Çıkış' : 'Check-out', value: '12:00' },
                { label: tr ? 'Telefon' : 'Phone', value: '+90 274 123 45 67', href: 'tel:+902741234567' },
                { label: tr ? 'Konum' : 'Location', value: 'Kütahya Merkez' },
              ].map((it) => {
                const inner = (
                  <>
                    <p className="font-hotel text-[10px] font-semibold uppercase tracking-[0.18em] text-hotel-text-muted">
                      {it.label}
                    </p>
                    <p className="mt-1 font-hotel text-sm text-hotel-text-primary">{it.value}</p>
                  </>
                );
                return it.href ? (
                  <a key={it.label} href={it.href} className="block">
                    {inner}
                  </a>
                ) : (
                  <div key={it.label}>{inner}</div>
                );
              })}
            </div>
            <div className="hotel-rule" />
          </div>

          {/* Brand line */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-full border border-hotel-text-primary/30 font-serif text-base text-hotel-text-primary">
                G
              </span>
              <span className="font-hotel text-xs text-hotel-text-muted">Kütahya Garden Otel</span>
            </div>
            <span className="font-hotel text-[10px] text-hotel-text-muted/60">© {new Date().getFullYear()}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
