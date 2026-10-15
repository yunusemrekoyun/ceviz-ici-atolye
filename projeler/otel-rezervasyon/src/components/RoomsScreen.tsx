'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Compass, BedDouble, ChevronLeft, ChevronRight, X, Maximize2, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '@/i18n/LanguageContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MediaItem {
  id: string;
  pathThumb: string | null;
  pathMedium: string | null;
  pathOriginal: string;
  mimeType: string;
}

interface RoomData {
  id: string;
  roomTypeId: string;
  name: string;
  basePrice: number;
  description: string | null;
  available: boolean;
  maxAdults: number;
  maxChildren: number;
  roomType: { id: string; name: string; amenities: string[] };
  media: MediaItem[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RoomsScreen() {
  const { t, language } = useLanguage();
  const tr = language === 'tr';

  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch('/api/public/rooms')
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          const publicRooms = data.rooms as RoomData[];
          setRooms(publicRooms);
          if (publicRooms.length > 0) setSelectedId(publicRooms[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const selected = rooms.find(r => r.id === selectedId) ?? null;
  const media = selected?.media ?? [];

  // Clamp index defensively — fixes race condition when selectedId changes
  // (photos updates synchronously but setPhotoIndex(0) runs in next effect)
  const safeIndex = media.length > 0 ? Math.min(photoIndex, media.length - 1) : 0;

  useEffect(() => { setPhotoIndex(0); }, [selectedId]);

  const prevPhoto = () => setPhotoIndex(i => (i <= 0 ? media.length - 1 : i - 1));
  const nextPhoto = () => setPhotoIndex(i => (i >= media.length - 1 ? 0 : i + 1));

  const openLightbox = (startIndex: number) => {
    setLightboxIndex(startIndex);
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);
  const prevLightbox = () => setLightboxIndex(i => (i <= 0 ? media.length - 1 : i - 1));
  const nextLightbox = () => setLightboxIndex(i => (i >= media.length - 1 ? 0 : i + 1));

  const currentMedia = media[safeIndex];

  // ── Lightbox portal ───────────────────────────────────────────────────────

  const lightboxPortal = mounted ? createPortal(
    <AnimatePresence>
      {lightboxOpen && selected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={closeLightbox}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 backdrop-blur-md"
        >
          <div
            className="relative w-full max-w-5xl mx-4 flex items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            {/* Media */}
            <AnimatePresence mode="wait">
              {(() => {
                const m = media[lightboxIndex];
                if (!m) return null;
                const isVideo = m.mimeType.startsWith('video/');
                return (
                  <motion.div
                    key={`${selectedId}-${lightboxIndex}`}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    className="max-w-full max-h-[82vh]"
                  >
                    {isVideo ? (
                      <video
                        src={`/uploads/${m.pathOriginal}`}
                        className="max-w-full max-h-[82vh] rounded-2xl object-contain shadow-2xl"
                        controls
                        autoPlay
                        muted
                        playsInline
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/uploads/${m.pathMedium ?? m.pathOriginal}`}
                        alt={selected.name}
                        className="max-w-full max-h-[82vh] rounded-2xl object-contain shadow-2xl"
                      />
                    )}
                  </motion.div>
                );
              })()}
            </AnimatePresence>

            {/* Prev / Next */}
            {media.length > 1 && (
              <>
                <button
                  onClick={prevLightbox}
                  className="absolute left-0 sm:-left-14 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={nextLightbox}
                  className="absolute right-0 sm:-right-14 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            {/* Header */}
            <div className="absolute -top-10 left-0 right-0 flex items-center justify-between px-1">
              <div>
                <p className="text-white/80 text-sm font-semibold">{selected.name}</p>
                {media.length > 1 && (
                  <p className="text-white/35 text-xs">{lightboxIndex + 1} / {media.length}</p>
                )}
              </div>
              <button
                onClick={closeLightbox}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Dots */}
            {media.length > 1 && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5">
                {media.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === lightboxIndex ? 'bg-white scale-125' : 'bg-white/30'}`}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  ) : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Left column ─────────────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center h-full space-y-4 lg:space-y-5">

        <div>
          <div className="badge-accent mb-4">
            <Compass className="animate-spin-slow" size={12} />
            <span>{t('rooms.badge')}</span>
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-[3.5rem] font-medium tracking-tighter leading-none text-white font-sans">
            {t('rooms.title1')}
            <br />
            {t('rooms.title2')}
            <br />
            <span className="text-brand-accent">{t('rooms.title3')}</span>
          </h1>
        </div>

        {loading && (
          <div className="space-y-2">
            <div className="h-4 w-24 bg-white/5 rounded-full animate-pulse" />
            <div className="h-6 w-40 bg-white/5 rounded-full animate-pulse" />
            <div className="h-20 w-full bg-white/5 rounded-xl animate-pulse" />
          </div>
        )}

        {!loading && rooms.length === 0 && (
          <p className="text-sm text-white/30">
            {tr ? 'Henüz aktif oda bulunmuyor.' : 'No active rooms yet.'}
          </p>
        )}

        {selected && (
          <div className="bg-black/20 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] text-brand-accent uppercase tracking-widest font-semibold mb-0.5 truncate">
                  {selected.roomType.name}
                </p>
                <h2 className="text-xl font-bold text-white leading-tight truncate">{selected.name}</h2>
                <p className="text-[11px] text-brand-accent/70 mt-0.5 font-medium">
                  {(selected.maxAdults ?? 2)} {tr ? 'yetişkin' : 'adult'}
                  {(selected.maxChildren ?? 0) > 0
                    ? ` + ${selected.maxChildren} ${tr ? 'çocuk' : 'child'}`
                    : (tr ? ' · çocuk kabul edilmez' : ' · no children')}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xl font-bold text-white leading-none">
                  ₺{selected.basePrice.toLocaleString('tr-TR')}
                </p>
                <p className="text-[10px] text-white/35 mt-0.5">{tr ? 'gecelik' : 'per night'}</p>
              </div>
            </div>

            <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
              selected.available
                ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25'
                : 'text-white/35 bg-white/5 border-white/10'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${selected.available ? 'bg-emerald-400' : 'bg-white/25'}`} />
              {selected.available ? (tr ? 'Müsait' : 'Available') : (tr ? 'Seçili tarihte uygun değil' : 'Unavailable for selected dates')}
            </span>

            {selected.description && (
              <p className="text-xs text-white/55 leading-relaxed">{selected.description}</p>
            )}

            {(selected.roomType.amenities?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {selected.roomType.amenities.slice(0, 6).map((a, i) => (
                  <span key={i} className="text-[10px] bg-white/5 border border-white/[0.08] rounded-full px-2.5 py-0.5 text-white/50">
                    {a}
                  </span>
                ))}
              </div>
            )}

            {media.length > 0 && (
              <button
                onClick={() => openLightbox(safeIndex)}
                className="text-[10px] text-brand-accent/70 hover:text-brand-accent transition-colors flex items-center gap-1"
              >
                <Play size={9} className="fill-current" />
                {media.length} {tr ? 'medyayı görüntüle' : `media file${media.length !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Right column ─────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[410px] flex flex-col gap-3">

        {/* Inline photo viewer */}
        {selected && media.length > 0 && currentMedia && (
          <div
            className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 h-44 shrink-0 cursor-zoom-in group"
            onClick={() => openLightbox(safeIndex)}
          >
            {currentMedia.mimeType.startsWith('video/') ? (
              <video
                key={currentMedia.id}
                src={`/uploads/${currentMedia.pathOriginal}`}
                className="w-full h-full object-cover"
                muted
                playsInline
                autoPlay
                loop
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={currentMedia.id}
                src={`/uploads/${currentMedia.pathMedium ?? currentMedia.pathOriginal}`}
                alt={selected.name}
                className="w-full h-full object-cover transition-opacity duration-300"
              />
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

            {/* Expand hint */}
            <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Maximize2 size={13} className="text-white/80" />
            </div>

            <p className="absolute bottom-3 left-3 text-xs font-semibold text-white/80 pointer-events-none">{selected.name}</p>

            {media.length > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); prevPhoto(); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); nextPhoto(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                  <ChevronRight size={15} />
                </button>
                <div className="absolute bottom-3 right-3 flex gap-1 pointer-events-none">
                  {media.map((_, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${i === safeIndex ? 'bg-white scale-125' : 'bg-white/30'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Room list */}
        <div
          className="panel-glass-dashed overflow-y-auto no-scrollbar flex-1 min-h-0"
          style={{ maxHeight: media.length > 0 ? '16rem' : '22rem' }}
        >
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <BedDouble size={28} className="text-white/15 mb-2" />
              <p className="text-xs text-white/25">
                {tr ? 'Henüz oda eklenmemiş' : 'No rooms added yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {rooms.map(room => {
                const thumbItem = room.media?.find(m => m.mimeType.startsWith('image/')) ?? room.media?.[0];
                const thumbSrc = thumbItem ? `/uploads/${thumbItem.pathThumb ?? thumbItem.pathOriginal}` : null;
                const thumbIsVideo = thumbItem?.mimeType.startsWith('video/') ?? false;
                const isActive = room.id === selectedId;

                return (
                  <button
                    key={room.id}
                    onClick={() => setSelectedId(room.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                      isActive
                        ? 'bg-brand-accent/8 border-brand-accent/25'
                        : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/30 flex items-center justify-center">
                      {thumbSrc && thumbIsVideo ? (
                        <video src={thumbSrc} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                      ) : thumbSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbSrc} alt={room.name} className="w-full h-full object-cover" />
                      ) : (
                        <BedDouble size={15} className="text-white/20" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-xs font-semibold text-white/90 truncate">{room.name}</p>
                        <span className={`shrink-0 inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${
                          room.available
                            ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25'
                            : 'text-white/35 bg-white/5 border-white/10'
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${room.available ? 'bg-emerald-400' : 'bg-white/25'}`} />
                          {room.available ? (tr ? 'Müsait' : 'Available') : (tr ? 'Uygun değil' : 'Unavailable')}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/35 truncate">
                        {room.roomType.name}
                        {' · '}{(room.maxAdults ?? 2)}{tr ? 'y' : 'a'}{(room.maxChildren ?? 0) > 0 ? `+${room.maxChildren}${tr ? 'ç' : 'c'}` : ''}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold text-white/80">
                        ₺{room.basePrice.toLocaleString('tr-TR')}
                      </p>
                      <p className="text-[9px] text-white/30">{tr ? '/gece' : '/night'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {!loading && rooms.length > 0 && (
          <p className="text-[10px] text-white/20 font-mono text-right shrink-0">
            {rooms.length} {tr ? 'aktif oda' : `active room${rooms.length !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>

      {/* Lightbox portal */}
      {lightboxPortal}
    </>
  );
}
