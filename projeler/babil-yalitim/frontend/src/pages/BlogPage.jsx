// src/pages/BlogPage.jsx
import { motion } from "framer-motion";
import NavbarPage from "../components/Navbar/NavbarPage";
import Footer from "../components/Footer/Footer";
import BlogPageComponent from "../components/Blog/BlogPageComponent";
import Breadcrumb from "../components/ui/Breadcrumb"; // <-- EKLENDİ
import { useLocale } from "../i18n/LocaleContext.jsx";

const BlogPage = () => {
  const { locale } = useLocale();
  return (
    <>
      <motion.div
        className="min-h-screen bg-gradient-to-br from-white via-gray-100 to-orange-50"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <NavbarPage />

        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6">
          <Breadcrumb titleMap={{ blog: locale === "en" ? "Blog" : "Blog" }} />
        </div>

        <section className="px-4 md:px-8 lg:px-10 pt-4 pb-10 md:pt-5 md:pb-14 max-w-7xl mx-auto">
          <div className="mb-5 md:mb-6">
            <h1 className="text-3xl md:text-5xl font-bold text-secondaryColor">
              Blog
            </h1>
            <div className="h-1 w-20 bg-quaternaryColor/90 mt-3 rounded-full" />
          </div>

          <BlogPageComponent />
        </section>
      </motion.div>

      <Footer />
    </>
  );
};

export default BlogPage;
