// src/components/Blog/BlogDetail.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../api";
import { localizePath } from "../../i18n/routing.js";
import {
  Share2,
  Check,
  Link as LinkIcon,
  Clock,
  PlayCircle,
  Images,
} from "lucide-react";
import PropTypes from "prop-types";
import OtherBlogs from "./OtherBlogs";
import {
  getOptimizedImageUrl,
  getOptimizedVideoUrl,
  getVideoPosterUrl,
  looksVideo,
} from "../../utils/media";
import { usePerformanceProfile } from "../../performance/PerformanceProvider";
import { useLocale } from "../../i18n/LocaleContext";

/* ---------- helpers ---------- */
const stripHtml = (html) =>
  String(html || "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const FALLBACK_MEDIA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTIwMCcgaGVpZ2h0PSc4MDBcJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnPjxyZWN0IGZpbGw9JyNlZWUnIHdpZHRoPScxMDAlJyBoZWlnaHQ9JzEwMCUnLz48L3N2Zz4=";

const getMediaType = (media) => {
  const url = media?.url || media || "";
  return media?.resourceType === "video" || looksVideo(url) ? "video" : "image";
};

const getMediaPreviewSrc = (
  media,
  { width = 1600, quality = "auto:good" } = {}
) => {
  if (!media) return FALLBACK_MEDIA;
  return getMediaType(media) === "video"
    ? getVideoPosterUrl(media, { width, quality })
    : getOptimizedImageUrl(media, {
        width,
        quality,
        fallbackSrc: FALLBACK_MEDIA,
      });
};

const getMediaPlaybackSrc = (
  media,
  { width = 1600 } = {}
) => {
  if (!media) return "";
  return getMediaType(media) === "video"
    ? getOptimizedVideoUrl(media, {
        width,
        purpose: "detail",
      })
    : media?.url || media || "";
};

const truncateText = (value, max = 280) => {
  const text = stripHtml(value || "");
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}...`;
};

const toParagraphs = (htmlOrText) => {
  if (!htmlOrText) return [];
  const plain = stripHtml(htmlOrText);
  // boş satır/satırsonuna göre parçala
  return plain
    .split(/\n{2,}|\r{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
};

const readingTime = (htmlOrText) => {
  const words = stripHtml(htmlOrText).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220)); // ~220 wpm
};

// İçerikten h2/h3 başlıkları çıkar (TOC için)
const extractHeadings = (html) => {
  if (!html) return [];
  // basit parser: <h2>..</h2>, <h3>..</h3>
  const out = [];
  const h2 = [...String(html).matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(
    (m) => ({ level: 2, text: stripHtml(m[1]) })
  );
  const h3 = [...String(html).matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)].map(
    (m) => ({ level: 3, text: stripHtml(m[1]) })
  );
  // sırayı koru
  const all = [...h2, ...h3];
  // metinde geçtiği sıraya göre sort etmek için indexOf kullan
  all.sort(
    (a, b) => String(html).indexOf(a.text) - String(html).indexOf(b.text)
  );
  // id üret
  let seen = new Set();
  for (const h of all) {
    let slug = h.text
      .toLowerCase()
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .replace(/\s+/g, "-");
    if (!slug) slug = "bolum";
    // çakışmayı engelle
    let s = slug,
      i = 2;
    while (seen.has(s)) {
      s = `${slug}-${i++}`;
    }
    seen.add(s);
    out.push({ ...h, id: s });
  }
  return out;
};

// İçeriğe heading id'leri enjekte et (render için)
const injectHeadingIds = (html, toc) => {
  if (!html || toc.length === 0) return html;
  let temp = html;
  for (const h of toc) {
    const tag = h.level === 3 ? "h3" : "h2";
    // yalnızca ilk eşleşmeyi id ile değiştir
    const re = new RegExp(`<${tag}([^>]*)>([\\s\\S]*?)</${tag}>`, "i");
    temp = temp.replace(re, (m, attrs, inner) => {
      if (stripHtml(inner).includes(h.text)) {
        // zaten id varsa eklemeyelim
        if (/id="/i.test(attrs)) return m;
        return `<${tag} id="${h.id}" ${attrs}>${inner}</${tag}>`;
      }
      return m;
    });
  }
  return temp;
};

/* ---------- UI bits ---------- */
// progressive image (blur → sharp)
const ProgressiveImg = ({
  src,
  alt,
  className,
  loading = "lazy",
  fetchPriority = "auto",
}) => {
  const [loaded, setLoaded] = useState(false);
  const priorityProps = fetchPriority ? { fetchpriority: fetchPriority } : {};
  return (
    <img
      {...priorityProps}
      src={src}
      alt={alt}
      onLoad={() => setLoaded(true)}
      loading={loading}
      decoding="async"
      className={`${className} transition-[filter,transform,opacity] duration-700 ${
        loaded
          ? "opacity-100 filter-none scale-100"
          : "opacity-80 blur-sm scale-[1.01]"
      }`}
    />
  );
};
ProgressiveImg.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string,
  className: PropTypes.string,
  loading: PropTypes.oneOf(["lazy", "eager"]),
  fetchPriority: PropTypes.oneOf(["high", "low", "auto"]),
};
ProgressiveImg.defaultProps = {
  alt: "",
  className: "",
  loading: "lazy",
  fetchPriority: "auto",
};

const Skeleton = () => (
  <div className="animate-pulse">
    <div className="h-64 md:h-80 w-full rounded-2xl bg-gray-200/70 mb-6" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 rounded-2xl bg-white/50 backdrop-blur-xl border border-white/40 p-6">
        <div className="h-8 w-2/3 bg-gray-200/80 rounded mb-4" />
        <div className="h-4 w-full bg-gray-200/70 rounded mb-2" />
        <div className="h-4 w-5/6 bg-gray-200/70 rounded mb-2" />
        <div className="h-4 w-2/3 bg-gray-200/70 rounded" />
      </div>
      <div className="rounded-2xl bg-white/50 backdrop-blur-xl border border-white/40 p-6">
        <div className="h-5 w-24 bg-gray-200/80 rounded mb-4" />
        <div className="h-4 w-full bg-gray-200/70 rounded mb-2" />
        <div className="h-4 w-5/6 bg-gray-200/70 rounded mb-2" />
        <div className="h-4 w-4/6 bg-gray-200/70 rounded" />
      </div>
    </div>
  </div>
);

/* ---------- main ---------- */
const BlogDetail = () => {
  const { locale } = useLocale();
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    cardImageWidth,
    detailImageWidth,
    imageQuality,
    videoQuality,
    isMobile,
  } = usePerformanceProfile();

  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);
  const [commentStatus, setCommentStatus] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", body: "" });

  // okuma ilerleme
  const articleRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`/blogs/${id}`, {
          params: { locale },
        });
        if (!cancelled) {
          setBlog(res.data || null);
          setErr("");
        }
      } catch (e) {
        console.error("Blog getirilemedi:", e?.response?.data || e);
        if (!cancelled) {
          setErr(locale === "en" ? "Blog post not found." : "Blog bulunamadı.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, locale]);

  // progress hesapla
  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;
    const onScroll = () => {
      // eslint-disable-next-line no-unused-vars
      const rect = el.getBoundingClientRect();
      const total = el.scrollHeight - window.innerHeight * 0.6;
      const passed = Math.min(
        Math.max(window.scrollY - (el.offsetTop - window.innerHeight * 0.2), 0),
        total
      );
      setProgress(total > 0 ? Math.round((passed / total) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [blog]);

  const dateText = useMemo(() => {
    const d = blog?.createdAt;
    return d
      ? new Date(d).toLocaleDateString(locale === "en" ? "en-GB" : "tr-TR")
      : "";
  }, [blog, locale]);

  const rtime = useMemo(() => readingTime(blog?.content), [blog]);
  const toc = useMemo(() => extractHeadings(blog?.content), [blog]);
  const contentWithIds = useMemo(
    () => injectHeadingIds(blog?.content || "", toc),
    [blog, toc]
  );

  const paras = useMemo(() => toParagraphs(blog?.content), [blog]);
  const leadText = useMemo(() => truncateText(blog?.content, 260), [blog]);
  const commentsCount = Number(blog?.comments?.length || 0);
  const coverMedia = useMemo(() => {
    if (!blog?.cover?.url) return null;
    return {
      url: blog.cover.url,
      resourceType: getMediaType(blog.cover),
      caption: blog.cover.caption || blog.title || "Kapak medya",
      storageKey: blog.cover.storageKey || "",
      posterUrl: blog.cover.posterUrl || "",
    };
  }, [blog]);
  // ---- BLOG MEDYA TOPLAYICI ----
  const assets = useMemo(() => {
    if (!blog) return [];

    const out = [];

    const pushNormalized = (m) => {
      if (!m) return;
      const url = m.url || m.secure_url || m.src;
      if (!url) return;
      const type = getMediaType({
        resourceType: m.resourceType || m.resource_type,
        url,
      });

      out.push({
        url,
        resourceType: type,
        caption: m.caption || m.alt || m.title || "",
        storageKey: m.storageKey || "",
        posterUrl: m.posterUrl || "",
      });
    };

    // 1) assets (bizim planladığımız)
    if (Array.isArray(blog.assets)) blog.assets.forEach(pushNormalized);

    // 2) olası alternatif alanlar
    if (Array.isArray(blog.media)) blog.media.forEach(pushNormalized);
    if (Array.isArray(blog.images)) blog.images.forEach(pushNormalized);
    if (Array.isArray(blog.gallery)) blog.gallery.forEach(pushNormalized);
    if (Array.isArray(blog.galleryDataUrls))
      blog.galleryDataUrls.forEach((url) => pushNormalized({ url }));

    // 3) kapak’ı da dahil etmek istersen (thumb amaçlı)
    // NOT: Kapak zaten hero’da görünüyor; istersen yorumu kaldır.
    // if (blog.cover?.url) pushNormalized({ url: blog.cover.url, caption: "Kapak" });

    // 4) URL’e göre uniq yap
    const seen = new Set();
    const uniq = [];
    for (const m of out) {
      if (!seen.has(m.url)) {
        seen.add(m.url);
        uniq.push(m);
      }
    }
    return uniq;
  }, [blog]);

  const mediaItems = useMemo(() => {
    const collected = [];
    if (coverMedia) collected.push(coverMedia);
    assets.forEach((item) => collected.push(item));

    const seen = new Set();
    return collected.filter((item) => {
      if (!item?.url || seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  }, [assets, coverMedia]);

  const primaryMedia = useMemo(
    () => coverMedia || assets[0] || null,
    [assets, coverMedia]
  );
  const galleryMedia = useMemo(
    () => mediaItems.filter((item) => item.url !== primaryMedia?.url),
    [mediaItems, primaryMedia]
  );
  const primaryMediaIndex = useMemo(
    () => mediaItems.findIndex((item) => item.url === primaryMedia?.url),
    [mediaItems, primaryMedia]
  );
  const heroPreviewWidth = isMobile ? Math.max(cardImageWidth, 720) : detailImageWidth;
  const galleryPreviewWidth = isMobile
    ? Math.max(cardImageWidth, 640)
    : Math.min(detailImageWidth, 1200);
  const lightboxPreviewWidth = isMobile
    ? Math.max(cardImageWidth, 960)
    : detailImageWidth;
  const lightboxPlaybackWidth = isMobile
    ? Math.max(cardImageWidth, 960)
    : detailImageWidth;

  // lightbox state & helpers
  const [lbOpen, setLbOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);
  const openLb = (i) => {
    setLbIndex(i);
    setLbOpen(true);
  };
  const closeLb = () => setLbOpen(false);
  const prevLb = () =>
    setLbIndex((i) =>
      mediaItems.length ? (i - 1 + mediaItems.length) % mediaItems.length : 0
    );
  const nextLb = () =>
    setLbIndex((i) => (mediaItems.length ? (i + 1) % mediaItems.length : 0));

  /* --------------- render --------------- */
  if (loading) return <Skeleton />;
  if (err || !blog) {
    return (
      <div className="text-center py-20 text-red-500 text-lg font-semibold bg-white/50 backdrop-blur-xl rounded-2xl border border-white/40">
        {err || (locale === "en" ? "Blog post not found." : "Blog bulunamadı.")}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* İlerleme çubuğu */}
      <div className="sticky top-0 z-40 h-1.5 bg-transparent">
        <div
          className="h-full bg-quaternaryColor transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={`relative overflow-hidden rounded-[32px] border border-white/50 bg-white/85 p-6 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.45)] backdrop-blur-xl md:p-8 ${
            primaryMedia ? "lg:col-span-5" : "lg:col-span-12"
          }`}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_36%)]" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-secondaryColor px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                {locale === "en" ? "Blog Post" : "Blog Yazisi"}
              </span>
              {dateText ? (
                <span className="rounded-full border border-slate-200/80 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  {dateText}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/85 px-3 py-1 text-[11px] font-semibold text-slate-600">
                <Clock size={12} /> ~{rtime} {locale === "en" ? "min read" : "dk okuma"}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-bold leading-tight text-slate-900 md:text-5xl">
              {blog.title}
            </h1>

            {leadText ? (
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                {leadText}
              </p>
            ) : null}

            {Array.isArray(blog.tags) && blog.tags.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {blog.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-quaternaryColor/20 bg-quaternaryColor/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-quaternaryColor"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <InfoPill
                label={locale === "en" ? "Total Media" : "Toplam Medya"}
                value={String(mediaItems.length || 0)}
              />
              <InfoPill
                label={locale === "en" ? "Comments" : "Yorum"}
                value={String(commentsCount)}
              />
              <InfoPill
                label={locale === "en" ? "Content" : "İçerik"}
                value={
                  toc.length
                    ? `${toc.length} ${locale === "en" ? "headings" : "başlık"}`
                    : locale === "en"
                    ? "Free flow"
                    : "Serbest akış"
                }
              />
            </div>
          </div>
        </motion.section>

        {primaryMedia ? (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="lg:col-span-7"
          >
            <HeroMediaCard
              media={primaryMedia}
              title={blog.title}
              mediaCount={mediaItems.length}
              previewWidth={heroPreviewWidth}
              imageQuality={imageQuality}
              onOpen={() => openLb(primaryMediaIndex >= 0 ? primaryMediaIndex : 0)}
            />
          </motion.section>
        ) : null}
      </div>

      {galleryMedia.length > 0 ? (
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="mt-8 rounded-[32px] border border-white/45 bg-white/82 p-5 shadow-[0_24px_70px_-54px_rgba(15,23,42,0.42)] backdrop-blur-xl md:p-6"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <Images size={14} />
                {locale === "en" ? "Blog Gallery" : "Blog Galerisi"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                {locale === "en" ? "Additional media" : "Ek medya içerikleri"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {locale === "en"
                  ? "Browse the images and videos attached to this post more comfortably."
                  : "Yazıya eklenen görsel ve videoları daha rahat inceleyebilirsiniz."}
              </p>
            </div>
            <p className="text-sm font-medium text-slate-500">
              {galleryMedia.length} {locale === "en" ? "media" : "medya"}
            </p>
          </div>

          <div className="mt-5 grid auto-rows-[180px] gap-4 md:grid-cols-3 lg:auto-rows-[210px]">
            {galleryMedia.map((media, index) => (
              <MediaThumb
                key={`${media.url}-${index}`}
                m={media}
                previewWidth={galleryPreviewWidth}
                imageQuality={imageQuality}
                onClick={() =>
                  openLb(mediaItems.findIndex((item) => item.url === media.url))
                }
                className={
                  index === 0 && galleryMedia.length > 2
                    ? "md:col-span-2 md:row-span-2"
                    : ""
                }
                showCaption
              />
            ))}
          </div>
        </motion.section>
      ) : null}

      {/* İçerik + yan panel */}
      <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Makale */}
        <motion.article
          ref={articleRef}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-[32px] border border-white/45 bg-white/82 p-6 shadow-[0_22px_64px_-52px_rgba(15,23,42,0.42)] backdrop-blur-xl md:p-8"
        >
          {/* Zengin içerik (başlık id’leri enjekte edilmiş) */}
          {/<[a-z][\s\S]*>/i.test(blog.content) ? (
            <div
              className="rich-content prose prose-sm max-w-none prose-p:leading-7 prose-img:rounded-2xl prose-headings:text-secondaryColor md:prose-base lg:prose-lg"
              // Başlık bağlantısı için anchor ikonunu css ile göstereceğiz
              dangerouslySetInnerHTML={{ __html: contentWithIds }}
              onClick={(e) => {
                // başlığa tıkla → link kopyala
                const target = e.target;
                if (["H1", "H2", "H3"].includes(target.tagName) && target.id) {
                  const url = `${location.origin}${location.pathname}#${target.id}`;
                  navigator.clipboard.writeText(url).catch(() => {});
                }
              }}
            />
          ) : (
            <div className="prose prose-sm md:prose-base lg:prose-lg max-w-none">
              {paras.length ? (
                paras.map((paragraph, index) => (
                  <p key={`p-${index}`} className="text-gray-800 leading-7">
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="text-gray-500">
                  {locale === "en" ? "Content coming soon." : "İçerik yakında."}
                </p>
              )}
            </div>
          )}
        </motion.article>

        {/* Yan panel (sticky) */}
        <div className="space-y-6 xl:sticky xl:top-6">
          <AsideTools toc={toc} onBack={() => navigate(localizePath("/blog", locale))} />
          <OtherBlogs currentId={blog._id} limit={6} />
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lbOpen && (
          <Lightbox
            items={mediaItems}
            index={lbIndex}
            previewWidth={lightboxPreviewWidth}
            playbackWidth={lightboxPlaybackWidth}
            imageQuality={imageQuality}
            videoQuality={videoQuality}
            onClose={closeLb}
            onPrev={prevLb}
            onNext={nextLb}
          />
        )}
      </AnimatePresence>

      {/* Yorumlar */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4 }}
        className="mt-8 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/40 shadow-md p-5 md:p-8"
      >
        <h3 className="text-xl font-semibold text-secondaryColor mb-4">
          {locale === "en" ? "Comments" : "Yorumlar"}
        </h3>

        <div className="space-y-4">
          {(blog.comments || []).length === 0 && (
            <p className="text-gray-500">
              {locale === "en" ? "No comments yet." : "Henüz yorum yok."}
            </p>
          )}
          {(blog.comments || []).map((c) => (
            <div
              key={c._id}
              className="bg-white/90 rounded-xl px-4 py-3 border border-white/50"
            >
              <p className="text-sm font-semibold text-gray-800">{c.name}</p>
              <p className="text-sm text-gray-700">{c.body}</p>
              <p className="text-[11px] text-gray-400 mt-1">
                {c.createdAt
                  ? new Date(c.createdAt).toLocaleString(
                      locale === "en" ? "en-GB" : "tr-TR"
                    )
                  : ""}
              </p>
            </div>
          ))}
        </div>

        {/* Yorum formu */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              setSending(true);
              setCommentStatus(null);
              await api.post(`/blogs/${id}/comments`, form);
              setCommentStatus({
                type: "success",
                text:
                  locale === "en"
                    ? "Comment received and pending approval."
                    : "Yorum alindi, onay bekliyor.",
              });
              setForm({ name: "", email: "", body: "" });
            } catch (e2) {
              console.error(e2);
              setCommentStatus({
                type: "error",
                text:
                  e2?.response?.data?.error ||
                  e2?.response?.data?.message ||
                  (locale === "en" ? "Comment could not be sent." : "Yorum gonderilemedi."),
              });
            } finally {
              setSending(false);
            }
          }}
          className="mt-6 grid gap-3 md:grid-cols-2"
        >
          <input
            type="text"
            placeholder={locale === "en" ? "Your name" : "Adınız"}
            className="rounded-xl border border-gray-200 bg-white/80 px-4 py-3 outline-none focus:ring-2 focus:ring-quaternaryColor"
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            required
          />
          <input
            type="email"
            placeholder={locale === "en" ? "Email" : "E-posta"}
            className="rounded-xl border border-gray-200 bg-white/80 px-4 py-3 outline-none focus:ring-2 focus:ring-quaternaryColor"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            required
          />
          <textarea
            placeholder={locale === "en" ? "Your comment" : "Yorumunuz"}
            className="md:col-span-2 rounded-xl border border-gray-200 bg-white/80 px-4 py-3 outline-none focus:ring-2 focus:ring-quaternaryColor min-h-[110px]"
            value={form.body}
            onChange={(e) => setForm((s) => ({ ...s, body: e.target.value }))}
            required
          />
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={sending}
              className="px-5 py-2 rounded-full bg-quaternaryColor text-white hover:bg-quaternaryColor/90 disabled:opacity-60 transition"
            >
              {sending
                ? locale === "en"
                  ? "Sending..."
                  : "Gönderiliyor…"
                : locale === "en"
                ? "Send Comment"
                : "Yorumu Gönder"}
            </button>
          </div>
          {commentStatus && (
            <div
              className={`md:col-span-2 rounded-xl border px-4 py-3 text-sm ${
                commentStatus.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {commentStatus.text}
            </div>
          )}
        </form>
      </motion.section>
    </div>
  );
};

export default BlogDetail;

/* ---------- Reusable pieces ---------- */
/* ---------------- Lightbox ---------------- */
const Lightbox = ({
  items,
  index,
  previewWidth,
  playbackWidth,
  imageQuality,
  videoQuality,
  onClose,
  onPrev,
  onNext,
}) => {
  const { locale } = useLocale();
  const videoRef = useRef(null);
  const [videoReady, setVideoReady] = useState(false);

  // ESC ve ok tuşları
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const cur = items[index];
  const isVideo = cur ? getMediaType(cur) === "video" : false;

  useEffect(() => {
    setVideoReady(false);
  }, [cur?.url, index]);

  useEffect(() => {
    if (!cur || !isVideo || !videoRef.current) return;

    const video = videoRef.current;
    video.muted = false;
    video.defaultMuted = false;
    video.volume = 1;

    const playPromise = video.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {
        // Tarayıcı sesli autoplay'i engellerse kullanıcı native control ile başlatır.
      });
    }
  }, [cur, isVideo]);

  if (!cur) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      {/* İç kart (propagation stop) */}
      <div
        className="relative w-full max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Medya */}
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
          {isVideo ? (
            <>
              <img
                src={getMediaPreviewSrc(cur, {
                  width: previewWidth,
                  quality: imageQuality,
                })}
                alt={cur.caption || (locale === "en" ? "media" : "medya")}
                className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
                  videoReady ? "opacity-0" : "opacity-100"
                }`}
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
              <video
                ref={videoRef}
                src={getMediaPlaybackSrc(cur, {
                  width: playbackWidth,
                  quality: videoQuality,
                })}
                controls
                playsInline
                preload="metadata"
                poster={getMediaPreviewSrc(cur, {
                  width: previewWidth,
                  quality: imageQuality,
                })}
                className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${
                  videoReady ? "opacity-100" : "opacity-0"
                }`}
                onCanPlay={() => setVideoReady(true)}
                onLoadedData={() => setVideoReady(true)}
                onError={() => setVideoReady(false)}
              />
            </>
          ) : (
            <img
              src={getMediaPreviewSrc(cur, {
                width: previewWidth,
                quality: imageQuality,
              })}
              alt={cur.caption || "media"}
              
              className="absolute inset-0 w-full h-full object-contain"
            />
          )}
        </div>

        {/* Caption */}
        {cur.caption && (
          <div className="mt-3 text-center text-sm text-white/90">
            {cur.caption}
          </div>
        )}

        {/* Kontroller */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 md:-top-3 md:-right-3 bg-white text-gray-900 rounded-full px-3 py-1.5 shadow hover:shadow-md"
          aria-label={locale === "en" ? "Close" : "Kapat"}
        >
          {locale === "en" ? "Close" : "Kapat"}
        </button>

        {items.length > 1 && (
          <>
            <button
              onClick={onPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 text-gray-900 rounded-full p-2 shadow hover:bg-white"
              aria-label={locale === "en" ? "Previous" : "Önceki"}
            >
              ‹
            </button>
            <button
              onClick={onNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 text-gray-900 rounded-full p-2 shadow hover:bg-white"
              aria-label={locale === "en" ? "Next" : "Sonraki"}
            >
              ›
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
};
Lightbox.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      url: PropTypes.string.isRequired,
      resourceType: PropTypes.oneOf(["image", "video"]),
      caption: PropTypes.string,
    })
  ).isRequired,
  index: PropTypes.number.isRequired,
  previewWidth: PropTypes.number,
  playbackWidth: PropTypes.number,
  imageQuality: PropTypes.string,
  videoQuality: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onPrev: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
};

/* ---------------- Thumb (küçük önizleme) ---------------- */
const MediaThumb = ({
  m,
  onClick,
  className = "",
  showCaption = false,
  previewWidth = 900,
  imageQuality = "auto:good",
}) => {
  const { locale } = useLocale();
  const isVideo = getMediaType(m) === "video";
  const previewSrc = getMediaPreviewSrc(m, {
    width: className ? Math.max(previewWidth, 1200) : previewWidth,
    quality: imageQuality,
  });
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[26px] border border-white/50 bg-white/95 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.32)] transition-transform duration-300 hover:-translate-y-0.5 ${className}`}
      title={m?.caption || (isVideo ? "Video" : locale === "en" ? "Image" : "Görsel")}
    >
      <div className="relative h-full min-h-[180px] w-full overflow-hidden">
        <img
          src={previewSrc}
          alt={m?.caption || (locale === "en" ? "Media" : "Medya")}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />
        <div className="absolute left-4 top-4">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/45 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur">
            {isVideo ? <PlayCircle size={13} /> : <Images size={13} />}
            {isVideo ? "Video" : locale === "en" ? "Image" : "Görsel"}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4 text-left text-white">
          <span className="inline-flex translate-y-2 items-center gap-2 rounded-full border border-white/25 bg-white/12 px-4 py-2 text-xs font-semibold text-white opacity-0 backdrop-blur-sm transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            {isVideo
              ? locale === "en"
                ? "Open video"
                : "Videoyu aç"
              : locale === "en"
              ? "Enlarge image"
              : "Görseli büyüt"}
          </span>
          {showCaption && m?.caption ? (
            <p className="mt-3 line-clamp-2 text-sm font-medium text-white/90">
              {m.caption}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
};
MediaThumb.propTypes = {
  m: PropTypes.shape({
    url: PropTypes.string.isRequired,
    resourceType: PropTypes.oneOf(["image", "video"]),
    caption: PropTypes.string,
  }).isRequired,
  onClick: PropTypes.func.isRequired,
  className: PropTypes.string,
  showCaption: PropTypes.bool,
  previewWidth: PropTypes.number,
  imageQuality: PropTypes.string,
};

const HeroMediaCard = ({
  media,
  title,
  mediaCount,
  previewWidth = 1600,
  imageQuality = "auto:good",
  onOpen,
}) => {
  const { locale } = useLocale();
  const isVideo = getMediaType(media) === "video";
  const previewSrc = getMediaPreviewSrc(media, {
    width: previewWidth,
    quality: imageQuality,
  });

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative block w-full overflow-hidden rounded-[32px] border border-white/50 bg-slate-950 text-left shadow-[0_28px_90px_-44px_rgba(15,23,42,0.6)]"
      title={
        isVideo
          ? locale === "en"
            ? "Inspect video"
            : "Videoyu incele"
          : locale === "en"
          ? "Enlarge media"
          : "Medyayı büyüt"
      }
    >
      <div className="relative aspect-[5/4] w-full overflow-hidden md:aspect-[6/5] xl:min-h-[540px] xl:aspect-auto">
        <ProgressiveImg
          src={previewSrc}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_26%),linear-gradient(to_top,rgba(2,6,23,0.86),rgba(15,23,42,0.18)_48%,rgba(2,6,23,0.06))]" />

        <div className="absolute left-5 top-5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md">
            {isVideo ? <PlayCircle size={14} /> : <Images size={14} />}
            {isVideo
              ? locale === "en"
                ? "Cover video"
                : "Kapak video"
              : locale === "en"
              ? "Cover image"
              : "Kapak görseli"}
          </span>
          {mediaCount > 1 ? (
            <span className="rounded-full border border-white/20 bg-white/14 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
              +{mediaCount - 1} {locale === "en" ? "more media" : "ek medya"}
            </span>
          ) : null}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition duration-300 group-hover:-translate-y-1">
            {isVideo
              ? locale === "en"
                ? "Watch video"
                : "Videoyu izle"
              : locale === "en"
              ? "Enlarge media"
              : "Medyayı büyüt"}
          </div>
          {media?.caption ? (
            <p className="mt-4 inline-block max-w-xl rounded-2xl border border-white/20 bg-black/40 px-4 py-2.5 text-sm leading-6 text-white/90 backdrop-blur-md md:text-base">
              {media.caption}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
};
HeroMediaCard.propTypes = {
  media: PropTypes.shape({
    url: PropTypes.string.isRequired,
    resourceType: PropTypes.oneOf(["image", "video"]),
    caption: PropTypes.string,
  }).isRequired,
  title: PropTypes.string,
  mediaCount: PropTypes.number,
  previewWidth: PropTypes.number,
  imageQuality: PropTypes.string,
  onOpen: PropTypes.func.isRequired,
};

const InfoPill = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200/75 bg-white/75 px-4 py-3 shadow-sm">
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
      {label}
    </p>
    <p className="mt-1 text-sm font-semibold text-slate-700">{value}</p>
  </div>
);
InfoPill.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};

