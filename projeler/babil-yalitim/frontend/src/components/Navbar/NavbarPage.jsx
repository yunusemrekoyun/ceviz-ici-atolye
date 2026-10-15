import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Logo from "../../assets/logo.png";
import LanguageSwitcher from "../Common/LanguageSwitcher.jsx";
import { useLocale } from "../../i18n/LocaleContext.jsx";
import { localizePath, stripLocalePrefix } from "../../i18n/routing.js";

const SlideAllIn = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
      when: "beforeChildren",
      staggerChildren: 0.05,
    },
  },
};

const topBarVariants = {
  hidden: { y: "-100%", opacity: 0 },
  visible: {
    y: "0%", opacity: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
  exit: {
    y: "-100%", opacity: 0,
    transition: { duration: 0.3, ease: "easeIn" },
  },
};

const NavbarPage = () => {
  const { locale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const copy =
    locale === "en"
      ? {
          navItems: [
            { label: "Services", path: "/services" },
            { label: "Projects", path: "/projects" },
            { label: "About", path: "/about" },
            { label: "Blog", path: "/blog" },
            { label: "News", path: "/journal" },
            { label: "Contact", path: "/iletisim" },
          ],
          openMenu: "Open menu",
          closeMenu: "Close menu",
          logoAlt: "Babil logo",
        }
      : {
          navItems: [
            { label: "Hizmetler", path: "/services" },
            { label: "Projeler", path: "/projects" },
            { label: "Hakkımızda", path: "/about" },
            { label: "Blog", path: "/blog" },
            { label: "Haberler", path: "/journal" },
            { label: "İletişim", path: "/iletisim" },
          ],
          openMenu: "Menüyü aç",
          closeMenu: "Menüyü kapat",
          logoAlt: "Babil logosu",
        };
  const navItems = copy.navItems;
  const currentPath = stripLocalePrefix(location.pathname);

  return (
    <header className="w-full z-30 relative">
      {/* ✅ Masaüstü */}
      <div className="hidden md:block">
        <motion.nav
          className="container mx-auto grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 pt-4 md:pt-6 uppercase font-semibold text-[11px] lg:text-sm xl:text-base text-neutral-800"
          variants={SlideAllIn}
          initial="hidden"
          animate="visible"
        >
          {/* Sol butonlar */}
          <div className="flex items-center justify-start gap-2 min-w-0">
            {navItems.slice(0, 3).map((item) => (
              <Link
                key={item.path}
                to={localizePath(item.path, locale)}
                className={`min-w-[106px] lg:min-w-[118px] xl:min-w-[132px] text-center px-3 lg:px-4 py-2 rounded-full transition
                  ${
                    currentPath === stripLocalePrefix(item.path)
                      ? "bg-white text-black"
                      : "border border-gray-500 hover:bg-gray-100"
                  }
                `}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Logo */}
          <Link to={localizePath("/", locale)} className="justify-self-center">
            <img
              src={Logo}
              alt={copy.logoAlt}
              className="w-[156px] lg:w-[178px] xl:w-[200px]"
            />
          </Link>

          {/* Sağ butonlar */}
          <div className="flex items-center justify-end gap-2 min-w-0">
            {navItems.slice(3).map((item) => (
              <Link
                key={item.path}
                to={localizePath(item.path, locale)}
                className={`min-w-[106px] lg:min-w-[118px] xl:min-w-[132px] text-center px-3 lg:px-4 py-2 rounded-full transition
                  ${
                    currentPath === stripLocalePrefix(item.path)
                      ? "bg-white text-black"
                      : "border border-gray-500 hover:bg-gray-100"
                  }
                `}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </motion.nav>

        <div className="container mx-auto mt-3 flex justify-end">
          <LanguageSwitcher theme="light" className="shrink-0" />
        </div>
      </div>

      {/* ✅ Mobil Navbar */}
      <div className="md:hidden border-b border-gray-300 bg-white px-4 text-neutral-800" style={{ height: "80px" }}>
        <div className="relative h-full flex items-center justify-center">
          <Link to={localizePath("/", locale)} className="shrink-0">
            <img src={Logo} alt={copy.logoAlt} className="h-[107px] w-auto max-w-[calc(100vw-4rem)] object-contain" />
          </Link>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-0 z-50 grid size-10 place-items-center"
            aria-label={isOpen ? copy.closeMenu : copy.openMenu}
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* ✅ Mobil Menü Açılır */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={topBarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute top-0 left-0 right-0 bg-white text-neutral-800 flex flex-col items-center gap-4 py-6 z-40 border-b border-gray-300"
          >
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={localizePath(item.path, locale)}
                onClick={() => setIsOpen(false)}
                className={`text-lg uppercase w-[140px] text-center py-2 rounded-full transition
                  ${
                    currentPath === stripLocalePrefix(item.path)
                      ? "bg-black text-white"
                      : "border border-gray-400 hover:bg-gray-100"
                  }
                `}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2">
              <LanguageSwitcher theme="light" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default NavbarPage;
