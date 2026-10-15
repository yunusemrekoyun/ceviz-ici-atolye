// src/admin/components/Sidebar.jsx
import PropTypes from "prop-types";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  LayoutDashboard,
  FileText,
  Newspaper,
  FolderKanban,
  Wrench,
  LogOut,
  X,
  Home,
  Sparkles,
  HardDrive,
} from "lucide-react";

const links = [
  { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/blogs", label: "Bloglar", icon: FileText },
  { path: "/admin/journals", label: "Haberler", icon: Newspaper },
  { path: "/admin/projects", label: "Projeler", icon: FolderKanban },
  { path: "/admin/services", label: "Hizmetler", icon: Wrench },
  { path: "/admin/storage", label: "Depolama", icon: HardDrive },
];

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { logout } = useAuth();

  const linkClass = ({ isActive }) =>
    [
      "group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition border",
      isActive
        ? "bg-white text-slate-900 border-slate-200 shadow-lg shadow-sky-100 dark:bg-slate-100 dark:text-slate-950 dark:border-slate-200 dark:shadow-black/30"
        : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-white hover:text-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800/85 dark:hover:text-white",
    ].join(" ");

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 bg-white/85 text-slate-800 border-r border-slate-200/60 backdrop-blur-2xl shadow-[0_24px_70px_-50px_rgba(15,23,42,0.35)] rounded-r-3xl dark:bg-[#202124]/90 dark:text-slate-100 dark:border-[#2c2f36] dark:shadow-black/40">
        {/* Logo / Başlık */}
        <div className="relative h-20 flex items-center justify-between px-5 border-b border-slate-200/60 dark:border-[#2c2f36]">
          <div className="relative flex items-center gap-2">
            <div className="h-11 w-11 rounded-2xl bg-slate-800 grid place-items-center text-white shadow-md shadow-slate-500/30 border border-white/60 dark:border-[#2c2f36] dark:bg-[#303134]">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                Babil
              </p>
              <span className="font-semibold tracking-wide text-slate-900 dark:text-white">
                Admin Panel
              </span>
            </div>
          </div>
        </div>

        {/* Anasayfa butonu */}
        <div className="p-4 border-b border-slate-200/60 dark:border-[#2c2f36]">
          <NavLink
            to="/"
            className="w-full inline-flex items-center gap-2 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white px-3 py-2.5 text-sm transition shadow shadow-slate-500/30 dark:bg-[#2a2d32] dark:hover:bg-[#34363d]"
          >
            <Home size={18} />
            Anasayfa
          </NavLink>
        </div>

        {/* Linkler */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {links.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={linkClass}
              onClick={onClose}
              aria-current={location.pathname === path ? "page" : undefined}
            >
              <Icon size={18} className="opacity-90" />
              <span className="text-sm">{label}</span>
            </NavLink>
          ))}

          <div className="pt-3">
            <button
              onClick={logout}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white px-3 py-2.5 text-sm transition shadow shadow-slate-500/30 dark:bg-[#2a2d32] dark:hover:bg-[#34363d]"
            >
              <LogOut size={18} />
              Çıkış Yap
            </button>
          </div>
        </nav>
      </aside>

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-80 bg-white/95 text-slate-900 border-r border-slate-200/70 transform transition-transform duration-300 ease-out lg:hidden backdrop-blur-2xl shadow-2xl shadow-slate-200/70 dark:bg-[#202124]/95 dark:text-slate-100 dark:border-[#2c2f36] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200/60 dark:border-[#2c2f36]">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-slate-800 grid place-items-center text-white shadow shadow-slate-500/30 dark:bg-[#303134]">
              <Sparkles size={16} />
            </div>
            <span className="font-semibold tracking-wide">Admin Panel</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Menüyü kapat"
            className="rounded-lg p-2 hover:bg-white/10 dark:hover:bg-slate-800/80"
          >
            <X size={18} />
          </button>
        </div>

        {/* Anasayfa butonu */}
        <div className="p-4 border-b border-slate-200/60">
          <NavLink
            to="/"
            className="w-full inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white px-3 py-2.5 text-sm transition shadow shadow-slate-500/25"
            onClick={onClose}
          >
            <Home size={18} />
            Anasayfa
          </NavLink>
        </div>

        {/* Links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {links.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={linkClass}
              onClick={onClose}
              aria-current={location.pathname === path ? "page" : undefined}
            >
              <Icon size={18} className="opacity-90" />
              <span className="text-sm">{label}</span>
            </NavLink>
          ))}

          <div className="pt-3">
            <button
              onClick={() => {
                onClose?.();
                logout();
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white px-3 py-2.5 text-sm transition shadow shadow-slate-500/25"
            >
              <LogOut size={18} />
              Çıkış Yap
            </button>
          </div>
        </nav>

      </div>
    </>
  );
};

Sidebar.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
};

export default Sidebar;
