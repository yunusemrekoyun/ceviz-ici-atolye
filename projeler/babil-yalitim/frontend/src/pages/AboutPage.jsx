// pages/AboutPage.jsx
import { motion } from "framer-motion";
import NavbarPage from "../components/Navbar/NavbarPage";
import Footer from "../components/Footer/Footer";
import AboutPageComponent from "../components/About/AboutPageComponent";
import Breadcrumb from "../components/ui/Breadcrumb"; // yeni ekleme
import { getAboutContent } from "../content/aboutContent";
import { useLocale } from "../i18n/LocaleContext.jsx";

const AboutPage = () => {
  const { locale } = useLocale();
  const content = getAboutContent(locale);

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
        <div className="max-w-7xl mx-auto px-6 md:px-10 pt-6">
          <Breadcrumb titleMap={{ about: locale === "en" ? "About" : "Hakkımızda" }} />
        </div>

        {/* Hero / ortak başlık şeridi */}
        <header className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 md:px-10 pt-8 md:pt-12 pb-4">
            <h1 className="text-3xl md:text-5xl font-extrabold text-secondaryColor tracking-tight text-center">
              {content.sectionTitle}
            </h1>
            <div className="h-1 w-24 bg-quaternaryColor/90 rounded-full mt-4 mx-auto" />
            <p className="mt-6 text-gray-700 max-w-2xl mx-auto text-center">
              {content.pageLead}
            </p>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-6 md:px-10 pb-20 pt-8">
          <AboutPageComponent />
        </main>
      </motion.div>

      <Footer />
    </>
  );
};

export default AboutPage;