/* ---------------- Aside Tools ---------------- */
const AsideTools = ({ toc, onBack }) => {
  const { locale } = useLocale();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = location.href;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: document.title });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }
    } catch {
      /* no-op */
    }
  };

  return (
    <div className="space-y-6 lg:sticky lg:top-6">
      {/* Araç kutusu */}
      <div className="rounded-3xl bg-white/80 backdrop-blur-xl border border-white/40 shadow-md p-5">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="px-3 py-2 text-sm rounded-full border border-secondaryColor text-secondaryColor hover:bg-secondaryColor hover:text-white transition"
          >
            {locale === "en" ? "All Posts" : "Tüm Yazılar"}
          </button>
          <button
            onClick={share}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
            title={locale === "en" ? "Share link" : "Bağlantıyı paylaş"}
          >
            {copied ? <Check size={16} /> : <Share2 size={16} />}
            {copied
              ? locale === "en"
                ? "Copied"
                : "Kopyalandı"
              : locale === "en"
              ? "Share"
              : "Paylaş"}
          </button>
        </div>

        {/* İçindekiler */}
        {toc.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold text-secondaryColor mb-2">
              {locale === "en" ? "Contents" : "İçindekiler"}
            </p>
            <nav className="text-sm text-gray-700 space-y-1">
              {toc.map((h) => (
                <a
                  key={h.id}
                  href={`#${h.id}`}
                  className="block rounded px-2 py-1 hover:bg-gray-100 transition"
                >
                  <span className="inline-flex items-center gap-2">
                    {h.level === 3 && (
                      <span className="w-3 h-px bg-gray-400 inline-block" />
                    )}
                    {h.text}
                  </span>
                </a>
              ))}
            </nav>
            <p className="mt-2 text-[11px] text-gray-400 inline-flex items-center gap-1">
              <LinkIcon size={12} />{" "}
              {locale === "en"
                ? "Click a heading to copy its link"
                : "Başlığa tıklayınca link kopyalanır"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
AsideTools.propTypes = {
  toc: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      level: PropTypes.oneOf([2, 3]).isRequired,
      text: PropTypes.string.isRequired,
    })
  ),
  onBack: PropTypes.func.isRequired,
};
AsideTools.defaultProps = {
  toc: [],
};
