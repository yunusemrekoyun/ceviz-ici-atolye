import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link, useLocation, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
  Images,
  Layers,
  PlayCircle,
  Tag,
  X,
} from "lucide-react";
import api from "../../api";
import {
  findCachedServiceById,
} from "../../utils/servicesCache";
import {
  getOptimizedImageUrl,
  getOptimizedVideoUrl,
  getVideoPosterUrl,
  looksVideo,
} from "../../utils/media";
import { useLocale } from "../../i18n/LocaleContext";
import { localizePath } from "../../i18n/routing.js";

const fmt = (value, locale) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(locale === "en" ? "en-GB" : "tr-TR");
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const isVideoMedia = (media) =>
  media?.resourceType === "video" || looksVideo(media?.url);

const DETAIL_MEDIA_WIDTH = 1440;
const DETAIL_PREVIEW_WIDTH = 960;
const THUMB_WIDTH = 320;

const firstImageFrom = (items = []) => {
  for (const item of items) {
    const url = item?.url;
    if (!url) continue;
    const isImage =
      item?.resourceType === "image" || (!item?.resourceType && !looksVideo(url));
    if (isImage) return item;
  }
  return null;
};

const pickSubService = (service, subServiceId) => {
  if (!service || !Array.isArray(service.subServices)) return null;
  return (
    service.subServices.find(
      (sub) =>
        String(sub?._id || "") === String(subServiceId || "") ||
        String(sub?.id || "") === String(subServiceId || "")
    ) || null
  );
};

const buildSubServiceMedia = (subService) => {
  if (!subService) return [];
  const list = [];

  if (subService.cover?.url) {
    list.push({
      ...subService.cover,
      url: subService.cover.url,
      posterUrl: subService.cover.posterUrl || "",
      resourceType: subService.cover.resourceType || "image",
    });
  }

  if (Array.isArray(subService.images)) {
    subService.images.forEach((media) => {
      if (!media?.url) return;
      list.push({
        ...media,
        url: media.url,
        posterUrl: media.posterUrl || "",
        resourceType: media.resourceType || "image",
      });
    });
  }

  const seen = new Set();
  return list.filter((media) => {
    if (!media?.url || seen.has(media.url)) return false;
    seen.add(media.url);
    return true;
  });
};

const siblingPreview = (subService) => {
  const coverIsVideo =
    subService?.cover?.resourceType === "video" ||
    looksVideo(subService?.cover?.url);

  return (
    (!coverIsVideo && subService?.cover?.url) ||
    firstImageFrom(subService?.images)?.url ||
    (coverIsVideo ? getVideoPosterUrl(subService?.cover) : "") ||
    ""
  );
};

