import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import PropTypes from "prop-types";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

/**
 * AdminLayout
 * - Mobilde aç/kapa yapılabilen bir sidebar
 * - Sticky topbar
 * - İçerik için kaydırılabilir alan
 */
const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem("admin-theme");
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.add("admin-root");
    return () => {
      root.classList.remove("admin-root");
      root.classList.remove("dark");
      root.removeAttribute("data-admin-theme");
    };
  }, []);

  // useEffect değil useLayoutEffect: Tailwind koyu varyantları `:is(.dark *)`
  // olarak derliyor, yani `dark` sınıfının bir ÜST elemanda olması gerekiyor.
  // Aşağıdaki kapsayıcıya verilen sınıf kendi arka planı için yeterli değil;
  // `<html>`e eklenmesi şart. useEffect kullanılırsa bu ilk boyamadan sonra
  // olduğu için panel bir an açık temayla çizilip metinler okunmuyor.
  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.dataset.adminTheme = theme;
    window.localStorage.setItem("admin-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme((prev) => (prev === "dark" ? "light" : "dark")),
    []
  );

  return (
    <div className={`admin-shell flex overflow-hidden relative ${theme === "dark" ? "dark" : ""}`}>
      <div className="admin-overlay" />

      {/* Sidebar (desktop: visible, mobile: slide-in) */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Sağ ana alan */}
      <div className="flex-1 relative flex flex-col min-w-0">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* İçerik alanı */}
        <main
          className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-8 relative"
          role="main"
        >
          {children}
        </main>
      </div>

      {/* Mobil sidebar açıldığında arka plan overlay */}
      {sidebarOpen && (
        <button
          aria-label="Menüyü kapat"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm lg:hidden"
        />
      )}
    </div>
  );
};

AdminLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AdminLayout;
