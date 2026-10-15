// src/pages/JournalDetailPage.jsx
import { motion } from "framer-motion";
import NavbarPage from "../components/Navbar/NavbarPage";
import Footer from "../components/Footer/Footer";
import JournalDetail from "../components/Journal/JournalDetail";
import Breadcrumb from "../components/ui/Breadcrumb";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api";
import { useLocale } from "../i18n/LocaleContext";

const JournalDetailPage = () => {
  const { id } = useParams();
  const { locale } = useLocale();
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!id) return;
    api
      .get(`/journals/${id}`, {
        params: { locale },
      })
      .then(({ data }) => setTitle(data?.title || (locale === "en" ? "Detail" : "Detay")))
      .catch(() => setTitle(locale === "en" ? "Detail" : "Detay"));
  }, [id, locale]);

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

        <section className="max-w-7xl mx-auto px-4 md:px-8 pt-8">
          <Breadcrumb
            titleMap={{
              journals: locale === "en" ? "News" : "Haberler",
              [id]: title,
            }}
            nonLinkLabels={[locale === "en" ? "News" : "Haberler"]}
          />
        </section>

        <JournalDetail />
      </motion.div>
      <Footer />
    </>
  );
};

export default JournalDetailPage;
