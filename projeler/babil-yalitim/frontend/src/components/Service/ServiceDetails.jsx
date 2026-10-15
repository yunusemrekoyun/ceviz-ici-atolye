import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  CalendarDays,
  Tag,
  Images,
  Layers,
  PlayCircle,
} from "lucide-react";
import api from "../../api";
import OtherServices from "./OtherServices";
import {
  getOptimizedImageUrl,
  getOptimizedVideoUrl,
  getVideoPosterUrl,
  looksVideo,
} from "../../utils/media";
import {
  fetchServicesCached,
  findCachedServiceById,
  getCachedServices,
} from "../../utils/servicesCache";
import { useLocale } from "../../i18n/LocaleContext";
import { localizePath } from "../../i18n/routing.js";

const fmt = (v, locale) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString(locale === "en" ? "en-GB" : "tr-TR");
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const firstImageFrom = (images = []) => {
  for (const m of images) {
    const u = m?.url;
    if (!u) continue;
    const isImg =
      m?.resourceType === "image" || (!m?.resourceType && !looksVideo(u));
    if (isImg) return u;
  }
  return null;
};

const isVideoMedia = (media) =>
  media?.resourceType === "video" || looksVideo(media?.url);

const DETAIL_MEDIA_WIDTH = 1440;
const DETAIL_PREVIEW_WIDTH = 960;
const THUMB_WIDTH = 320;

const buildRelatedServices = (services, currentService) => {
  if (!Array.isArray(services) || !currentService?._id) return [];

  let relatedItems = services.filter(
    (item) =>
      item._id !== currentService._id &&
      (item.category || "").trim() === (currentService.category || "").trim()
  );

  if (relatedItems.length < 4) {
    const rest = services.filter(
      (item) =>
        item._id !== currentService._id &&
        !relatedItems.some((related) => related._id === item._id)
    );
    relatedItems = [...relatedItems, ...rest];
  }

  return relatedItems.slice(0, 4);
};

