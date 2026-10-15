import PropTypes from "prop-types";
import {
  Menu,
  Shield,
  CircleUserRound,
  Sparkles,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import { useLocation } from "react-router-dom";

/**
 * Basit route → başlık eşleme
 */
const TITLES = [
  { path: "/admin/dashboard", title: "Dashboard" },
  { path: "/admin/blogs", title: "Bloglar" },
  { path: "/admin/journals", title: "Haberler" },
  { path: "/admin/projects", title: "Projeler" },
  { path: "/admin/services", title: "Hizmetler" },
];

const Topbar = ({ onMenuClick, theme = "light", onToggleTheme }) => {
  const location = useLocation();
  const current =
    TITLES.find((t) => location.pathname.startsWith(t.path))?.title ||
    "Admin Panel";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-2xl shadow-md shadow-slate-200/50 dark:border-[#2c2f36] dark:bg-[#202124]/90 dark:shadow-black/40">
      <div className="relative h-20 flex items-center gap-4 px-4 sm:px-6 lg:px-10">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="inline-flex lg:hidden h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/70 bg-white/90 text-slate-800 shadow hover:-translate-y-[1px] transition dark:border-[#2c2f36] dark:bg-[#202124] dark:text-slate-100"
          aria-label="Menüyü aç"
        >
          <Menu size={20} />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-sky-400 via-indigo-400 to-blue-500 grid place-items-center text-white shadow-md shadow-sky-200/60 border border-white/70 dark:shadow-none">
            <Shield size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
              <span className="admin-pill">Yönetim</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-slate-500 dark:text-slate-300">
                <ChevronRight size={12} />
                {current}
              </span>
              <button
                type="button"
                onClick={onToggleTheme}
                aria-label="Tema değiştir"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-white/90 px-2 py-1 text-[10px] font-semibold tracking-wide text-slate-700 shadow-sm hover:border-slate-300 hover:text-slate-900 dark:border-[#2c2f36] dark:bg-[#202124] dark:text-slate-100 dark:hover:border-slate-500"
              >
                {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
                <span className="hidden md:inline">
                  {theme === "dark" ? "Aydınlık" : "Karanlık"}
                </span>
              </button>
            </div>
            <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">
              {current}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Panel görünümü {theme === "dark" ? "karanlık" : "aydınlık"} modda.
            </p>
          </div>
        </div>

        {/* right slot */}
        <div className="ml-auto hidden sm:flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 border border-slate-200/60 shadow-sm dark:bg-[#202124] dark:border-[#2c2f36]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Çevrimiçi
          </span>
          <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-slate-100/80 px-3 py-1.5 border border-slate-200 text-slate-700 shadow-sm dark:bg-[#2a2d32] dark:border-[#2c2f36] dark:text-slate-100">
            <Sparkles size={14} />
            Oturum açık
          </span>
        </div>

        <div className="ml-4 flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-white/90 grid place-items-center text-slate-700 shadow border border-slate-200/80 dark:bg-[#2a2d32] dark:text-slate-100 dark:border-[#2c2f36]">
            <CircleUserRound size={18} />
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-xs text-slate-500 dark:text-slate-400">Admin</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              Babil
            </span>
          </div>
          <button className="hidden lg:inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/80 px-4 text-xs font-semibold text-slate-800 shadow-sm hover:-translate-y-[1px] transition dark:border-[#2c2f36] dark:bg-[#202124] dark:text-slate-100">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Aktif
          </button>
        </div>
      </div>
    </header>
  );
};

Topbar.propTypes = {
  onMenuClick: PropTypes.func,
  theme: PropTypes.oneOf(["light", "dark"]),
  onToggleTheme: PropTypes.func,
};

export default Topbar;
