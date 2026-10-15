// frontend/src/components/ProjeGrid/ProjectDetail.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api";
import { motion } from "framer-motion";
import { CalendarDays, Tag, Film, Images, Clock } from "lucide-react";
import { useLocale } from "../../i18n/LocaleContext";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const fmt = (v, locale) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(locale === "en" ? "en-GB" : "tr-TR");
};

const ProjectDetail = () => {
  const { locale } = useLocale();
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [activeIdx, setActiveIdx] = useState(0);
  const [imgOk, setImgOk] = useState(true);
  const [badThumbs, setBadThumbs] = useState(new Set());
  const videoRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get(`/projects/${id}`, { params: { locale } })
      .then(({ data }) => {
        setProject(data);
        setNotFound(false);
        setActiveIdx(0);
        setImgOk(true);
        setBadThumbs(new Set());
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, locale]);

  // Orijinal görsel listesi (boş/kırık URL filtrelemesi daha sonra yapılacak)
  const images = useMemo(() => {
    if (!project) return [];
    const urls = [];
    const push = (u) => {
      if (typeof u === "string") {
        const s = u.trim();
        if (s && !urls.includes(s)) urls.push(s);
      }
    };
    push(project?.cover?.url);
    if (Array.isArray(project?.images)) {
      project.images.forEach((m) => push(m?.url));
    }
    return urls;
  }, [project]);

  // Kırık thumb'ları filtrele
  const thumbImages = useMemo(
    () => images.filter((u) => !badThumbs.has(u)),
    [images, badThumbs]
  );

  const heroImage = thumbImages[activeIdx] || null;
  const hasAnyImage = thumbImages.length > 0;
  const hasVideo = Boolean(project?.video?.url);

  // Aktif index liste kısalırsa sıfırla
  useEffect(() => {
    if (activeIdx >= thumbImages.length) setActiveIdx(0);
  }, [thumbImages.length, activeIdx]);

  // Ok tuşlarıyla görsel değişimi
  useEffect(() => {
    const onKey = (e) => {
      if (!hasAnyImage) return;
      if (e.key === "ArrowRight")
        setActiveIdx((i) => (i + 1) % thumbImages.length);
      if (e.key === "ArrowLeft")
        setActiveIdx((i) => (i - 1 + thumbImages.length) % thumbImages.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [thumbImages.length, hasAnyImage]);

  // Aktif thumb değişince hero tekrar denesin
  useEffect(() => {
    setImgOk(true);
  }, [activeIdx]);

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="animate-pulse text-gray-500">
          {locale === "en" ? "Loading..." : "Yükleniyor…"}
        </div>
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="text-center py-20 text-red-500 text-xl font-semibold">
        {locale === "en" ? "Project not found." : "Proje bulunamadı."}
      </div>
    );
  }

  return (
    <section className="w-full">
      {/* HERO */}
      <div className="relative h-[42vh] md:h-[56vh] overflow-hidden">
        {hasAnyImage && imgOk ? (
          <motion.img
            key={heroImage + String(imgOk)}
            src={heroImage}
            alt={project.title || "Proje görseli"}
            onError={() => setImgOk(false)}
            initial={{ scale: 1.05, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : hasVideo ? (
          <video
            ref={videoRef}
            src={project.video.url}
            className="absolute inset-0 w-full h-full object-cover"
            muted
            autoPlay
            loop
            playsInline
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300" />
        )}

        {/* üst katmanlar */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/15 to-transparent" />
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="absolute left-1/2 -translate-x-1/2 w-full max-w-6xl px-4 bottom-28 md:bottom-32"
        >
          <h1 className="text-white text-3xl md:text-5xl font-extrabold drop-shadow">
            {project.title}
          </h1>
        </motion.div>

        {/* Thumbnail şeridi */}
        {thumbImages.length > 1 && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-4 w-full max-w-6xl px-4">
            <div className="rounded-xl bg-black/35 backdrop-blur-md border border-white/20 px-3 py-2">
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {thumbImages.map((src, i) => (
                  <button
                    key={src + i}
                    type="button"
                    onClick={() => setActiveIdx(i)}
                    className={`relative flex-shrink-0 h-16 w-24 md:h-20 md:w-28 rounded-lg overflow-hidden border transition 
                      ${
                        i === activeIdx
                          ? "ring-2 ring-brandBlue border-transparent"
                          : "border-white/30 hover:border-white/60"
                      }`}
                    title={`${locale === "en" ? "Image" : "Görsel"} ${i + 1}`}
                    aria-label={`${locale === "en" ? "Image" : "Görsel"} ${i + 1}`}
                  >
                    <img
                      src={src}
                      alt={`thumb-${i}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={() => {
                        setBadThumbs((prev) => {
                          const next = new Set(prev);
                          next.add(src);
                          return next;
                        });
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 relative z-10 mt-8 md:mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Sol kolon */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="lg:col-span-2 bg-white/80 backdrop-blur rounded-2xl shadow p-6"
          >
            <h2 className="text-xl font-semibold text-brandBlue mb-3">
              {locale === "en" ? "About the Project" : "Proje Hakkında"}
            </h2>
            <p className="text-gray-700 leading-relaxed break-words whitespace-pre-wrap">
              {project.description ||
                (locale === "en" ? "No description available." : "Açıklama mevcut değil.")}
            </p>
          </motion.div>

          {/* Sağ kolon */}
          <motion.aside
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.05 }}
            className="space-y-6"
          >
            <div className="bg-white/80 backdrop-blur rounded-2xl shadow p-6">
              <h3 className="text-base font-semibold text-brandBlue mb-4">
                {locale === "en" ? "Project Information" : "Proje Bilgileri"}
              </h3>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-3">
                  <Tag size={18} className="text-brandBlue flex-none mt-0.5" />
                  <span>
                    <strong>{locale === "en" ? "Category:" : "Kategori:"}</strong>{" "}
                    {project.category || (locale === "en" ? "Not specified" : "Belirtilmemiş")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CalendarDays
                    size={18}
                    className="text-brandBlue flex-none mt-0.5"
                  />
                  <span className="space-x-2">
                    {project.startDate && (
                      <span>{locale === "en" ? "Start:" : "Başlangıç:"} {fmt(project.startDate, locale)}</span>
                    )}
                    {project.endDate && (
                      <span>{locale === "en" ? "End:" : "Bitiş:"} {fmt(project.endDate, locale)}</span>
                    )}
                    {!project.startDate && !project.endDate && (
                      <span>{locale === "en" ? "Created:" : "Oluşturulma:"} {fmt(project.createdAt, locale)}</span>
                    )}
                  </span>
                </li>
                {(project.durationDays || project.completedAt) && (
                  <li className="flex items-start gap-3">
                    <Clock
                      size={18}
                      className="text-brandBlue flex-none mt-0.5"
                    />
                    <span className="space-x-2">
                      {project.completedAt && (
                        <span>{locale === "en" ? "Completed:" : "Tamamlandı:"} {fmt(project.completedAt, locale)}</span>
                      )}
                      {project.durationDays ? (
                        <span>({project.durationDays} {locale === "en" ? "days" : "gün"})</span>
                      ) : null}
                    </span>
                  </li>
                )}
                {thumbImages.length > 0 && (
                  <li className="flex items-start gap-3">
                    <Images
                      size={18}
                      className="text-brandBlue flex-none mt-0.5"
                    />
                    <span>{thumbImages.length} {locale === "en" ? "images" : "görsel"}</span>
                  </li>
                )}
              </ul>
            </div>

            {hasVideo && (
              <div className="bg-white/80 backdrop-blur rounded-2xl shadow p-4">
                <div className="flex items-center gap-2 mb-3 text-brandBlue">
                  <Film size={18} />
                  <h3 className="font-semibold text-sm">
                    {locale === "en" ? "Project Video" : "Proje Videosu"}
                  </h3>
                </div>
                <div className="aspect-video w-full overflow-hidden rounded-lg">
                  <video
                    src={project.video.url}
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {(hasAnyImage || hasVideo) && (
              <div className="bg-white/80 backdrop-blur rounded-2xl shadow p-3">
                <div className="aspect-video w-full overflow-hidden rounded-lg">
                  {hasAnyImage ? (
                    <motion.img
                      key={`mini-${heroImage}`}
                      src={heroImage}
                      alt="Kapak"
                      className="w-full h-full object-cover"
                      initial={{ opacity: 0.25 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.35 }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <video
                      src={project.video.url}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      controls
                    />
                  )}
                </div>
              </div>
            )}
          </motion.aside>
        </div>
      </div>

      <div className="mt-12 pb-16 bg-gray-50" />
    </section>
  );
};

export default ProjectDetail;
