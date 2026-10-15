import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import NavbarPage from "../components/Navbar/NavbarPage";
import Footer from "../components/Footer/Footer";
import Breadcrumb from "../components/ui/Breadcrumb";
import {
  CheckCircle2,
  Wrench,
  ClipboardCheck,
  ShieldCheck,
  Timer,
  PhoneCall,
} from "lucide-react";
import { useLocale } from "../i18n/LocaleContext.jsx";
import { getWhyUsContent } from "../content/whyUsContent";
import { localizePath } from "../i18n/routing.js";

const WhyUsPage = () => {
  const { locale } = useLocale();
  const content = getWhyUsContent(locale).page;
  const steps = [
    { icon: PhoneCall, ...content.steps[0] },
    { icon: ClipboardCheck, ...content.steps[1] },
    { icon: Wrench, ...content.steps[2] },
    { icon: ShieldCheck, ...content.steps[3] },
  ];

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

        {/* breadcrumb */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6">
          <Breadcrumb
            items={[
              { label: locale === "en" ? "Home" : "Ana Sayfa", path: "/" },
              { label: content.breadcrumbCurrent },
            ]}
          />
        </div>

        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 md:pt-14 pb-12">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-5xl font-extrabold text-secondaryColor text-center"
            >
              {content.titlePrefix}{" "}
              <span className="text-quaternaryColor">{content.titleHighlight}</span>
              {content.titleSuffix}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4 text-center text-gray-600 max-w-2xl mx-auto"
            >
              {content.lead}
            </motion.p>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="h-1 w-24 bg-quaternaryColor/90 rounded-full mx-auto mt-6 origin-left"
            />
          </div>
        </section>

        {/* Değer teklifleri */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 pb-6">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                icon: CheckCircle2,
                t: content.valueCards[0].title,
                d: content.valueCards[0].desc,
              },
              {
                icon: Timer,
                t: content.valueCards[1].title,
                d: content.valueCards[1].desc,
              },
              {
                icon: ShieldCheck,
                t: content.valueCards[2].title,
                d: content.valueCards[2].desc,
              },
            ].map(({ icon: Icon, t, d }) => (
              <div
                key={t}
                className="rounded-2xl border border-white/40 bg-white/40 backdrop-blur-xl p-6 shadow"
              >
                <div className="inline-flex items-center justify-center rounded-xl bg-quaternaryColor/90 p-3 text-white shadow">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-lg font-semibold text-secondaryColor">
                  {t}
                </h3>
                <p className="mt-1 text-sm text-gray-700">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Süreç adımları */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 py-10">
          <h2 className="text-2xl md:text-3xl font-bold text-secondaryColor text-center">
            {content.processTitle}
          </h2>
          <div className="h-1 w-20 bg-quaternaryColor/90 rounded-full mx-auto mt-3 mb-8" />
          <div className="grid gap-6 md:grid-cols-4">
            {steps.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/40 bg-white/50 backdrop-blur-xl p-6 text-center shadow"
              >
                <div className="mx-auto mb-3 inline-flex items-center justify-center rounded-full bg-quaternaryColor/90 p-3 text-white shadow">
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="font-semibold text-secondaryColor">{title}</h4>
                <p className="mt-1 text-sm text-gray-700">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Referans/rozet şeridi */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 pb-10">
          <div className="rounded-3xl border border-white/30 bg-white/30 backdrop-blur-xl p-6 md:p-8 text-center shadow">
            <p className="text-sm md:text-base text-gray-700">
              {content.ribbon}
            </p>
          </div>
        </section>

        {/* SSS */}
        <section className="max-w-4xl mx-auto px-4 md:px-8 pb-14">
          <h3 className="text-xl md:text-2xl font-bold text-secondaryColor text-center">
            {content.faqTitle}
          </h3>
          <div className="h-1 w-16 bg-quaternaryColor/90 rounded-full mx-auto mt-3 mb-6" />
          <div className="space-y-3">
            {content.faqs.map(({ q, a }) => (
              <details
                key={q}
                className="rounded-xl border border-white/40 bg-white/50 backdrop-blur-xl p-4 shadow"
              >
                <summary className="cursor-pointer font-medium text-secondaryColor">
                  {q}
                </summary>
                <p className="mt-2 text-sm text-gray-700">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="pb-16">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="rounded-2xl border border-white/40 bg-quaternaryColor/90 text-white p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow">
              <div>
                <h4 className="text-lg md:text-xl font-semibold">
                  {content.ctaTitle}
                </h4>
                <p className="text-white/90 text-sm">
                  {content.ctaDescription}
                </p>
              </div>
              <Link
                to={localizePath("/iletisim", locale)}
                className="inline-flex items-center rounded-full bg-white text-quaternaryColor px-5 py-2 font-semibold hover:bg-white/90"
              >
                {content.ctaButton}
              </Link>
            </div>
          </div>
        </section>
      </motion.div>

      <Footer />
    </>
  );
};

export default WhyUsPage;