const SubServiceDetails = () => {
  const { locale } = useLocale();
  const { serviceId, subServiceId } = useParams();
  const location = useLocation();
  const initialParentService =
    location.state?.parentService || findCachedServiceById(serviceId, locale) || null;

  const [parentService, setParentService] = useState(initialParentService);
  const [loading, setLoading] = useState(!initialParentService);
  const [notFound, setNotFound] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [videoModal, setVideoModal] = useState(null);

  useEffect(() => {
    if (!videoModal) return undefined;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setVideoModal(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [videoModal]);

  useEffect(() => {
    if (!serviceId) return;
    let cancelled = false;

    (async () => {
      try {
        if (!initialParentService) setLoading(true);
        const { data } = await api.get(`/services/${serviceId}`, {
          params: { locale },
        });
        if (!cancelled) {
          setParentService(data);
          setNotFound(false);
        }
      } catch (error) {
        console.error("GET /services/:id error:", error?.response?.data || error);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialParentService, locale, serviceId]);

  const subService = useMemo(
    () => pickSubService(parentService, subServiceId),
    [parentService, subServiceId]
  );

  useEffect(() => {
    setActiveIdx(0);
  }, [subServiceId]);

  const media = useMemo(() => buildSubServiceMedia(subService), [subService]);
  const siblings = useMemo(() => {
    if (!Array.isArray(parentService?.subServices)) return [];
    return parentService.subServices.filter(
      (item) => String(item?._id || item?.id || "") !== String(subServiceId || "")
    );
  }, [parentService, subServiceId]);

  const active = media[activeIdx];
  const activeIsVideo = isVideoMedia(active);
  const activePreviewUrl = active
    ? activeIsVideo
      ? getVideoPosterUrl(active, { width: DETAIL_PREVIEW_WIDTH })
      : getOptimizedImageUrl(active, {
          width: DETAIL_MEDIA_WIDTH,
          fallbackSrc: active?.url || "",
        })
    : "";
  const activePlaybackUrl =
    active && activeIsVideo
      ? getOptimizedVideoUrl(active, {
          width: DETAIL_MEDIA_WIDTH,
          purpose: "detail",
        })
      : active?.url || "";

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="animate-pulse text-gray-500">
          {locale === "en" ? "Loading..." : "Yükleniyor…"}
        </div>
      </div>
    );
  }

  if (notFound || !parentService || !subService) {
    return (
      <div className="min-h-[60vh] grid place-items-center p-6">
        <div className="text-center">
          <p className="text-xl font-semibold text-red-600 mb-4">
            {locale === "en" ? "Sub-service not found." : "Alt hizmet bulunamadı."}
          </p>
          <Link
            to={
              serviceId
                ? localizePath(`/services/${serviceId}`, locale)
                : localizePath("/services", locale)
            }
            state={
              serviceId
                ? {
                    title: parentService?.title || "",
                    service: parentService,
                  }
                : undefined
            }
            className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-gray-800 text-white hover:bg-gray-900"
          >
            <ChevronLeft size={16} />
            {locale === "en" ? "Back to main service" : "Ana hizmete dön"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="relative max-w-7xl mx-auto px-4 md:px-8 pt-8 md:pt-12">
      <div className="flex items-center justify-between gap-4 mb-8">
        <Link
          to={localizePath(`/services/${serviceId}`, locale)}
          state={{ title: parentService?.title || "", service: parentService }}
          className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-full bg-white border hover:bg-gray-50"
          aria-label={locale === "en" ? "Back to main service" : "Ana hizmete dön"}
        >
          <ChevronLeft size={16} />
          {parentService?.title || (locale === "en" ? "Back to main service" : "Ana hizmete dön")}
        </Link>
        <div className="text-xs text-gray-500">{fmt(parentService?.createdAt, locale) || ""}</div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)] lg:items-start">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="lg:sticky lg:top-6"
        >
          <div className="rounded-3xl overflow-hidden border bg-white shadow-sm">
            <div className="relative aspect-[9/16] lg:h-[720px] lg:aspect-auto bg-slate-950">
              {active ? (
                activeIsVideo ? (
                  <video
                    key={activePlaybackUrl}
                    src={activePlaybackUrl}
                    poster={activePreviewUrl || undefined}
                    className="absolute inset-0 h-full w-full object-cover lg:object-contain"
                    autoPlay
                    muted
                    playsInline
                    loop
                    controls
                  />
                ) : (
                  <motion.img
                    key={active.url}
                    src={active.url}
                    alt={subService.title}
                    className="absolute inset-0 h-full w-full object-cover lg:object-contain"
                    initial={{ opacity: 0.2, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                  />
                )
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-gray-200 to-gray-300" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent pointer-events-none" />
            </div>

            {media.length > 1 && (
              <div className="p-3">
                <div className="flex gap-2 overflow-x-auto">
                  {media.map((item, index) => (
                    <button
                      key={`${item.url}-${index}`}
                      type="button"
                      onClick={() => setActiveIdx(index)}
                      className={`relative h-16 w-12 rounded-lg overflow-hidden border transition ${
                        index === activeIdx
                          ? "ring-2 ring-brandBlue border-transparent"
                          : "border-gray-200"
                      }`}
                    >
                      {isVideoMedia(item) ? (
                        <>
                          <img
                            src={getVideoPosterUrl(item, { width: THUMB_WIDTH }) || item.url}
                            alt={`${subService.title}-${index + 1}`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/10">
                            <div className="rounded-full border border-white/30 bg-black/45 p-1 text-white backdrop-blur-sm">
                              <PlayCircle size={14} />
                            </div>
                          </div>
                        </>
                      ) : (
                        <img
                          src={getOptimizedImageUrl(item, {
                            width: THUMB_WIDTH,
                            fallbackSrc: item.url,
                          })}
                          alt={`${subService.title}-${index + 1}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <div className="rounded-3xl bg-white/80 backdrop-blur border shadow-sm p-6 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-quaternaryColor">
              {parentService?.title || (locale === "en" ? "Main service" : "Ana hizmet")}
            </p>
            <h1 className="mt-2 text-2xl md:text-4xl font-extrabold text-brandBlue tracking-tight">
              {subService.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              {subService.category && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-quaternaryColor/10 text-quaternaryColor border border-quaternaryColor/30">
                  <Tag size={16} />
                  {subService.category}
                </span>
              )}
              {subService.type && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border">
                  <Layers size={16} />
                  {subService.type}
                </span>
              )}
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border">
                <CalendarDays size={16} />
                {fmt(parentService.createdAt, locale) || "—"}
              </span>
              {Array.isArray(subService.images) && subService.images.length > 0 && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border">
                  <Images size={16} />+{subService.images.length} {locale === "en" ? "media" : "medya"}
                </span>
              )}
            </div>

            {subService.description && (
              <div className="mt-6 leading-relaxed text-gray-700 whitespace-pre-wrap break-words">
                {subService.description}
              </div>
            )}

            {Array.isArray(subService.usageAreas) && subService.usageAreas.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-brandBlue mb-3">
                  {locale === "en" ? "Usage Areas" : "Kullanım Alanları"}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {subService.usageAreas.map((area) => (
                    <span
                      key={`${subService._id || subService.id}-${area}`}
                      className="text-xs px-3 py-1 rounded-full bg-white border text-gray-700"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {siblings.length > 0 && (
        <div className="mt-10 md:mt-14 mb-16">
        <motion.h2
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="text-xl md:text-2xl font-bold text-secondaryColor mb-4"
        >
            {locale === "en" ? "Other Sub-services" : "Diğer Alt Hizmetler"}
          </motion.h2>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {siblings.map((item, index) => {
              const preview = siblingPreview(item);
              const coverIsVideo =
                item?.cover?.resourceType === "video" ||
                looksVideo(item?.cover?.url);

              return (
                <Link
                  key={item?._id || item?.id || `${item?.title}-${index}`}
                  to={localizePath(`/services/${serviceId}/sub-services/${item?._id || item?.id}`, locale)}
                  state={{
                    parentTitle: parentService?.title || "",
                    parentService,
                    subServiceTitle: item?.title || "",
                  }}
                  className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative aspect-[5/4] bg-slate-100">
                    {preview ? (
                      <img
                        src={preview}
                        alt={item.title}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                    {coverIsVideo ? (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
                        <span className="inline-flex translate-y-2 items-center gap-2 rounded-full border border-white/30 bg-black/45 px-4 py-2 text-sm font-semibold text-white opacity-0 backdrop-blur-sm transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                          <PlayCircle size={18} />
                          {locale === "en" ? "Watch video" : "Videoyu izle"}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-brandBlue line-clamp-2">
                        {item.title}
                      </h3>
                      {item.type && (
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
                          {item.type}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="mt-3 text-sm leading-6 text-gray-700 line-clamp-3">
                        {item.description}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <AnimatePresence>
        {videoModal ? (
          <VideoModal item={videoModal} onClose={() => setVideoModal(null)} />
        ) : null}
      </AnimatePresence>
    </section>
  );
};

const VideoModal = ({ item, onClose }) => {
  const { locale } = useLocale();
  if (!item?.url) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/82 p-4 backdrop-blur-sm"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="relative w-full max-w-5xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white shadow-lg transition hover:bg-black/70"
          aria-label={locale === "en" ? "Close video" : "Videoyu kapat"}
        >
          <X size={20} />
        </button>

        <div className="overflow-hidden rounded-[28px] bg-black shadow-[0_40px_120px_-32px_rgba(0,0,0,0.72)]">
          <div className="aspect-video w-full bg-black">
            <video
              src={item.url}
              poster={item.poster || undefined}
              controls
              autoPlay
              playsInline
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        {item.title ? (
          <div className="mt-3 text-center text-sm font-medium text-white/80">
            {item.title}
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  );
};

VideoModal.propTypes = {
  item: PropTypes.shape({
    url: PropTypes.string,
    poster: PropTypes.string,
    title: PropTypes.string,
  }),
  onClose: PropTypes.func.isRequired,
};

export default SubServiceDetails;
