// src/components/Navbar/Navbar.jsx
import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Logo from "../../assets/logo.png";
import LanguageSwitcher from "../Common/LanguageSwitcher.jsx";
import { useLocale } from "../../i18n/LocaleContext.jsx";
import { localizePath, stripLocalePrefix } from "../../i18n/routing.js";

/** ---- Ayarlar ---- */
const LOGO_WIDTH = 200; // px: desktop merkez hesapları için
const GAP = 28;
const CLOSE_DELAY = 1200;

/** ---- Variants ---- */
const listVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.22,
      ease: [0.25, 0.8, 0.4, 1],
      when: "beforeChildren",
      delayChildren: 0.05,
      staggerChildren: 0.035,
    },
  },
};

const chip = (dir) => ({
  hidden: { x: dir === "L" ? 10 : -10, opacity: 0, scale: 0.96 },
  visible: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: { duration: 0.18, ease: [0.22, 0.68, 0.4, 0.92] },
  },
});

export default function Navbar() {
  const { locale } = useLocale();
  const [isOpen, setIsOpen] = useState(false); // mobil
  const [flyout, setFlyout] = useState(false); // desktop hover
  const hideTimer = useRef(null);
  const location = useLocation();

  const copy =
    locale === "en"
      ? {
          navLeft: [
            { label: "About", href: "/about" },
            { label: "Projects", href: "/projects" },
            { label: "Services", href: "/services" },
          ],
          navRight: [
            { label: "Blog", href: "/blog" },
            { label: "News", href: "/journal" },
            { label: "Contact", href: "/iletisim" },
          ],
          closeMenu: "Close menu",
          openMenu: "Open menu",
          logoAlt: "Babil logo",
        }
      : {
          navLeft: [
            { label: "Hakkımızda", href: "/about" },
            { label: "Projeler", href: "/projects" },
            { label: "Hizmetler", href: "/services" },
          ],
          navRight: [
            { label: "Blog", href: "/blog" },
            { label: "Haberler", href: "/journal" },
            { label: "İletişim", href: "/iletisim" },
          ],
          closeMenu: "Menüyü kapat",
          openMenu: "Menüyü aç",
          logoAlt: "Babil logosu",
        };

  const navLeft = copy.navLeft;
  const navRight = copy.navRight;
  const currentPath = stripLocalePrefix(location.pathname);

  const keepOpen = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setFlyout(true);
  };
  const delayedClose = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setFlyout(false), CLOSE_DELAY);
  };

  /** body scroll kilidi (mobil menü açıkken) */
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (isOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  /** ---- Desktop için mutlak konumlar ---- */
  const half = LOGO_WIDTH / 2;
  const leftAnchorStyle = {
    left: `calc(50% - ${half + GAP}px)`,
    transform: "translateX(-100%) translateY(-50%)",
    top: "50%",
  };
  const rightAnchorStyle = {
    left: `calc(50% + ${half + GAP}px)`,
    transform: "translateX(0) translateY(-50%)",
    top: "50%",
  };

  return (
    <header className="w-full z-30 relative">
      {/* ===== Masaüstü ===== */}
      <nav className="desktop-short-nav hidden md:flex relative container mx-auto items-center justify-center py-5 text-white uppercase font-semibold text-sm lg:text-base select-none">
        {/* Logo + görünmez hover alanı */}
        <div
          className="relative"
          onMouseEnter={keepOpen}
          onMouseLeave={delayedClose}
          style={{ width: LOGO_WIDTH }}
        >
          <Link to={localizePath("/", locale)} className="block relative">
            <img
              src={Logo}
              alt={copy.logoAlt}
              className="desktop-short-nav-logo w-full pointer-events-none"
            />
            <span className="absolute inset-[-18px]" />
          </Link>

          {/* Sol uçan linkler */}
          <div
            className="absolute"
            style={leftAnchorStyle}
            onMouseEnter={keepOpen}
            onMouseLeave={delayedClose}
          >
            <motion.div
              initial="hidden"
              animate={flyout ? "visible" : "hidden"}
              variants={listVariants}
              style={{ pointerEvents: flyout ? "auto" : "none" }}
              className="flex flex-row-reverse gap-3 will-change-transform"
            >
              {navLeft.map((it) => (
                <motion.div
                  key={it.href}
                  variants={chip("L")}
                  initial="hidden"
                  animate="visible"
                  style={{ willChange: "transform, opacity" }}
                >
                  <Link
                    to={localizePath(it.href, locale)}
                    className={`pointer-events-auto block whitespace-nowrap rounded-full border border-white/80 px-4 py-2 text-center transition ${
                      currentPath === stripLocalePrefix(it.href)
                        ? "bg-white text-black"
                        : "hover:bg-white/10"
                    }`}
                  >
                    {it.label}
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Sağ uçan linkler */}
          <div
            className="absolute"
            style={rightAnchorStyle}
            onMouseEnter={keepOpen}
            onMouseLeave={delayedClose}
          >
            <motion.div
              initial="hidden"
              animate={flyout ? "visible" : "hidden"}
              variants={listVariants}
              style={{ pointerEvents: flyout ? "auto" : "none" }}
              className="flex flex-row gap-3 will-change-transform"
            >
              {navRight.map((it) => (
                <motion.div
                  key={it.href}
                  variants={chip("R")}
                  initial="hidden"
                  animate="visible"
                  style={{ willChange: "transform, opacity" }}
                >
                  <Link
                    to={localizePath(it.href, locale)}
                    className={`pointer-events-auto block whitespace-nowrap rounded-full border border-white/80 px-4 py-2 text-center transition ${
                      currentPath === stripLocalePrefix(it.href)
                        ? "bg-white text-black"
                        : "hover:bg-white/10"
                    }`}
                  >
                    {it.label}
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <LanguageSwitcher className="border-white/25 bg-white/10" />
        </div>
      </nav>

      {/* ===== Mobil (light/glass tasarım) ===== */}
      <div className="md:hidden sticky top-0 z-40 px-4 text-white" style={{ height: "80px" }}>
        {/* bar'ı şeffaf tut, okunabilirlik için çok hafif cam efekti ve çizgi */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-xl border-b border-white/20 pointer-events-none" />
        <div className="relative h-full flex items-center justify-center">
          <Link to={localizePath("/", locale)} className="relative z-10 shrink-0">
            <img src={Logo} alt={copy.logoAlt} className="h-[130px] w-auto max-w-[calc(100vw-4rem)] object-contain" />
          </Link>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-0 z-10 grid size-10 place-items-center rounded-md text-white active:scale-95"
            aria-label={isOpen ? copy.closeMenu : copy.openMenu}
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: "-100%", opacity: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              transition: { duration: 0.35, ease: "easeOut" },
            }}
            exit={{
              y: "-100%",
              opacity: 0,
              transition: { duration: 0.28, ease: "easeIn" },
            }}
            className="md:hidden fixed inset-0 z-40"
          >
            {/* aydınlık, siyahsız menü yüzeyi */}
            <div className="absolute inset-0 bg-white/85 backdrop-blur-md" />
            <div className="relative h-full w-full flex flex-col items-center gap-4 pt-[calc(env(safe-area-inset-top,0)+88px)] pb-[calc(env(safe-area-inset-bottom,0)+24px)]">
              {[...navLeft, ...navRight].map((it) => (
                <Link
                  key={it.href}
                  to={localizePath(it.href, locale)}
                  onClick={() => setIsOpen(false)}
                  className={`w-[78%] max-w-xs text-center py-3 text-lg uppercase rounded-full transition ${
                    location.pathname === it.href
                      ? "bg-gray-900 text-white"
                      : "bg-white border border-gray-300 text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {it.label}
                </Link>
              ))}
              <div className="mt-2">
                <LanguageSwitcher />
              </div>
            </div>

            {/* kapatma butonu (üst sağ) – kontrastlı */}
            <button
              onClick={() => setIsOpen(false)}
              aria-label={copy.closeMenu}
              className="absolute top-[calc(env(safe-area-inset-top,0)+12px)] right-4 text-gray-900/80 hover:text-gray-900 active:scale-95"
            >
              <X size={28} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
