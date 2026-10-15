import PropTypes from "prop-types";
import { useMemo, useState } from "react";
import JournalCard from "./JournalCard";
import { toPlainRichContent, toRichContentExcerpt } from "../../utils/richContent";
import { useLocale } from "../../i18n/LocaleContext.jsx";

const Skeleton = () => (
  <div className="rounded-2xl overflow-hidden border border-white/40 bg-white/30 backdrop-blur-md shadow-md">
    <div className="w-full h-56 bg-gray-200/60 animate-pulse" />
    <div className="p-5">
      <div className="h-4 w-32 bg-gray-200/70 rounded mb-3 animate-pulse" />
      <div className="h-5 w-3/4 bg-gray-200/70 rounded mb-2 animate-pulse" />
      <div className="h-4 w-full bg-gray-200/70 rounded mb-2 animate-pulse" />
      <div className="h-4 w-2/3 bg-gray-200/70 rounded animate-pulse" />
    </div>
  </div>
);

const EmptyState = ({ locale }) => (
  <div className="text-center py-16 bg-white/40 backdrop-blur-xl rounded-2xl border border-white/30">
    <p className="text-secondaryColor font-semibold text-lg">
      {locale === "en" ? "No news has been published yet." : "Henüz haber eklenmemiş."}
    </p>
    <p className="text-gray-600 mt-1">
      {locale === "en"
        ? "We will be here soon with new updates."
        : "Yakında yeni içeriklerle buradayız."}
    </p>
  </div>
);

EmptyState.propTypes = {
  locale: PropTypes.oneOf(["tr", "en"]).isRequired,
};

// Backend -> UI normalize
const normalize = (j) => ({
  _id: j?._id,
  title: j?.title || "",
  coverUrl: j?.cover?.url || "",
  excerpt: toRichContentExcerpt(j?.content, 170),
  searchText: toPlainRichContent(j?.content),
  date: j?.createdAt || j?.updatedAt || null,
  tags: Array.isArray(j?.tags) ? j.tags : [], // varsa
  likesCount: j?.likesCount ?? 0,
});

const JournalPreview = ({ data = [], loading = false, error = "" }) => {
  const { locale } = useLocale();
  const items = useMemo(() => data.map(normalize), [data]);

  // 🔎 Arama (başlık + içerik + etiket)
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) => {
      const haystack = `${it.title} ${it.searchText || it.excerpt} ${(it.tags || []).join(
        " "
      )}`.toLowerCase();
      return haystack.includes(s);
    });
  }, [items, q]);

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 bg-white/40 border border-white/30 rounded-2xl py-10">
        {error}
      </div>
    );
  }

  if (!items.length) return <EmptyState locale={locale} />;

  return (
    <>
      <div className="mb-6 rounded-[26px] border border-white/40 bg-white/55 p-4 backdrop-blur-xl shadow-sm md:p-5">
        <label htmlFor="jrnl-search" className="sr-only">
          {locale === "en" ? "Search news" : "Haberlerde ara"}
        </label>
        <input
          id="jrnl-search"
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={locale === "en" ? "Search news..." : "Haberlerde ara…"}
          className="w-full rounded-xl border border-white/40 bg-white/80 px-4 py-3 outline-none focus:ring-2 focus:ring-quaternaryColor transition shadow-sm"
        />
      </div>

      <p className="text-xs text-gray-500 mb-4">
        {locale === "en"
          ? `Total: ${items.length} • Filtered: ${filtered.length}`
          : `Toplam: ${items.length} • Filtrelenmiş: ${filtered.length}`}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center text-gray-600 bg-white/50 backdrop-blur-xl border border-white/30 rounded-2xl py-16">
          {locale === "en"
            ? "No news item matched your search."
            : "Aramanızla eşleşen haber bulunamadı."}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item, index) => (
            <JournalCard key={item._id || index} item={item} index={index} />
          ))}
        </div>
      )}
    </>
  );
};

JournalPreview.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object),
  loading: PropTypes.bool,
  error: PropTypes.string,
};

export default JournalPreview;
