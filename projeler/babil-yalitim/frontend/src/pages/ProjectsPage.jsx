import { motion } from "framer-motion";
import ProjectsPageComponent from "../components/ProjeGrid/ProjectsPageComponent";
import Footer from "../components/Footer/Footer";
import NavbarPage from "../components/Navbar/NavbarPage";
import Breadcrumb from "../components/ui/Breadcrumb"; // 👈 ekledik
import { useLocale } from "../i18n/LocaleContext.jsx";

const ProjectsPage = () => {
  const { locale } = useLocale();
  const copy =
    locale === "en"
      ? {
          breadcrumb: "Projects",
          title: "Reference Projects",
          description:
            "Selected waterproofing and structural protection projects delivered with the right materials, the right application, and expert workmanship.",
        }
      : {
          breadcrumb: "Projelerimiz",
          title: "Referans Projeler",
          description:
            "Dogru malzeme, dogru uygulama ve uzman iscilikle tamamladigimiz su yalitimi ve yapi koruma projelerinden seckiler.",
        };

  return (
    <>
      <motion.div
        className="min-h-screen bg-gradient-to-br from-white via-gray-100 to-orange-50"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <NavbarPage />

        {/* Breadcrumb */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 pt-6">
          <Breadcrumb
            titleMap={{
              projects: copy.breadcrumb,
            }}
          />
        </section>

        {/* Header */}
        <section className="px-4 md:px-8 lg:px-10 py-14 md:py-16 max-w-7xl mx-auto">
          <div className="text-center mb-10 md:mb-12">
            <h1 className="text-3xl md:text-5xl font-bold text-secondaryColor">
              {copy.title}
            </h1>
            <div className="h-1 w-24 bg-quaternaryColor/90 mx-auto mt-4 rounded-full" />
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              {copy.description}
            </p>
          </div>

          <ProjectsPageComponent />
        </section>
      </motion.div>

      <Footer />
    </>
  );
};

export default ProjectsPage;
