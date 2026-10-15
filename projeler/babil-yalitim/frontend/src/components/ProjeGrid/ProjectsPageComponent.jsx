import { useEffect, useMemo, useState } from "react";
import ProjectItem from "./ProjectItem";
import api from "../../api";
import usePagedList from "../../hooks/usePagedList";
import { useLocale } from "../../i18n/LocaleContext";

const ProjectsPageComponent = () => {
  const { locale } = useLocale();
  const [projects, setProjects] = useState([]);
  const [q, setQ] = useState("");
  const allLabel = locale === "en" ? "All" : "Tümü";
  const [cat, setCat] = useState(allLabel);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/projects", {
          params: { locale },
        });
        const list = Array.isArray(res.data) ? res.data : [];
        if (!cancelled) setProjects(list);
      } catch (e) {
        console.error(
          "[ProjectsPage] GET /projects failed:",
          e?.response?.data || e
        );
        if (!cancelled) {
          setErr(locale === "en" ? "Projects could not be loaded." : "Projeler getirilemedi.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const categories = useMemo(() => {
    const uniq = new Set(
      projects.map((p) => (p.category || "").trim()).filter(Boolean)
    );
    return [allLabel, ...Array.from(uniq)];
  }, [allLabel, projects]);

  useEffect(() => {
    setCat((current) => (categories.includes(current) ? current : allLabel));
  }, [allLabel, categories]);

  const filtered = useMemo(() => {
    const txt = q.trim().toLowerCase();
    return projects.filter((p) => {
      const okCat = cat === allLabel || (p.category || "").trim() === cat;
      if (!txt) return okCat;
      const haystack = `${p.title || ""} ${p.description || ""} ${
        p.category || ""
      }`.toLowerCase();
      return okCat && haystack.includes(txt);
    });
  }, [allLabel, cat, projects, q]);

  const { visible, hasMore, remaining, showMore } = usePagedList(filtered);

  const hasProjects = projects.length > 0;

  if (loading)
    return (
      <section className="w-full py-16 text-center text-gray-500">
        {locale === "en" ? "Loading..." : "Yükleniyor…"}
      </section>
    );

  if (err)
    return (
      <section className="w-full py-16 text-center text-red-600">{err}</section>
    );

  return (
    <section className="w-full">
      {/* BlogPage ile aynı toolbar hissiyatı */}
      <div className="mb-8 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <div className="flex-1">
          <label className="sr-only" htmlFor="project-search">
            {locale === "en" ? "Search projects" : "Projelerde ara"}
          </label>
          <input
            id="project-search"
            type="text"
            placeholder={locale === "en" ? "Search projects..." : "Projelerde ara…"}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-xl border border-white/40 bg-white/60 backdrop-blur px-4 py-3 outline-none focus:ring-2 focus:ring-quaternaryColor transition shadow-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`px-4 py-2 rounded-full text-sm border transition ${
                cat === c
                  ? "bg-quaternaryColor text-white border-quaternaryColor"
                  : "bg-white/60 text-gray-700 border-white/40 hover:bg-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-2">
        {locale === "en"
          ? `Total: ${projects.length} • Filtered: ${filtered.length}`
          : `Toplam: ${projects.length} • Filtrelenmiş: ${filtered.length}`}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center text-gray-600 bg-white/50 backdrop-blur-xl border border-white/30 rounded-2xl py-16">
          {hasProjects ? (
            locale === "en"
              ? "No projects matched your search."
              : "Aramanızla eşleşen proje bulunamadı."
          ) : (
            <div className="mx-auto max-w-2xl space-y-3 px-6">
              <p className="text-lg font-semibold text-secondaryColor">
                {locale === "en"
                  ? "Our projects will be published here soon."
                  : "Projelerimiz yakında burada yayınlanacak."}
              </p>
              <p className="text-sm leading-6 text-gray-600">
                {locale === "en"
                  ? "There are no projects to list right now. New projects will appear on this page as they are added."
                  : "Şu an listelenecek proje bulunmuyor. Yeni projeler eklendikçe bu sayfada paylaşılacak, daha sonra tekrar göz atabilirsiniz."}
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((project, index) => (
              <ProjectItem
                key={project._id || index}
                project={project}
                index={index}
              />
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

export default ProjectsPageComponent;
