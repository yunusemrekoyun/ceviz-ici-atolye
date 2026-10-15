// src/pages/JournalPage.jsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import NavbarPage from "../components/Navbar/NavbarPage";
import Footer from "../components/Footer/Footer";
import JournalPreview from "../components/Journal/JournalPreview";
import Breadcrumb from "../components/ui/Breadcrumb"; // ← EKLENDİ
import api from "../api";
import { useLocale } from "../i18n/LocaleContext.jsx";

const JournalPage = () => {
  const { locale } = useLocale();
  const [journalData, setJournalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/journals", {
          params: { locale },
        });
        if (!cancelled) {
          setJournalData(Array.isArray(res.data) ? res.data : []);
        }
      } catch (e) {
        console.error("Journal verisi alınamadı:", e?.response?.data || e);
        if (!cancelled)
          setErr(locale === "en" ? "News could not be loaded." : "Haberler getirilemedi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

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
              journal: locale === "en" ? "News" : "Haberler",
              journals: locale === "en" ? "News" : "Haberler",
            }}
          />
        </section>

        <section className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4 md:pt-5 pb-5">
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-3xl md:text-5xl font-bold text-secondaryColor"
            >
              {locale === "en" ? "News" : "Haberler"}
            </motion.h1>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="h-1 w-20 bg-quaternaryColor/90 rounded-full mt-3 origin-left"
            />
          </div>
        </section>

        {/* İçerik + Arama */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
          <JournalPreview data={journalData} loading={loading} error={err} />
        </div>
      </motion.div>

      <Footer />
    </>
  );
};

export default JournalPage;
