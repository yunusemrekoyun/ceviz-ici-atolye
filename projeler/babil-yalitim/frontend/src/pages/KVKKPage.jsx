// src/pages/KVKKPage.jsx
import { motion } from "framer-motion";
import PropTypes from "prop-types";
import NavbarPage from "../components/Navbar/NavbarPage";
import Footer from "../components/Footer/Footer";
import { useLocale } from "../i18n/LocaleContext.jsx";
import { getKvkkContent } from "../content/kvkkContent";

/** ---------- Reusable Section ---------- */
const RichBlock = ({ html }) => (
  <div dangerouslySetInnerHTML={{ __html: html }} />
);

RichBlock.propTypes = {
  html: PropTypes.string.isRequired,
};

const Section = ({ id, title, paragraphs = [], bullets = [] }) => (
  <section id={id} className="scroll-mt-28">
    <h2 className="text-xl md:text-2xl font-bold text-secondaryColor">
      {title}
    </h2>
    <div className="h-[3px] w-14 bg-quaternaryColor/90 rounded-full mt-2 mb-4" />
    <div className="prose prose-sm md:prose-base max-w-none prose-headings:font-semibold prose-p:text-gray-700 prose-li:text-gray-700">
      {paragraphs.map((paragraph) => (
        <RichBlock key={paragraph} html={`<p>${paragraph}</p>`} />
      ))}
      {bullets.length ? (
        <ul className="list-disc pl-5 mt-3">
          {bullets.map((bullet) => (
            <li key={bullet}>
              <RichBlock html={bullet} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  </section>
);

Section.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  paragraphs: PropTypes.arrayOf(PropTypes.string),
  bullets: PropTypes.arrayOf(PropTypes.string),
};

/**
 * Babil Yalıtım – KVKK Aydınlatma Metni
 * Site: babilyalitim.com
 * Bu metin örnek/temel hukuki içerik sağlar; işletmenize özel değişkenleri (ticari unvan, adres, yetkili kişi vb.)
 * lütfen güncelleyin.
 */
const KvkkPage = () => {
  const { locale } = useLocale();
  const content = getKvkkContent(locale);

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

        {/* Hero */}
        <header className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-24 -right-16 w-[420px] h-[420px] rounded-full bg-quaternaryColor/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 w-[320px] h-[320px] rounded-full bg-secondaryColor/10 blur-3xl" />
          <div className="max-w-7xl mx-auto px-6 md:px-10 pt-14 md:pt-18">
            <h1 className="text-3xl md:text-5xl font-extrabold text-secondaryColor tracking-tight">
              {content.title}
            </h1>
            <p className="mt-4 text-gray-600 max-w-3xl">
              {content.intro}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              {content.updatedLabel}: <strong>{content.updatedAt}</strong>
            </p>
            <div className="h-1 w-24 bg-quaternaryColor/90 rounded-full mt-6" />
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-6 md:px-10 pb-20 pt-10">
          {/* TOC */}
          <nav className="mb-10 rounded-2xl bg-white/70 backdrop-blur border border-white/50 p-6">
            <h2 className="text-lg font-semibold text-brandBlue mb-3">
              {content.contentsTitle}
            </h2>
            <ul className="grid md:grid-cols-2 gap-y-2 text-sm">
              {content.toc.map(([id, label]) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="text-gray-700 hover:text-quaternaryColor underline-offset-2 hover:underline"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main text */}
            <div className="lg:col-span-2 space-y-10">
              <Section
                id="veri-sorumlusu"
                title={content.sections.controller.title}
                paragraphs={content.sections.controller.paragraphs}
                bullets={content.sections.controller.bullets}
              />

              <Section
                id="isleme-amac"
                title={content.sections.purpose.title}
                paragraphs={content.sections.purpose.paragraphs}
                bullets={content.sections.purpose.bullets}
              />

              <Section
                id="kategori-hukuki"
                title={content.sections.categories.title}
                paragraphs={content.sections.categories.paragraphs}
                bullets={content.sections.categories.bullets}
              />

              <Section
                id="toplama-yontem"
                title={content.sections.collection.title}
                paragraphs={content.sections.collection.paragraphs}
              />

              <Section
                id="aktarma"
                title={content.sections.transfer.title}
                paragraphs={content.sections.transfer.paragraphs}
              />

              <Section
                id="haklar"
                title={content.sections.rights.title}
                paragraphs={content.sections.rights.paragraphs}
                bullets={content.sections.rights.bullets}
              />

              <Section
                id="basvuru"
                title={content.sections.application.title}
                paragraphs={content.sections.application.paragraphs}
              />

              <Section
                id="saklama-guvenlik"
                title={content.sections.retention.title}
                paragraphs={content.sections.retention.paragraphs}
              />

              <Section
                id="cerez"
                title={content.sections.cookies.title}
                paragraphs={content.sections.cookies.paragraphs}
                bullets={content.sections.cookies.bullets}
              />

              <Section
                id="taminek"
                title={content.sections.changes.title}
                paragraphs={content.sections.changes.paragraphs}
              />
            </div>

            {/* Side panel */}
            <aside className="space-y-6">
              <div className="rounded-2xl bg-white/70 backdrop-blur border border-white/50 p-6">
                <h3 className="text-base font-semibold text-brandBlue">
                  {content.quickLinksTitle}
                </h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {content.quickLinks.map(([href, label]) => (
                    <li key={href}>
                      <a
                        href={href}
                        className="text-gray-700 hover:text-quaternaryColor underline"
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl bg-white/70 backdrop-blur border border-white/50 p-6">
                <h3 className="text-base font-semibold text-brandBlue">
                  {content.contactTitle}
                </h3>
                <div className="text-sm text-gray-700 mt-2">
                  <RichBlock html={content.contactText} />
                </div>
              </div>

              <div className="rounded-2xl bg-white/70 backdrop-blur border border-white/50 p-6">
                <h3 className="text-base font-semibold text-brandBlue">
                  {content.analyticsTitle}
                </h3>
                <p className="text-sm text-gray-700">{content.analyticsText}</p>
              </div>
            </aside>
          </div>
        </main>
      </motion.div>

      <Footer />
    </>
  );
};

export default KvkkPage;
