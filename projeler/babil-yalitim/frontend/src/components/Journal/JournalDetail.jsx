// src/components/Journal/JournalDetail.jsx
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../api";
import PropTypes from "prop-types";
import {
  CalendarDays,
  Heart,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
} from "lucide-react";
import { useLocale } from "../../i18n/LocaleContext";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const fmtDate = (v, locale) =>
  v ? new Date(v).toLocaleDateString(locale === "en" ? "en-GB" : "tr-TR") : "";

const JournalDetail = () => {
  const { locale } = useLocale();
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  const [liking, setLiking] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [likeEmail, setLikeEmail] = useState("");
  const [likeFormOpen, setLikeFormOpen] = useState(false);
  const [likeStatus, setLikeStatus] = useState(null);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (async () => {
      try {
        const { data } = await api.get(`/journals/${id}`, {
          params: { locale },
        });
        setItem(data);
        setLikes(data?.likesCount ?? 0);
      } catch (e) {
        console.error("Journal not found:", e);
        setItem(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, locale]);

  const heroUrl = item?.cover?.url || "";
  const dateText = fmtDate(item?.createdAt, locale);

  // Tüm medya: kapak + assets (image/video)
  const media = useMemo(() => {
    const list = [];
    if (item?.cover?.url) {
      list.push({
        url: item.cover.url,
        type: item.cover.resourceType || "image",
        isCover: true,
      });
    }
    const arr = Array.isArray(item?.assets) ? item.assets : [];
    arr.forEach((m) => {
      if (!m?.url) return;
      list.push({
        url: m.url,
        type: m.resourceType || "image",
        isCover: false,
      });
    });
    // Aynı url'i teke indir
    const seen = new Set();
    return list.filter((m) =>
      seen.has(m.url) ? false : (seen.add(m.url), true)
    );
  }, [item]);

  const submitLike = async () => {
    if (!id || liking || !likeEmail.trim()) return;
    try {
      setLiking(true);
      setLikeStatus(null);
      const { data } = await api.post(`/journals/${id}/like`, {
        email: likeEmail.trim(),
      });
      setLikes(data?.likesCount ?? likes + 1);
      setLiked(true);
      setLikeStatus({
        type: "success",
        text: locale === "en" ? "Like saved." : "Begeni kaydedildi.",
      });
      setLikeFormOpen(false);
      setLikeEmail("");
    } catch (e) {
      if (e?.response?.status === 409) {
        setLiked(true);
        setLikes(e?.response?.data?.likesCount ?? likes);
        setLikeStatus({
          type: "info",
          text:
            locale === "en"
              ? "You have already liked this news item."
              : "Bu haberi zaten begenmissiniz.",
        });
      } else {
        setLikeStatus({
          type: "error",
          text:
            e?.response?.data?.message ||
            (locale === "en" ? "Like could not be added." : "Begeni eklenemedi."),
        });
      }
    } finally {
      setLiking(false);
    }
  };

  // Lightbox helpers
  const openLightbox = useCallback((idx) => {
    setLightboxIndex(idx);
    setLightboxOpen(true);
  }, []);
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);
  const next = useCallback(
    () => setLightboxIndex((p) => (media.length ? (p + 1) % media.length : 0)),
    [media.length]
  );
  const prev = useCallback(
    () =>
      setLightboxIndex((p) =>
        media.length ? (p - 1 + media.length) % media.length : 0
      ),
    [media.length]
  );

  // Key controls for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, closeLightbox, next, prev]);

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="animate-pulse text-gray-500">
          {locale === "en" ? "Loading..." : "Yükleniyor…"}
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-20 text-red-500 text-xl font-semibold">
        {locale === "en" ? "News item not found." : "Haber bulunamadı."}
      </div>
    );
  }

  return (
    <section className="w-full">
      {/* HERO */}
      <div className="relative h-[42vh] md:h-[56vh] overflow-hidden">
        {heroUrl ? (
          <motion.img
            key={heroUrl}
            src={heroUrl}
            alt={item.title}
            initial={{ scale: 1.05, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300" />
        )}
        <div className="absolute inset-0 bg-black/45" />
        {/* HERO içindeki overlay container */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full px-4"
        >
          <div className="max-w-[90vw] md:max-w-[60ch] text-left pr-4 md:pr-8">
            <h1
              lang="tr"
              className="text-white text-2xl sm:text-3xl md:text-5xl font-bold
                 leading-tight md:leading-[1.15] break-words hyphens-auto
                 overflow-hidden"
              style={{ wordBreak: "break-word", textWrap: "balance" }}
            >
              {item.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-white/90">
              <span className="inline-flex items-center gap-2 text-sm">
                <CalendarDays size={18} /> {dateText || "—"}
              </span>
              <button
                onClick={() => setLikeFormOpen((prev) => !prev)}
                disabled={liking}
                className={`inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border transition ${
                  liked
                    ? "bg-white text-quaternaryColor border-white"
                    : "bg-white/15 text-white border-white/40 hover:bg-white/25"
                }`}
                aria-label={locale === "en" ? "Like" : "Beğen"}
                title={locale === "en" ? "Like" : "Beğen"}
              >
                <Heart className={liked ? "fill-current" : ""} size={16} />
                {likes}
              </button>
            </div>
            {likeFormOpen && !liked && (
              <div className="mt-4 max-w-sm rounded-2xl border border-white/30 bg-white/10 p-3 backdrop-blur">
                <label className="mb-2 block text-xs font-medium text-white/85">
                  {locale === "en"
                    ? "Enter your email address to save that you liked this news item"
                    : "Haberi begendiginizi kaydetmek icin e-posta adresiniz"}
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    value={likeEmail}
                    onChange={(e) => setLikeEmail(e.target.value)}
                    placeholder={locale === "en" ? "example@mail.com" : "ornek@mail.com"}
                    className="w-full rounded-xl border border-white/25 bg-white/90 px-3 py-2 text-sm text-slate-800 outline-none focus:border-white"
                  />
                  <button
                    type="button"
                    onClick={submitLike}
                    disabled={liking || !likeEmail.trim()}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-60"
                  >
                    {liking
                      ? locale === "en"
                        ? "Saving..."
                        : "Kaydediliyor..."
                      : locale === "en"
                      ? "Submit"
                      : "Gonder"}
                  </button>
                </div>
              </div>
            )}
            {likeStatus && (
              <div
                className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                  likeStatus.type === "success"
                    ? "bg-emerald-100 text-emerald-700"
                    : likeStatus.type === "info"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {likeStatus.text}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* CONTENT + GALLERY STRIP */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 relative z-10 mt-10 md:mt-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* İçerik */}
          <motion.article
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="rich-content lg:col-span-2 prose prose-sm md:prose-base lg:prose-lg prose-p:leading-relaxed prose-img:rounded-xl prose-headings:text-brandBlue prose-a:text-quaternaryColor max-w-none bg-white/85 backdrop-blur rounded-2xl shadow p-5 md:p-8"
          >
            {/<[a-z][\s\S]*>/i.test(item.content) ? (
              <div dangerouslySetInnerHTML={{ __html: item.content }} />
            ) : (
              <p className="whitespace-pre-wrap text-gray-800">
                {item.content}
              </p>
            )}
          </motion.article>

          {/* Galeri Şeridi (Sticky aside) */}
          {media.length > 0 && (
            <motion.aside
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="lg:col-span-1"
            >
              <div className="rounded-2xl bg-white/85 backdrop-blur shadow border p-4 sticky top-6">
                <h3 className="text-base font-semibold text-brandBlue mb-3">
                  {locale === "en" ? "Media Gallery" : "Medya Galerisi"}
                </h3>

                {/* Horizontal strip with snap */}
                <div className="relative">
                  <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 pr-2">
                    {media.map((m, i) => (
                      <button
                        key={`${m.url}-${i}`}
                        type="button"
                        onClick={() => openLightbox(i)}
                        className="relative shrink-0 snap-start focus:outline-none rounded-xl overflow-hidden border bg-white hover:shadow transition"
                        style={{ width: 140, height: 210 }}
                        title={
                          m.type === "video"
                            ? locale === "en"
                              ? "Open video"
                              : "Videoyu aç"
                            : locale === "en"
                            ? "Open image"
                            : "Görseli aç"
                        }
                      >
                        {m.type === "video" ? (
                          <>
                            <video
                              src={m.url + "#t=0.1"}
                              muted
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20" />
                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full inline-flex items-center gap-1">
                              <Play size={12} /> Video
                            </div>
                          </>
                        ) : (
                          <img
                            src={m.url}
                            alt={`media-${i}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Küçük ipucu */}
                <p className="mt-2 text-[11px] text-gray-500">
                  {locale === "en"
                    ? "Swipe or tap any media item."
                    : "Kaydırın veya bir medyaya tıklayın."}
                </p>
              </div>
            </motion.aside>
          )}
        </div>

        {/* Aşağıda geniş “mozaik” opsiyonu (istiyorsan aç) */}
        {/* 
        {media.length > 0 && (
          <motion.section
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.05 }}
            className="mt-10"
          >
            <h2 className="text-lg font-semibold text-brandBlue mb-4">
              Tüm Medyalar
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {media.map((m, i) =>
                m.type === "video" ? (
                  <video key={i} src={m.url} controls playsInline className="w-full h-full object-cover rounded-xl shadow" />
                ) : (
                  <img key={i} src={m.url} alt={`asset-${i}`} className="w-full h-full object-cover rounded-xl shadow" loading="lazy" />
                )
              )}
            </div>
          </motion.section>
        )} */}
      </div>

      {/* LIGHTBOX */}
      <AnimatePresence>
        {lightboxOpen && media.length > 0 && (
          <Lightbox
            items={media}
            index={lightboxIndex}
            onClose={closeLightbox}
            onPrev={prev}
            onNext={next}
          />
        )}
      </AnimatePresence>

      <div className="mt-12 pb-16" />
    </section>
  );
};

export default JournalDetail;

/* -------------------- Lightbox Component -------------------- */
const Lightbox = ({ items, index, onClose, onPrev, onNext }) => {
  const { locale } = useLocale();
  const [curr, setCurr] = useState(index);
  const startX = useRef(null);

  useEffect(() => setCurr(index), [index]);

  const onBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (dx > 40) {
      onPrev();
      setCurr((p) => (p - 1 + items.length) % items.length);
    } else if (dx < -40) {
      onNext();
      setCurr((p) => (p + 1) % items.length);
    }
    startX.current = null;
  };

  const item = items[curr];

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3"
      onMouseDown={onBackdrop}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 md:top-6 md:right-6 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 text-white"
        aria-label={locale === "en" ? "Close" : "Kapat"}
      >
        <X />
      </button>

      {/* Prev / Next */}
      {items.length > 1 && (
        <>
          <button
            onClick={() => {
              onPrev();
              setCurr((p) => (p - 1 + items.length) % items.length);
            }}
            className="hidden sm:flex absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/30 text-white"
            aria-label={locale === "en" ? "Previous" : "Önceki"}
          >
            <ChevronLeft />
          </button>
          <button
            onClick={() => {
              onNext();
              setCurr((p) => (p + 1) % items.length);
            }}
            className="hidden sm:flex absolute right-4 md:right-6 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/30 text-white"
            aria-label={locale === "en" ? "Next" : "Sonraki"}
          >
            <ChevronRight />
          </button>
        </>
      )}

      {/* Media */}
      <motion.div
        key={item?.url}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative w-full max-w-5xl"
      >
        <div className="relative w-full overflow-hidden rounded-2xl shadow-lg bg-black">
          <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
            {item?.type === "video" ? (
              <video
                src={item.url}
                controls
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-contain bg-black"
              />
            ) : (
              <img
                src={item?.url}
                alt="media"
                className="absolute inset-0 w-full h-full object-contain bg-black"
                loading="eager"
              />
            )}
          </div>
        </div>

        {/* Thumbnails */}
        {items.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto">
            {items.map((m, i) => (
              <button
                key={`${m.url}-${i}`}
                onClick={() => setCurr(i)}
                className={`relative rounded-lg overflow-hidden border shrink-0 ${
                  i === curr
                    ? "ring-2 ring-quaternaryColor border-transparent"
                    : "border-white/30"
                }`}
                style={{ width: 72, height: 48 }}
                aria-label={`${locale === "en" ? "Media" : "Medya"} ${i + 1}`}
              >
                {m.type === "video" ? (
                  <video
                    src={m.url + "#t=0.1"}
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={m.url}
                    alt={`thumb-${i}`}
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
Lightbox.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      url: PropTypes.string.isRequired,
      type: PropTypes.oneOf(["image", "video"]),
      isCover: PropTypes.bool,
    })
  ).isRequired,
  index: PropTypes.number,
  onClose: PropTypes.func.isRequired,
  onPrev: PropTypes.func,
  onNext: PropTypes.func,
};

Lightbox.defaultProps = {
  index: 0,
  onPrev: () => {},
  onNext: () => {},
};
