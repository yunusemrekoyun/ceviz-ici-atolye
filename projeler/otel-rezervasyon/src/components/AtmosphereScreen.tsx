'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Flame, Layers, CheckCircle2, ChevronLeft, ChevronRight, X, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '@/i18n/LanguageContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MediaItem {
  id: string;
  pathThumb: string | null;
  pathMedium: string | null;
  pathOriginal: string;
  mimeType: string;
  originalName: string;
}

interface RoomTypeData {
  id: string;
  name: string;
  amenities: string[];
  isActive: boolean;
  media: MediaItem[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AtmosphereScreen() {
  const { t, language } = useLanguage();
  const tr = language === 'tr';

  const [roomTypes, setRoomTypes] = useState<RoomTypeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Lightbox
  const [lightboxRtId, setLightboxRtId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch('/api/room-types')
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          const active = (data.roomTypes as RoomTypeData[]).filter(rt => rt.isActive);
          setRoomTypes(active);
          if (active.length > 0) setSelectedId(active[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const selected = roomTypes.find(rt => rt.id === selectedId) ?? null;
  const lightboxRt = lightboxRtId ? roomTypes.find(rt => rt.id === lightboxRtId) ?? null : null;
  const lightboxMedia = lightboxRt?.media ?? [];

  const openLightbox = (rt: RoomTypeData, index = 0) => {
    if (rt.media.length === 0) return;
    setLightboxRtId(rt.id);
    setLightboxIndex(index);
  };

  const closeLightbox = () => setLightboxRtId(null);

  const prevMedia = () => setLightboxIndex(i => (i === 0 ? lightboxMedia.length - 1 : i - 1));
  const nextMedia = () => setLightboxIndex(i => (i >= lightboxMedia.length - 1 ? 0 : i + 1));

  const getThumb = (rt: RoomTypeData) => {
    const img = rt.media.find(m => m.mimeType.startsWith('image/'));
    if (img) return { src: `/uploads/${img.pathThumb ?? img.pathOriginal}`, isVideo: false };
    const vid = rt.media.find(m => m.mimeType.startsWith('video/'));
    if (vid) return { src: `/uploads/${vid.pathOriginal}`, isVideo: true };
    return null;
  };

  // ── Lightbox portal ───────────────────────────────────────────────────────

  const lightboxPortal = mounted ? createPortal(
    <AnimatePresence>
      {lightboxRt && (
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
                const m = lightboxMedia[lightboxIndex];
                if (!m) return null;
                const isVideo = m.mimeType.startsWith('video/');
                return (
                  <motion.div
                    key={`${lightboxRtId}-${lightboxIndex}`}
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
                        alt={m.originalName}
                        className="max-w-full max-h-[82vh] rounded-2xl object-contain shadow-2xl"
                      />
                    )}
                  </motion.div>
                );
              })()}
            </AnimatePresence>

            {/* Prev / Next */}
            {lightboxMedia.length > 1 && (
              <>
                <button
                  onClick={prevMedia}
                  className="absolute left-0 sm:-left-14 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={nextMedia}
                  className="absolute right-0 sm:-right-14 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            {/* Header info */}
            <div className="absolute -top-10 left-0 right-0 flex items-center justify-between px-1">
              <div>
                <p className="text-white/80 text-sm font-semibold">{lightboxRt?.name}</p>
                {lightboxMedia.length > 1 && (
                  <p className="text-white/35 text-xs">{lightboxIndex + 1} / {lightboxMedia.length}</p>
                )}
              </div>
              <button
                onClick={closeLightbox}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Dot navigation */}
            {lightboxMedia.length > 1 && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5">
                {lightboxMedia.map((_, i) => (
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
            <Flame className="animate-pulse" size={12} />
            <span>{t('atm.badge')}</span>
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-[3.5rem] font-medium tracking-tighter leading-none text-white font-sans">
            {t('atm.title1')}
            <br />
            {t('atm.title2')}
            <br />
            <span className="text-brand-accent">{t('atm.title3')}</span>
          </h1>
        </div>

        {/* Detail panel */}
        <div className="max-w-md bg-black/15 backdrop-blur-md p-4 sm:p-5 rounded-xl border border-white/5 space-y-4 shadow-lg min-h-[9rem]">
          {loading && (
            <div className="space-y-2 animate-pulse">
              <div className="h-4 w-32 bg-white/10 rounded-full" />
              <div className="h-3 w-full bg-white/5 rounded-full" />
              <div className="h-3 w-4/5 bg-white/5 rounded-full" />
            </div>
          )}

          {!loading && !selected && (
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-light">
              {t('atm.desc')}
            </p>
          )}

          {selected && (
            <>
              <div>
                <p className="text-[10px] text-brand-accent uppercase tracking-widest font-semibold mb-1">
                  {tr ? 'Seçili oda çeşidi' : 'Selected room type'}
                </p>
                <h2 className="text-lg font-bold text-white leading-tight">{selected.name}</h2>
                {selected.media.length > 0 && (
                  <button
                    onClick={() => openLightbox(selected)}
                    className="mt-1.5 text-[10px] text-brand-accent/70 hover:text-brand-accent transition-colors flex items-center gap-1"
                  >
                    <Play size={9} className="fill-current" />
                    {selected.media.length} {tr ? 'medyayı görüntüle' : `media file${selected.media.length !== 1 ? 's' : ''}`}
                  </button>
                )}
              </div>

              {selected.amenities.length > 0 ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {selected.amenities.map((a, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-white/60">
                      <CheckCircle2 size={11} className="text-brand-accent/70 shrink-0" />
                      <span className="truncate">{a}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/30 italic">
                  {tr ? 'Bu oda çeşidi için henüz özellik eklenmemiş.' : 'No features added for this room type yet.'}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Right column: room type grid ────────────────────────────────── */}
      <div className="w-full lg:w-[410px] grid grid-cols-2 gap-3">
        {loading && (
          <>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-xl bg-white/5 animate-pulse h-32 sm:h-40" />
            ))}
          </>
        )}

        {!loading && roomTypes.length === 0 && (
          <div className="col-span-2 flex flex-col items-center justify-center py-16 text-center">
            <Layers size={28} className="text-white/15 mb-2" />
            <p className="text-xs text-white/25">
              {tr ? 'Henüz oda çeşidi eklenmemiş.' : 'No room types added yet.'}
            </p>
          </div>
        )}

        {roomTypes.map(rt => {
          const thumb = getThumb(rt);
          const isActive = rt.id === selectedId;

          return (
            <div
              key={rt.id}
              onClick={() => {
                setSelectedId(rt.id);
                openLightbox(rt);
              }}
              className={`relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 group h-32 sm:h-40 ${
                isActive
                  ? 'border-2 border-brand-accent shadow-[0_0_15px_rgba(250,204,21,0.15)]'
                  : 'border border-white/10 opacity-70 hover:opacity-100 hover:border-white/30'
              }`}
            >
              {/* Thumbnail */}
              {thumb ? (
                thumb.isVideo ? (
                  <video
                    src={thumb.src}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb.src}
                    alt={rt.name}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                  />
                )
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center">
                  <Layers size={28} className="text-white/15" />
                </div>
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

              {/* Media count badge */}
              {rt.media.length > 0 && (
                <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 text-[9px] text-white/70 font-medium">
                  {rt.media.length} {tr ? 'medya' : 'media'}
                </div>
              )}

              {/* Info */}
              <div className="absolute bottom-2 left-2 right-2">
                <span className="text-white text-[10px] sm:text-xs font-semibold leading-tight drop-shadow-md block truncate">
                  {rt.name}
                </span>
                {rt.amenities.length > 0 && (
                  <span className="text-white/40 text-[9px]">
                    {rt.amenities.length} {tr ? 'özellik' : 'feature'}
                  </span>
                )}
              </div>

              {/* Selected badge */}
              {isActive && (
                <div className="absolute top-2 right-2 bg-brand-accent text-black text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                  {tr ? 'Seçili' : 'Selected'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox portal — renders at document.body to escape any transform context */}
      {lightboxPortal}
    </>
  );
}
