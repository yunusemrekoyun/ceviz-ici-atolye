import { useEffect, useState } from "react";
import ProjectGridItem from "./ProjectGridItem";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import api from "../../api";
import { useLocale } from "../../i18n/LocaleContext.jsx";
import { localizePath } from "../../i18n/routing.js";

const ProjectGrid = () => {
  const { locale } = useLocale();
  const [projects, setProjects] = useState([]);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const endpoint = isMobile ? "/projects/covers" : "/projects";

        const { data } = await api.get(endpoint, {
          params: { locale },
        });

        if (Array.isArray(data)) {
          setProjects(data);
        } else {
          console.error("[ProjectGrid] unexpected payload:", data);
          setProjects([]);
        }
      } catch (err) {
        console.error("[ProjectGrid] fetch error:", err);
        setProjects([]);
      }
    };

    fetchData();

    const onResize = () =>
      setIsMobile(typeof window !== "undefined" && window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isMobile, locale]);

  const visibleProjects = isMobile ? projects.slice(0, 4) : projects;

  // desktop buton animasyonu (mobilde kapalı)
  const motionProps = !isMobile
    ? {
        initial: { x: 100, opacity: 0 },
        whileInView: { x: 0, opacity: 1 },
        viewport: { once: false, amount: 0.5 },
        transition: { duration: 0.6, ease: "easeOut" },
        whileHover: { scale: 1.05 },
      }
    : {};
  const copy =
    locale === "en"
      ? {
          title: "Projects",
          cta: "View All Projects",
        }
      : {
          title: "Projeler",
          cta: "Tüm Projeleri Gör",
        };

  return (
    <section className="relative w-full px-4 py-12 sm:py-16">
      <div className="max-w-6xl mx-auto mb-10 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-secondaryColor mb-2">
          {copy.title}
        </h2>
        <div className="h-1 w-20 bg-quaternaryColor mx-auto rounded" />
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 sm:gap-4 auto-rows-[250px]">
        {visibleProjects.map((project, index) => (
          <ProjectGridItem
            key={project._id || index}
            project={project}
            index={index}
            isMobile={isMobile}
          />
        ))}
      </div>

      <motion.div
        {...motionProps}
        className={isMobile ? "mt-6 flex justify-center" : "absolute bottom-2 right-6 z-40"}
      >
        <Link
          to={localizePath("/projects", locale)}
          className={`flex items-center justify-center gap-2 text-sm text-white bg-quaternaryColor px-4 py-2.5 rounded-full ${
            isMobile
              ? "w-full max-w-6xl"
              : "hover:bg-opacity-90 hover:shadow-lg hover:bg-white/20 transition-all duration-300"
          }`}
        >
          {copy.cta}
          <ChevronRight size={16} />
        </Link>
      </motion.div>
    </section>
  );
};

export default ProjectGrid;
