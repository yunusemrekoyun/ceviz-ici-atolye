// src/pages/HomePage.jsx
import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar/Navbar";
import Hero from "../components/Hero/Hero";
import Journal from "../components/Journal/JournalGrid";
import Footer from "../components/Footer/Footer";
import ProjectsSection from "../components/ProjeGrid/ProjectsSection";
import WhyUs from "../components/WhyUs/WhyUs";
import ServiceSection from "../components/Service/ServiceSection";
import AboutSection from "../components/About/AboutSection";
import GlassSection from "../components/Layout/GlassSection";
import DeferredSection from "../components/Layout/DeferredSection";
import BlogGrid from "../components/Blog/BlogGrid";
import BrandsSection from "../components/Brands/BrandsSection";
import { usePerformanceProfile } from "../performance/PerformanceProvider";
import api from "../api";
import {
  DEFAULT_SITE_SETTINGS,
  normalizeSiteSettings,
} from "../utils/siteSettings";
import { fetchServicesCached } from "../utils/servicesCache";
import { useLocale } from "../i18n/LocaleContext";

export default function HomePage() {
  const { locale } = useLocale();
  const { isMobile, sectionRootMargin } = usePerformanceProfile();
  const [siteSettings, setSiteSettings] = useState(DEFAULT_SITE_SETTINGS);

  useEffect(() => {
    let active = true;

    api
      .get("/site-settings")
      .then(({ data }) => {
        if (!active) return;
        setSiteSettings(normalizeSiteSettings(data));
      })
      .catch((error) => {
        console.error("[HomePage] GET /site-settings error:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timerId = 0;

    const preload = () => {
      fetchServicesCached({ locale }).catch((error) => {
        if (!cancelled) {
          console.error("[HomePage] preload /services error:", error);
        }
      });

      import("./ServicePage.jsx").catch(() => {});
      import("./ServiceDetailsPage.jsx").catch(() => {});
      import("./SubServiceDetailsPage.jsx").catch(() => {});
    };

    if (!isMobile) {
      preload();
      return () => {
        cancelled = true;
      };
    }

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(preload, { timeout: 1800 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(idleId);
      };
    }

    timerId = window.setTimeout(preload, 900);
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [isMobile, locale]);

  const sections = useMemo(
    () => [
      ...(siteSettings.homeProjectsVisible
        ? [
            {
              id: "projects",
              minHeight: 760,
              eager: true,
              content: <ProjectsSection />,
            },
          ]
        : []),
      {
        id: "services",
        minHeight: 860,
        eager: !isMobile,
        content: <ServiceSection />,
      },
      {
        id: "journal",
        minHeight: 720,
        content: <Journal />,
      },
      {
        id: "why-us",
        minHeight: 700,
        content: <WhyUs />,
      },
      {
        id: "blog",
        minHeight: 720,
        content: <BlogGrid />,
      },
      {
        id: "about",
        minHeight: 640,
        content: <AboutSection />,
      },
    ],
    [isMobile, siteSettings.homeProjectsVisible],
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="relative z-10">
        {/* Desktop: navbar + hero birlikte tam 100vh kaplar */}
        <div className="md:flex md:flex-col md:h-screen">
          <div id="site-navbar" className="md:shrink-0">
            <Navbar />
          </div>
          <Hero targetId="after-hero" />
        </div>

        {/* Hedef çıpa: sayfanın “devamı” buradan başlıyor */}
        <div id="after-hero" />

        {/* Markalar masaüstünde hero'nun dışında; ok ile inilince ilk görülen blok.
            Mobil hero markaları kendi içinde gösterdiği için burada gizli. */}
        <div className="hidden md:block pt-8">
          <BrandsSection />
        </div>

        <div className="bg-transparanColor space-y-12 w-full px-4 sm:px-6 md:px-8 py-12 sm:py-16 flex flex-col items-center justify-center">
          {sections.map((section) => (
            <DeferredSection
              key={section.id}
              id={section.id}
              eager={section.eager}
              minHeight={section.minHeight}
              rootMargin={sectionRootMargin}
              className="w-full max-w-6xl"
            >
              <GlassSection>{section.content}</GlassSection>
            </DeferredSection>
          ))}
        </div>

        <Footer />
      </div>
    </div>
  );
}
