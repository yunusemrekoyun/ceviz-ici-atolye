import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import usePagedList from "../../hooks/usePagedList";
import api from "../../api";
import BlogItem from "./BlogItem";
import { useLocale } from "../../i18n/LocaleContext.jsx";

const Skeleton = () => (
  <div className="rounded-2xl overflow-hidden border border-white/40 bg-white/40 backdrop-blur-md shadow-md">
    <div className="w-full h-56 md:h-60 bg-gray-200/60 animate-pulse" />
    <div className="p-6">
      <div className="h-5 w-3/4 bg-gray-200/70 rounded mb-3 animate-pulse" />
      <div className="h-4 w-full bg-gray-200/70 rounded mb-2 animate-pulse" />
      <div className="h-4 w-2/3 bg-gray-200/70 rounded animate-pulse" />
    </div>
  </div>
);

const EmptyState = ({ locale }) => (
  <div className="text-center py-16 bg-white/50 backdrop-blur-xl rounded-2xl border border-white/30">
    <p className="text-secondaryColor font-semibold text-lg">
      {locale === "en" ? "No blog posts yet." : "Henüz blog eklenmemiş."}
    </p>
    <p className="text-gray-600 mt-1">
      {locale === "en"
        ? "We will be here soon with new articles."
        : "Yakında yeni yazılarla buradayız."}
    </p>
  </div>
);

EmptyState.propTypes = {
  locale: PropTypes.oneOf(["tr", "en"]).isRequired,
};

const BlogPageComponent = () => {
  const { locale } = useLocale();
  const allLabel = locale === "en" ? "All" : "Tümü";
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // 🔎 arama & etiket filtresi
  const [q, setQ] = useState("");
  const [tag, setTag] = useState(allLabel);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/blogs", {
          params: { locale },
        });
        const list = Array.isArray(res.data) ? res.data : [];
        if (!cancelled) setBlogs(list);
      } catch (e) {
        console.error("Bloglar alınamadı:", e?.response?.data || e);
        if (!cancelled) {
          setErr(locale === "en" ? "Blogs could not be loaded." : "Bloglar getirilemedi.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    setTag((current) =>
      current === "Tümü" || current === "All" ? allLabel : current
    );
  }, [allLabel]);

  const tags = useMemo(() => {
    const s = new Set();
    blogs.forEach((b) => (b.tags || []).forEach((t) => t && s.add(String(t))));
    return [allLabel, ...Array.from(s)];
  }, [allLabel, blogs]);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return blogs.filter((b) => {
      const okTag = tag === allLabel || (b.tags || []).map(String).includes(tag);
      if (!text) return okTag;
      const haystack = `${b.title || ""} ${b.content || ""} ${(
        b.tags || []
      ).join(" ")}`.toLowerCase();
      return okTag && haystack.includes(text);
    });
  }, [allLabel, blogs, q, tag]);

  const { visible, hasMore, remaining, showMore } = usePagedList(filtered);

  if (loading) {
    return (
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} />
        ))}
      </div>
    );
  }

  if (err) {
    return (
      <div className="text-center text-red-600 bg-white/40 border border-white/30 rounded-2xl py-10">
        {err}
      </div>
    );
  }

  if (!blogs.length) return <EmptyState locale={locale} />;

  return (
    <>
      <div className="mb-6 rounded-[26px] border border-white/40 bg-white/55 p-4 backdrop-blur-xl shadow-sm md:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex-1">
            <label htmlFor="blog-search" className="sr-only">
              {locale === "en" ? "Search blog posts" : "Bloglarda ara"}
            </label>
            <input
              id="blog-search"
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                locale === "en" ? "Search blog posts..." : "Bloglarda ara…"
              }
              className="w-full rounded-xl border border-white/40 bg-white/80 px-4 py-3 outline-none focus:ring-2 focus:ring-quaternaryColor transition shadow-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(t)}
                className={`px-4 py-2 rounded-full text-sm border transition ${
                  tag === t
                    ? "bg-quaternaryColor text-white border-quaternaryColor"
                    : "bg-white/80 text-gray-700 border-white/40 hover:bg-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        {locale === "en"
          ? `Total: ${blogs.length} • Filtered: ${filtered.length}`
          : `Toplam: ${blogs.length} • Filtrelenmiş: ${filtered.length}`}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center text-gray-600 bg-white/50 backdrop-blur-xl border border-white/30 rounded-2xl py-16">
          {locale === "en"
            ? "No blog post matched your search."
            : "Aramanızla eşleşen blog bulunamadı."}
        </div>
      ) : (
      <>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
        >
          {visible.map((b, i) => (
            <BlogItem key={b._id || i} item={b} index={i} />
          ))}
        </motion.div>

        {hasMore && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={showMore}
              className="rounded-full border border-quaternaryColor bg-white/80 px-6 py-3 text-sm font-semibold text-quaternaryColor transition hover:bg-quaternaryColor hover:text-white"
            >
              {locale === "en"
                ? `Show more (${remaining} left)`
                : `Daha fazla göster (${remaining} kaldı)`}
            </button>
          </div>
        )}
      </>
      )}
    </>
  );
};

export default BlogPageComponent;
