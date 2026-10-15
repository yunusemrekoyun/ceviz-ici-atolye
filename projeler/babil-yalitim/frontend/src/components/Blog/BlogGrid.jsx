import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import BlogGridItem from "./BlogGridItem";
import { useLocale } from "../../i18n/LocaleContext.jsx";
import { localizePath } from "../../i18n/routing.js";

const Skeleton = () => (
  <div className="rounded-2xl overflow-hidden border border-white/40 bg-white/30 backdrop-blur-md shadow-md">
    <div className="w-full h-48 md:h-56 bg-gray-200/60 animate-pulse" />
    <div className="p-5">
      <div className="h-4 w-28 bg-gray-200/70 rounded mb-3 animate-pulse" />
      <div className="h-5 w-3/4 bg-gray-200/70 rounded mb-2 animate-pulse" />
      <div className="h-4 w-full bg-gray-200/70 rounded mb-2 animate-pulse" />
      <div className="h-4 w-2/3 bg-gray-200/70 rounded animate-pulse" />
    </div>
  </div>
);

const BlogGrid = () => {
  const { locale } = useLocale();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 640 : true
  );
  const navigate = useNavigate();
  const copy =
    locale === "en"
      ? {
          fetchError: "GET /blogs failed:",
          title: "Blog",
          emptyTitle: "No blog posts yet.",
          emptyText: "We will be here soon with new content.",
          cta: "View All Blog Posts",
        }
      : {
          fetchError: "GET /blogs failed:",
          title: "Blog",
          emptyTitle: "Henüz blog eklenmemiş.",
          emptyText: "Yakında yeni içeriklerle buradayız.",
          cta: "Tüm blogları gör",
        };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/blogs", {
          params: { locale },
        });
        const list = Array.isArray(res.data) ? res.data : [];
        if (!cancelled) setBlogs(list.slice(0, 3));
      } catch (e) {
        console.error(copy.fetchError, e?.response?.data || e);
        if (!cancelled) setBlogs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [copy.fetchError, locale]);

  useEffect(() => {
    const onResize = () =>
      setIsMobile(typeof window !== "undefined" && window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const ctaClassName = [
    "inline-flex items-center justify-center gap-2 text-sm text-white bg-quaternaryColor px-4 rounded-full hover:bg-opacity-90 hover:shadow-lg hover:bg-white/20 transition-all duration-300",
    isMobile ? "w-full py-2.5" : "py-2",
  ].join(" ");

  return (
    <section className="relative w-full">
      {/* Glass çerçeve — daha ferah ve dengeli paddingle */}
      <div className="mx-auto max-w-7xl rounded-[28px] border border-white/40 bg-white/25 backdrop-blur-2xl shadow-[0_12px_50px_rgba(0,0,0,0.15)] px-4 sm:px-6 md:px-8 py-8 md:py-10">
        {/* Başlık satırı */}
        <div className="flex items-end justify-between gap-4 mb-6 md:mb-8">
          <div className="text-center w-full">
            <h2 className="text-3xl md:text-4xl font-bold text-secondaryColor">
              {copy.title}
            </h2>
            <div className="mt-3 h-1 w-20 bg-quaternaryColor/90 rounded-full mx-auto" />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} />
            ))}
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-14 bg-white/40 backdrop-blur-xl rounded-2xl border border-white/30">
            <p className="text-secondaryColor font-semibold text-lg">
              {copy.emptyTitle}
            </p>
            <p className="text-gray-600 mt-1">{copy.emptyText}</p>
          </div>
        ) : (
          <div className="grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {blogs.map((b, idx) => (
              <BlogGridItem key={b._id || idx} item={b} index={idx} />
            ))}
          </div>
        )}

        {/* Alt CTA — cam panelin içinde, sağa hizalı */}
        {/* Alt CTA — cam panelin içinde, sağa hizalı */}
        {!loading && blogs.length > 0 && (
          <div className="mt-8 md:mt-10 flex justify-center md:justify-end">
            <motion.button
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate(localizePath("/blog", locale))}
              className={ctaClassName}
            >
              {copy.cta}
              <span aria-hidden>→</span>
            </motion.button>
          </div>
        )}
      </div>
    </section>
  );
};

export default BlogGrid;
