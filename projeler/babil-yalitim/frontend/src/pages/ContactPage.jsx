// src/pages/ContactPage.jsx
import { motion } from "framer-motion";
import NavbarPage from "../components/Navbar/NavbarPage";
import Footer from "../components/Footer/Footer";
import Contact from "../components/Contact/Contact";
import Breadcrumb from "../components/ui/Breadcrumb"; // <-- eklendi
import { useLocale } from "../i18n/LocaleContext.jsx";

const ContactPage = () => {
  const { locale } = useLocale();
  return (
    <>
      <motion.div
        className="min-h-screen bg-gradient-to-br from-white via-gray-100 to-orange-100"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <NavbarPage />

        {/* Breadcrumb */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 pt-8">
          <Breadcrumb
            titleMap={{ iletisim: locale === "en" ? "Contact" : "İletişim" }}
          />
        </section>

        <Contact />
      </motion.div>

      <Footer />
    </>
  );
};

export default ContactPage;
