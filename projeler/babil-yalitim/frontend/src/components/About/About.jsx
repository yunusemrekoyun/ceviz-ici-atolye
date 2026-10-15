import img1 from "../../assets/about.webp";
import { Users, CheckCircle, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { getAboutContent } from "../../content/aboutContent";
import { useLocale } from "../../i18n/LocaleContext.jsx";
import { localizePath } from "../../i18n/routing.js";

const About = () => {
  const { locale } = useLocale();
  const content = getAboutContent(locale);

  return (
    <section className="relative w-full text-white py-16 md:py-20 px-4 md:px-6">
      {/* soft blobs */}
      <div className="pointer-events-none absolute -top-10 -left-8 w-72 h-72 rounded-full bg-quaternaryColor/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -right-10 w-80 h-80 rounded-full bg-secondaryColor/10 blur-3xl" />

      {/* Glass surface — daha ferah */}
      <div className="mx-auto max-w-7xl rounded-3xl border border-white/40 bg-white/25 backdrop-blur-2xl shadow-[0_12px_50px_rgba(0,0,0,0.15)] p-4 sm:p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 items-start">
          {" "}
          {/* Sol: Görsel */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl overflow-hidden shadow-lg h-full"
          >
            <div className="h-full w-full">
              <img
                src={img1}
                alt="Yalıtım uygulaması"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </motion.div>
          {/* Sağ: İçerik Kartı */}
          {/* Sağ: İçerik Kartı */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="rounded-2xl bg-transparent hover:bg-secondaryColor/95 shadow-lg border border-white/20 p-6 md:p-8 flex flex-col transition-colors duration-500 ease-in-out"
          >
            <header>
              <h2 className="text-2xl md:text-3xl font-extrabold">
                {content.sectionTitle}
              </h2>
              <div className="mt-3 h-1 w-24 bg-quaternaryColor rounded-full" />
            </header>

            <p className="mt-5 whitespace-pre-line text-gray-100/90 leading-relaxed">
              {content.homeText}
            </p>

            {/* Sayısal Bilgiler */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-xl bg-white/10 border border-white/20 px-4 py-3">
                <Users className="text-buzbeyaz w-5 h-5" />
                <div>
                  <div className="text-lg font-bold text-buzbeyaz">250+</div>
                  <div className="text-xs text-buzbeyaz/90">
                    {content.homeStats[0].label}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/10 border border-white/20 px-4 py-3">
                <CheckCircle className="text-buzbeyaz w-5 h-5" />
                <div>
                  <div className="text-lg font-bold text-buzbeyaz">17+</div>
                  <div className="text-xs text-buzbeyaz/90">
                    {content.homeStats[1].label}
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-6 md:mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                whileHover={{ scale: 1.05 }}
              >
                <Link
                  to={localizePath("/about", locale)}
                  className="inline-flex items-center gap-2 text-sm text-white bg-quaternaryColor 
               px-4 py-2 rounded-full hover:bg-opacity-90 hover:shadow-lg 
               hover:bg-white/20 transition-all duration-300"
                >
                  {content.cta}
                  <ChevronRight size={16} />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
