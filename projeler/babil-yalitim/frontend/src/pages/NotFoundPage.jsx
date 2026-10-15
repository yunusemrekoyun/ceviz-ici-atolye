import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Footer from "../components/Footer/Footer";
import NavbarPage from "../components/Navbar/NavbarPage";
import { useLocale } from "../i18n/LocaleContext";
import { localizePath } from "../i18n/routing.js";

export default function NotFoundPage() {
  const { locale } = useLocale();
  return (
    <>
      <motion.div
        className="min-h-screen bg-gradient-to-br from-white via-stone-100 to-orange-100"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 18 }}
        transition={{ duration: 0.35 }}
      >
        <NavbarPage />
        <section className="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center px-6 text-center">
          <span className="rounded-full border border-slate-300 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">
            404
          </span>
          <h1 className="mt-6 text-4xl font-bold text-secondaryColor md:text-6xl">
            {locale === "en"
              ? "The page you are looking for could not be found"
              : "Aradigin sayfa bulunamadi"}
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-slate-600 md:text-base">
            {locale === "en"
              ? "The link may be incorrect or the content may have been removed. You can continue browsing by returning to the home page."
              : "Baglanti hatali olabilir ya da icerik kaldirilmis olabilir. Ana sayfaya donerek gezintiye devam edebilirsin."}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to={localizePath("/", locale)}
              className="rounded-full bg-quaternaryColor px-6 py-3 text-sm font-semibold text-white transition hover:bg-secondaryColor"
            >
              {locale === "en" ? "Back to Home" : "Ana Sayfaya Don"}
            </Link>
            <Link
              to={localizePath("/iletisim", locale)}
              className="rounded-full border border-slate-300 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white"
            >
              {locale === "en" ? "Contact Us" : "Iletisime Gec"}
            </Link>
          </div>
        </section>
      </motion.div>
      <Footer />
    </>
  );
}
