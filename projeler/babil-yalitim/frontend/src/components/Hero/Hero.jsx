// src/components/Hero/Hero.jsx
import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import SearchBar from "../SearchBar/SearchBar";
import BrandsSection from "../Brands/BrandsSection";
import HeroServiceRibbon from "./HeroServiceRibbon.jsx";
import { useLocale } from "../../i18n/LocaleContext.jsx";

const clamp01 = (value) => Math.min(Math.max(value, 0), 1);
const easeOutCubic = (value) => 1 - Math.pow(1 - clamp01(value), 3);
const easeInOutCubic = (value) => {
  const t = clamp01(value);
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const Hero = ({ targetId = "after-hero" }) => {
  const { locale } = useLocale();
  const mobileHeroRef = useRef(null);
  const mobileDetailsRef = useRef(null);
  const mobileArrowRef = useRef(null);
  const [mobileRevealProgress, setMobileRevealProgress] = useState(0);
  const [mobileArrowTop, setMobileArrowTop] = useState(null);
  const [mobileArrowDismissed, setMobileArrowDismissed] = useState(false);
  const [mobileArrowVisible, setMobileArrowVisible] = useState(true);
  const [mobileSearchFocused, setMobileSearchFocused] = useState(false);

  const copy =
    locale === "en"
      ? {
          title: "Insulation,\nExpertly Done",
          subtitle: "Welcome to Babil.",
        }
      : {
          title: "Yalıtımda Uzman",
          subtitle: "Babil'e Hoş Geldiniz.",
        };

  useEffect(() => {
    let frameId = 0;

    const updateProgress = () => {
      frameId = 0;
      const section = mobileHeroRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const totalScrollable = Math.max(
        section.offsetHeight - window.innerHeight,
        1
      );
      const scrollTop = Math.max(
        window.scrollY || 0,
        document.documentElement?.scrollTop || 0
      );
      const nextProgress =
        scrollTop > 26 ? clamp01(-rect.top / totalScrollable) : 0;

      if (scrollTop > 26) {
        setMobileArrowDismissed(true);
        setMobileArrowVisible(false);
      }

      setMobileRevealProgress((prev) =>
        Math.abs(prev - nextProgress) < 0.01 ? prev : nextProgress
      );
    };

    const onScroll = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    let frameId = 0;

    const updateArrowPosition = () => {
      frameId = 0;

      const vv = window.visualViewport;
      const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const heroRect = mobileHeroRef.current?.getBoundingClientRect();
      const buttonHeight = mobileArrowRef.current?.offsetHeight || 44;
      const gap = vv
        ? Math.max(14, Math.min(24, vv.height * 0.018 + 8))
        : 18;
      const nextTop = Math.max(visibleBottom - buttonHeight - gap, 0);
      const nextVisible =
        !mobileArrowDismissed &&
        !mobileSearchFocused &&
        Boolean(heroRect && heroRect.top < visibleBottom - 24 && heroRect.bottom > 56);

      setMobileArrowTop((prev) =>
        prev !== null && Math.abs(prev - nextTop) < 1 ? prev : nextTop
      );
      setMobileArrowVisible((prev) => (prev === nextVisible ? prev : nextVisible));
    };

    const scheduleUpdate = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(updateArrowPosition);
    };

    updateArrowPosition();

    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });

    const vv = window.visualViewport;
    vv?.addEventListener("resize", scheduleUpdate);
    vv?.addEventListener("scroll", scheduleUpdate);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate);
      vv?.removeEventListener("resize", scheduleUpdate);
      vv?.removeEventListener("scroll", scheduleUpdate);
    };
  }, [mobileArrowDismissed, mobileSearchFocused]);

  const mobileTitleProgress = easeInOutCubic(mobileRevealProgress / 0.5);
  const mobileDetailsProgressRaw = easeOutCubic(
    (mobileRevealProgress - 0.07) / 0.28
  );
  const mobileDetailsProgress = mobileSearchFocused
    ? 0
    : mobileDetailsProgressRaw;
  const mobileTitleScale = 1 - mobileTitleProgress * 0.14;
  const mobileTitleY = -mobileTitleProgress * 18;
  const mobileTitleOpacity = 1 - mobileTitleProgress * 0.1;
  const mobileDetailsMaxHeight = 360 * mobileDetailsProgress;
  const mobileDetailsY = 18 * (1 - mobileDetailsProgress);
  const mobileDetailsScale = 0.985 + mobileDetailsProgress * 0.015;

  useEffect(() => {
    const details = mobileDetailsRef.current;
    if (!details) return;

    const isHidden = mobileDetailsProgress < 0.08;
    const activeElement = document.activeElement;

    if (isHidden) {
      if (activeElement instanceof HTMLElement && details.contains(activeElement)) {
        activeElement.blur();
      }
      details.setAttribute("inert", "");
      return;
    }

    details.removeAttribute("inert");
  }, [mobileDetailsProgress]);

  const scrollToTarget = () => {
    const external = document.getElementById(targetId);
    const header = document.getElementById("site-navbar");
    const headerH = header ? header.offsetHeight : 0;

    if (external) {
      const rect = external.getBoundingClientRect();
      const top = rect.top + window.scrollY - headerH - 8;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      return;
    }

    // Fallback: bir ekran aşağı kaydır
    window.scrollTo({ top: window.scrollY + window.innerHeight, behavior: "smooth" });
  };

  return (
    <>
      {/* ======== MOBILE ======== */}
      <section
        ref={mobileHeroRef}
        className="md:hidden relative min-h-[128dvh] overflow-hidden px-3 bg-gradient-to-t from-white/10 to-transparent"
      >
        <div
          className="sticky top-0 flex min-h-[100dvh] flex-col"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
        >
          <div className="w-full px-2 pt-[16vh] z-20">
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.2 }}
              style={{
                scale: mobileTitleScale,
                y: mobileTitleY,
                opacity: mobileTitleOpacity,
                transformOrigin: "top center",
              }}
              className="mx-auto max-w-[22rem] text-center will-change-transform"
            >
              <h1 className="whitespace-pre-line text-[42px] xs:text-[48px] font-extrabold text-white drop-shadow-lg leading-[0.95]">
                {copy.title}
              </h1>
              <p className="mt-3 text-lg xs:text-xl text-gray-100">
                {copy.subtitle}
              </p>
            </motion.div>
          </div>

          <div
            className="w-full px-1 z-20"
            style={{ marginTop: "clamp(4.75rem, 18vh, 9rem)" }}
          >
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.52 }}
              className="relative z-20 w-full max-w-4xl mx-auto"
            >
              <SearchBar onFocusChange={setMobileSearchFocused} />
            </motion.div>

            <motion.div
              ref={mobileDetailsRef}
              initial={false}
              style={{
                opacity: mobileDetailsProgress,
                y: mobileDetailsY,
                scale: mobileDetailsScale,
                maxHeight: `${mobileDetailsMaxHeight}px`,
                transformOrigin: "top center",
              }}
              className={`relative z-10 mt-5 overflow-hidden ${
                mobileDetailsProgress < 0.08 ? "pointer-events-none" : ""
              }`}
            >
              <div className="w-full relative z-30">
                <HeroServiceRibbon />
              </div>

              <div className="relative z-10 w-full mt-4 px-1">
                <BrandsSection />
              </div>
            </motion.div>
          </div>

          <div
            className={`pointer-events-none fixed inset-x-0 z-[70] flex justify-center md:hidden transition-opacity duration-200 ${
              mobileArrowVisible ? "opacity-100" : "opacity-0"
            }`}
            style={
              mobileArrowTop !== null
                ? { top: `${mobileArrowTop}px` }
                : { bottom: "4.25rem" }
            }
          >
            <motion.button
              ref={mobileArrowRef}
              onClick={scrollToTarget}
              aria-label="Aşağı kaydır"
              className="pointer-events-auto transform-gpu-soft rounded-full border border-white/30 bg-white/15 backdrop-blur-xl
                         shadow-[0_6px_30px_rgba(0,0,0,0.2)] p-2.5 hover:bg-white/25 transition"
              animate={{ y: [0, 10, 0] }}
              transition={{
                repeat: Infinity,
                repeatType: "loop",
                duration: 1.6,
                ease: "easeInOut",
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="text-white/90"
              >
                <path
                  d="M6 9l6 6 6-6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.button>
          </div>
        </div>
      </section>

      {/* ======== DESKTOP ======== */}
      <section className="desktop-short-hero hidden md:flex flex-1 flex-col items-center bg-gradient-to-t from-white/10 to-transparent px-8 relative">
        {/* Merkez içerik — flex-1 ile kalan alanı alır, min-h-0 flex shrink için gerekli */}
        <div className="desktop-short-hero-center flex-1 min-h-0 flex flex-col justify-center items-center w-full">
          <div className="desktop-short-hero-stack container max-w-[92%] sm:max-w-4xl mx-auto relative z-20 flex flex-col items-center text-center gap-4 xl:gap-5 px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
            >
              <h1 className="desktop-short-hero-title whitespace-pre-line font-bold text-white drop-shadow-lg leading-[0.95] text-4xl lg:text-[2.75rem] xl:text-5xl">
                {copy.title}
              </h1>
              <p className="desktop-short-hero-subtitle mt-2 text-gray-300 text-base lg:text-lg xl:text-xl">
                {copy.subtitle}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="desktop-short-hero-ribbon relative z-30 w-full"
            >
              <HeroServiceRibbon />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.58 }}
              className="w-16 h-1 bg-quaternaryColor rounded-full"
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.72 }}
              className="desktop-short-hero-search relative z-20 w-full"
            >
              <SearchBar />
            </motion.div>
          </div>
        </div>

        {/* Markalar artık hero'nun içinde değil; HomePage okun indiği noktaya
            koyuyor. Küçük laptop ekranlarında hero'daki her şey sıkışıp videodaki
            uygulamayı örtüyordu. Mobil hero kendi markalarını göstermeye devam eder. */}

        {/* Aşağı ok — viewport'un dibinde, kesinlikle küçülmez */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="desktop-short-hero-arrow w-full flex justify-center py-2 z-10 shrink-0"
        >
          <motion.button
            onClick={scrollToTarget}
            aria-label="Aşağı kaydır"
            className="desktop-short-hero-arrow-btn transform-gpu-soft rounded-full border border-white/30 bg-white/15 backdrop-blur-xl shadow-[0_6px_30px_rgba(0,0,0,0.2)] p-3 hover:bg-white/25 transition"
            animate={{ y: [0, 10, 0] }}
            transition={{
              repeat: Infinity,
              repeatType: "loop",
              duration: 1.6,
              ease: "easeInOut",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="text-white/90"
            >
              <path
                d="M6 9l6 6 6-6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.button>
        </motion.div>
      </section>
    </>
  );
};

Hero.propTypes = {
  /** Ok tıklandığında kaydırılacak dış anchor’ın id’si */
  targetId: PropTypes.string,
};

export default Hero;