const ServiceDetails = () => {
  const { locale } = useLocale();
  const { id } = useParams();
  const location = useLocation();
  const initialService =
    location.state?.service || findCachedServiceById(id, locale) || null;
  const initialServicePool = getCachedServices(locale) || [];
  const [svc, setSvc] = useState(initialService);
  const [loading, setLoading] = useState(!initialService);
  const [notFound, setNotFound] = useState(false);

  const [activeIdx, setActiveIdx] = useState(0);
  const [servicePool, setServicePool] = useState(initialServicePool);
  const [related, setRelated] = useState(() =>
    buildRelatedServices(initialServicePool, initialService)
  );
  const [loadingRelated, setLoadingRelated] = useState(
    () => initialServicePool.length === 0
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        if (!initialService) setLoading(true);
        const { data } = await api.get(`/services/${id}`, {
          params: { locale },
        });
        if (!cancelled) {
          setSvc(data);
          setActiveIdx(0);
          setNotFound(false);
        }
      } catch (e) {
        console.error("GET /services/:id error:", e?.response?.data || e);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, initialService, locale]);

  // --- MEDYA: {url, type} olarak kur (video için gerekli) ---
  const media = useMemo(() => {
    if (!svc) return [];
    const list = [];

    if (svc.cover?.url) {
      list.push({
        ...svc.cover,
        url: svc.cover.url,
        posterUrl: svc.cover.posterUrl || "",
        resourceType: svc.cover.resourceType || "image",
      });
    } else if (svc.imageUrl) {
      list.push({ url: svc.imageUrl, resourceType: "image" });
    } else if (svc.imageDataUrl) {
      list.push({ url: svc.imageDataUrl, resourceType: "image" });
    }

    if (Array.isArray(svc.images)) {
      svc.images.forEach((m) => {
        if (m?.url) {
          list.push({
            ...m,
            url: m.url,
            posterUrl: m.posterUrl || "",
            resourceType: m.resourceType || "image",
          });
        }
      });
    }
    if (Array.isArray(svc.galleryDataUrls)) {
      svc.galleryDataUrls.forEach((u) =>
        list.push({ url: u, resourceType: "image" })
      );
    }

    // aynı url'leri temizle
    const unique = [];
    const seen = new Set();
    for (const m of list) {
      if (!seen.has(m.url)) {
        seen.add(m.url);
        unique.push(m);
      }
    }
    return unique;
  }, [svc]);

  // Related
  useEffect(() => {
    let cancelled = false;
    if (!svc) return;
    (async () => {
      try {
        setLoadingRelated(true);
        const list = await fetchServicesCached({ locale });
        const rel = buildRelatedServices(list, svc);
        if (!cancelled) {
          setServicePool(list);
          setRelated(rel);
        }
      } catch (e) {
        console.error("GET /services (related) error:", e?.response?.data || e);
      } finally {
        if (!cancelled) setLoadingRelated(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [svc, locale]);

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

  if (notFound || !svc) {
    return (
      <div className="min-h-[60vh] grid place-items-center p-6">
        <div className="text-center">
          <p className="text-xl font-semibold text-red-600 mb-4">
            {locale === "en" ? "Service not found." : "Servis bulunamadı."}
          </p>
          <Link
            to={localizePath("/services", locale)}
            className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-gray-800 text-white hover:bg-gray-900"
          >
            <ChevronLeft size={16} />
            {locale === "en" ? "Back to services" : "Hizmetler sayfasına dön"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="relative max-w-7xl mx-auto px-4 md:px-8 pt-8 md:pt-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <Link
          to={localizePath("/services", locale)}
          className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-full bg-white border hover:bg-gray-50"
          aria-label={locale === "en" ? "Back to services" : "Hizmetlere dön"}
        >
          <ChevronLeft size={16} />
          {locale === "en" ? "Back" : "Geri"}
        </Link>
        <div className="text-xs text-gray-500">{fmt(svc?.createdAt, locale) || ""}</div>
      </div>

      {/* Layout */}
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
                    className="absolute inset-0 w-full h-full object-cover lg:object-contain"
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
                    alt={svc.title}
                    className="absolute inset-0 w-full h-full object-cover lg:object-contain"
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
                  {media.map((m, i) => (
                    <button
                      key={`${m.url}-${i}`}
                      type="button"
                      onClick={() => setActiveIdx(i)}
                      className={`relative h-16 w-12 rounded-lg overflow-hidden border transition ${
                        i === activeIdx
                          ? "ring-2 ring-brandBlue border-transparent"
                          : "border-gray-200"
                      }`}
                      title={`${locale === "en" ? "Image" : "Görsel"} ${i + 1}`}
                    >
                      {isVideoMedia(m) ? (
                        <>
                          <img
                            src={
                              getVideoPosterUrl(m, {
                                width: THUMB_WIDTH,
                              }) || m.url
                            }
                            alt={`thumb-${i}`}
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
                          src={getOptimizedImageUrl(m, {
                            width: THUMB_WIDTH,
                            fallbackSrc: m.url,
                          })}
                          alt={`thumb-${i}`}
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
            <h1 className="text-2xl md:text-4xl font-extrabold text-brandBlue tracking-tight">
              {svc.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-quaternaryColor/10 text-quaternaryColor border border-quaternaryColor/30">
                <Tag size={16} />
                {svc.category || (locale === "en" ? "No category" : "Kategori yok")}
              </span>
              {svc.type && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border">
                  <Layers size={16} />
                  {svc.type}
                </span>
              )}
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border">
                <CalendarDays size={16} />
                {fmt(svc.createdAt, locale) || "—"}
              </span>
              {Array.isArray(svc.images) && svc.images.length > 0 && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 border">
                  <Images size={16} />+{svc.images.length} {locale === "en" ? "media" : "medya"}
                </span>
              )}
            </div>

            {svc.description && (
              <div className="mt-6 leading-relaxed text-gray-700 whitespace-pre-wrap break-words">
                {svc.description}
              </div>
            )}

            {Array.isArray(svc.usageAreas) && svc.usageAreas.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-brandBlue mb-3">
                  {locale === "en" ? "Usage Areas" : "Kullanım Alanları"}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {svc.usageAreas.map((u) => (
                    <span
                      key={u}
                      className="text-xs px-3 py-1 rounded-full bg-white border text-gray-700"
                    >
                      {u}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

        </motion.div>
      </div>

      {Array.isArray(svc.subServices) && svc.subServices.length > 0 && (
        <div className="mt-10">
          <h3 className="text-xl font-semibold text-brandBlue mb-4">
            {locale === "en" ? "Sub-services" : "Alt Hizmetler"}
          </h3>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {svc.subServices.map((sub, index) => {
              const subCoverIsVideo =
                sub?.cover?.resourceType === "video" ||
                looksVideo(sub?.cover?.url);
              const subPreview =
                (!subCoverIsVideo && sub?.cover?.url) ||
                firstImageFrom(sub?.images) ||
                (subCoverIsVideo ? getVideoPosterUrl(sub?.cover) : null) ||
                "";

              return (
                <Link
                  key={sub?._id || `${sub?.title}-${index}`}
                  to={localizePath(`/services/${svc._id}/sub-services/${sub?._id || sub?.id}`, locale)}
                  state={{
                    parentTitle: svc?.title || "",
                    parentService: svc,
                    subServiceTitle: sub?.title || "",
                  }}
                  className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative aspect-[5/4] bg-slate-100">
                    {subPreview ? (
                      <img
                        src={subPreview}
                        alt={sub.title}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : subCoverIsVideo ? (
                      <video
                        src={sub.cover.url}
                        className="absolute inset-0 h-full w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                    {subCoverIsVideo ? (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
                        <span className="inline-flex translate-y-2 items-center gap-2 rounded-full border border-white/30 bg-black/45 px-4 py-2 text-sm font-semibold text-white opacity-0 backdrop-blur-sm transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                          <PlayCircle size={18} />
                          {locale === "en" ? "Watch video" : "Videoyu izle"}
                        </span>
                      </div>
                    ) : null}
                    {subCoverIsVideo ? (
                      <span className="pointer-events-none absolute right-3 top-3 rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                        Video
                      </span>
                    ) : null}
                  </div>
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold text-brandBlue line-clamp-2">
                        {sub.title}
                      </h4>
                      {sub.type && (
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
                          {sub.type}
                        </span>
                      )}
                      {sub.category && (
                        <span className="inline-flex rounded-full bg-quaternaryColor/10 px-3 py-1 text-[11px] font-semibold text-quaternaryColor">
                          {sub.category}
                        </span>
                      )}
                    </div>
                    {sub.description && (
                      <p className="mt-3 text-sm leading-6 text-gray-700 line-clamp-3">
                        {sub.description}
                      </p>
                    )}
                    {Array.isArray(sub.usageAreas) && sub.usageAreas.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {sub.usageAreas.slice(0, 3).map((area) => (
                          <span
                            key={`${sub._id || sub.title}-${area}`}
                            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8 lg:hidden">
        <OtherServices
          currentId={svc._id}
          services={servicePool}
          loading={loadingRelated}
        />
      </div>

      <div className="hidden lg:block mt-10 md:mt-14 mb-16">
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="text-xl md:text-2xl font-bold text-secondaryColor mb-4"
        >
          {locale === "en" ? "Other Services" : "Diğer Hizmetler"}
        </motion.h2>

        {loadingRelated ? (
          <div className="text-sm text-gray-500">
            {locale === "en" ? "Loading..." : "Yükleniyor…"}
          </div>
        ) : related.length === 0 ? (
          <div className="text-sm text-gray-500">
            {locale === "en" ? "No other services yet." : "Henüz başka hizmet yok."}
          </div>
        ) : (
          <div className="hidden lg:grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((it) => {
              const coverUrl = it?.cover?.url || "";
              const coverIsVideo =
                it?.cover?.resourceType === "video" || looksVideo(coverUrl);

              // 1) Galeriden ilk image
              const galleryImg = firstImageFrom(it?.images);

              // 2) Kapak video ise Cloudinary'den ilk kare thumb dene
              const videoThumb = coverIsVideo
                ? getVideoPosterUrl(it?.cover || { url: coverUrl, resourceType: "video" })
                : null;

              // 3) Kapak image ise onu kullan
              const coverImage = !coverIsVideo ? coverUrl : null;

              // Öncelik: galleryImg > coverImage > videoThumb > legacy
              const preview =
                galleryImg ||
                coverImage ||
                videoThumb ||
                it?.imageDataUrl ||
                it?.imageUrl ||
                "";

              return (
                <Link
                  key={it._id}
                  to={localizePath(`/services/${it._id}`, locale)}
                  state={{ title: it?.title || "", service: it }}
                  className="group rounded-2xl overflow-hidden border bg-white hover:shadow-md transition"
                >
                  <div className="relative aspect-[9/16]">
                    {preview ? (
                      <img
                        src={preview}
                        alt={it.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : coverIsVideo ? (
                      // son çare: video'yu metadata ile, gerekirse poster düşer
                      <video
                        src={coverUrl}
                        muted
                        playsInline
                        preload="metadata"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gray-200" />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                      <div className="text-sm font-semibold line-clamp-2">
                        {it.title}
                      </div>
                      {it.category && (
                        <div className="mt-1 text-[11px] px-2 py-0.5 inline-block rounded-full bg-white/20 border border-white/30 backdrop-blur">
                          {it.category}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

    </section>
  );
};

export default ServiceDetails;
