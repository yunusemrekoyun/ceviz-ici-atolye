import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import PropTypes from "prop-types";
import ServiceItem from "./ServiceItem";
import usePagedList from "../../hooks/usePagedList";
import {
  fetchServicesCached,
  getCachedServices,
} from "../../utils/servicesCache";
import { useLocale } from "../../i18n/LocaleContext";

const Services = ({ q }) => {
  const { locale } = useLocale();
  const cachedServices = getCachedServices(locale);
  const [services, setServices] = useState(() => cachedServices || []);
  const allLabel = locale === "en" ? "All" : "Tümü";
  const [cat, setCat] = useState(allLabel);
  const [loading, setLoading] = useState(() => !cachedServices);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const list = await fetchServicesCached({ locale });
        if (!cancelled) setServices(list);
      } catch (e) {
        console.error("GET /services error:", e?.response?.data || e);
        if (!cancelled) {
          setErr(locale === "en" ? "Services could not be loaded." : "Hizmetler getirilemedi.");
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
    import("../../pages/ServiceDetailsPage.jsx").catch(() => {});
  }, []);

  const categories = useMemo(() => {
    const uniq = new Set(
      services.map((s) => (s.category || "").trim()).filter(Boolean)
    );
    return [allLabel, ...Array.from(uniq)];
  }, [allLabel, services]);

  useEffect(() => {
    setCat((current) => (categories.includes(current) ? current : allLabel));
  }, [allLabel, categories]);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return services.filter((s) => {
      const okCat = cat === allLabel || (s.category || "").trim() === cat;
      if (!text) return okCat;
      const haystack = `${s.title || ""} ${s.type || ""} ${s.category || ""} ${
        s.description || ""
      }`.toLowerCase();
      return okCat && haystack.includes(text);
    });
  }, [allLabel, cat, q, services]);

  const { visible, hasMore, remaining, showMore } = usePagedList(filtered);

  if (loading)
    return (
      <div className="py-16 text-center text-gray-500">
        {locale === "en" ? "Loading..." : "Yükleniyor…"}
      </div>
    );
  if (err) return <div className="py-16 text-center text-red-600">{err}</div>;

  return (
    <section className="w-full">
      <div className="mb-5 rounded-[24px] border border-white/40 bg-white/55 p-4 shadow-sm backdrop-blur-xl md:mb-6 md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  cat === c
                    ? "border-quaternaryColor bg-quaternaryColor text-white"
                    : "border-white/45 bg-white/80 text-gray-700 hover:bg-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-500 md:text-sm">
            {locale === "en"
              ? `Total: ${services.length} • Filtered: ${filtered.length}`
              : `Toplam: ${services.length} • Filtrelenmiş: ${filtered.length}`}
          </p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-gray-600 bg-white/50 backdrop-blur-xl border border-white/30 rounded-2xl py-16">
          {locale === "en" ? "No matching results found." : "Sonuç bulunamadı."}
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((svc, i) => (
              <motion.div
                key={svc._id || i}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: Math.min(i, 8) * 0.04 }}
              >
                <ServiceItem service={svc} priority={i < 4} />
              </motion.div>
            ))}
          </div>

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
    </section>
  );
};

Services.propTypes = {
  q: PropTypes.string.isRequired,
};

export default Services;
