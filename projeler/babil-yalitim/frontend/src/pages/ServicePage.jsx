import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useState } from "react";
import NavbarPage from "../components/Navbar/NavbarPage";
import Footer from "../components/Footer/Footer";
import ServicePageComponent from "../components/Service/ServicePageComponent";
import Breadcrumb from "../components/ui/Breadcrumb";
import { useLocale } from "../i18n/LocaleContext";

const ServicePage = () => {
  const [query, setQuery] = useState("");
  const { locale } = useLocale();
  const copy =
    locale === "en"
      ? {
          breadcrumb: "Services",
          title: "Our Services",
          searchLabel: "Search services",
          searchPlaceholder: "Search services...",
        }
      : {
          breadcrumb: "Hizmetlerimiz",
          title: "Hizmetlerimiz",
          searchLabel: "Hizmetlerde ara",
          searchPlaceholder: "Hizmetlerde ara...",
        };

  return (
    <>
      <motion.div
        className="min-h-screen bg-gradient-to-br from-white via-gray-100 to-orange-50"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 32 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <NavbarPage />

        {/* Breadcrumb */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 pt-6">
          <Breadcrumb
            titleMap={{
              services: copy.breadcrumb,
            }}
          />
        </section>

        {/* Header */}
        <section className="px-4 md:px-8 lg:px-10 pt-4 pb-10 md:pt-5 md:pb-14 max-w-7xl mx-auto">
          <div className="mb-6 rounded-[28px] border border-white/45 bg-white/60 p-4 shadow-sm backdrop-blur-xl md:mb-7 md:px-6 md:py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
              <div className="min-w-0">
                <h1 className="text-3xl font-bold tracking-tight text-secondaryColor md:text-5xl">
                  {copy.title}
                </h1>
                <div className="mt-3 h-1 w-20 rounded-full bg-quaternaryColor/90" />
              </div>

              <label
                htmlFor="svc-search-page"
                className="relative block w-full max-w-xl lg:min-w-[360px] lg:flex-1"
              >
                <span className="sr-only">{copy.searchLabel}</span>
                <input
                  id="svc-search-page"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className="w-full rounded-2xl border border-white/55 bg-white/88 py-3.5 pl-5 pr-14 text-[15px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-quaternaryColor/30 focus:bg-white focus:ring-2 focus:ring-quaternaryColor/20"
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                  <Search size={19} />
                </span>
              </label>
            </div>
          </div>

          <ServicePageComponent q={query} />
        </section>
      </motion.div>

      <Footer />
    </>
  );
};

export default ServicePage;
