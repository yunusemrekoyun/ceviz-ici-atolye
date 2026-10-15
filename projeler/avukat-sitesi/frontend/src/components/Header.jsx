import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useMemo, useState } from "react";

export default function Header() {
  const { pathname, hash } = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const menu = useMemo(
    () => [
      { label: "Çalışma Alanlarımız", to: "/calisma-alanlarimiz", kind: "route" },
      { label: "Hakkımda", to: "/#hakkimda", kind: "hash" },
      { label: "Makaleler", to: "/makaleler", kind: "route" },
      { label: "Yargıtay Kararları", to: "/kararlar", kind: "route" },
      { label: "İletişim", to: "/#iletisim", kind: "hash" },
    ],
    []
  );

  const handleLogoClick = useCallback(
    (e) => {
      e.preventDefault();
      if (pathname === "/") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        nav("/");
      }
      setOpen(false);
    },
    [pathname, nav]
  );

  // Hash link tıklaması: farklı sayfadaysak önce "/"'a git, sonra section'a kaydır
  const handleMenuClick = useCallback(
    async (item) => {
      if (item.kind === "route") {
        nav(item.to);
        setOpen(false);
        return;
      }

      // kind === "hash"
      // eslint-disable-next-line no-unused-vars
      const [path, idRaw] = item.to.split("#"); // "/#hizmetler"
      const id = idRaw || "";
      if (pathname !== "/") {
        // home'a git, kısa bir raf sonrası ilgili id'ye kaydır
        nav("/", { replace: false });
        requestAnimationFrame(() => {
          setTimeout(() => {
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 50);
        });
      } else {
        // zaten home'dayız → direkt kaydır
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setOpen(false);
    },
    [nav, pathname]
  );

  // aktif link (route için pathname, hash için hash/id)
  const isActive = useCallback(
    (item) => {
      if (item.kind === "route") {
        return pathname.startsWith(item.to);
      }
      // hash’lerde sadece anasayfadaysak vurgula
      if (pathname !== "/") return false;
      return hash === item.to.replace("/", ""); // "/#hizmetler" -> "#hizmetler"
    },
    [pathname, hash]
  );

  return (
    <header
      className="sticky top-0 z-50 border-b border-border/60 bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="container-x flex h-16 items-center justify-between">
        {/* Sol: Logo */}
        <Link
          to="/"
          onClick={handleLogoClick}
          className="group flex items-center gap-3"
          aria-label="Anasayfa"
        >
          <span className="relative grid h-10 w-10 place-items-center rounded-full bg-bg text-[14px] font-semibold">
            <span className="pointer-events-none absolute inset-0 rounded-full ring-[1.5px] ring-[color:var(--color-accent)]/85"></span>
            <span className="pointer-events-none absolute -inset-1 -z-10 rounded-full blur-md bg-[rgba(228,189,99,0.10)]"></span>
            <span className="z-10 text-[color:var(--color-accent)]">SV</span>
          </span>
          <span className="leading-[1.05]">
            <span className="block text-[var(--text-lg)] font-semibold tracking-[-0.01em]">
              Suphi Veysanoğlu
            </span>
            <span className="mt-[2px] block text-xs text-[color:var(--color-accent)]">
              Avukat
            </span>
          </span>
        </Link>

        {/* Orta: Desktop Menü */}
        <nav
          className="hidden items-center gap-2 md:flex"
          role="navigation"
          aria-label="Ana menü"
        >
          {menu.map((item) => {
            const active = isActive(item);
            return (
              <button
                key={item.label}
                onClick={() => handleMenuClick(item)}
                aria-current={active ? "page" : undefined}
                className={`
          group relative px-3 py-2 text-sm font-medium transition-colors duration-200 ease-out
          ${
            active
              ? "text-foreground"
              : "text-foreground/85 hover:text-foreground"
          }
        `}
              >
                {item.label}

                {/* Alt çizgi */}
                <span
                  aria-hidden="true"
                  className={`
            pointer-events-none absolute -bottom-1 left-3 right-3 h-[2px]
            bg-[color:var(--color-accent)]
            origin-left will-change-transform
            transition-transform duration-200
            ${
              active
                ? "scale-x-100"
                : "scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100"
            }
          `}
                />
              </button>
            );
          })}
        </nav>

        {/* Sağ: CTA (Desktop) */}
        <Link
          to="/#contact"
          className="hidden md:inline-block rounded-md px-3 py-2 text-sm text-black font-semibold relative transition-[filter,opacity] hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/40"
          style={{ backgroundImage: "var(--gradient-accent)" }}
          onClick={(e) => {
            e.preventDefault();
            handleMenuClick({ to: "/#contact", kind: "hash" });
          }}
        >
          İletişime Geçin
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-[color:var(--color-accent)]/60 shadow-[0_0_15px_rgba(228,189,99,0.6)]"
          />
        </Link>

        {/* Mobil: sağda hamburger */}
        <button
          type="button"
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md border border-border/60 bg-surface text-foreground/90"
          aria-label="Menüyü aç"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {/* hamburger / close */}
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            {open ? (
              <path d="M6 6l12 12M6 18L18 6" />
            ) : (
              <>
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobil menü paneli */}
      {open && (
        <div className="md:hidden border-t border-border/60 bg-surface/95 backdrop-blur">
          <nav
            className="container-x py-2"
            role="navigation"
            aria-label="Mobil menü"
          >
            <ul className="flex flex-col py-1">
              {menu.map((item) => (
                <li key={item.label}>
                  <button
                    onClick={() => handleMenuClick(item)}
                    className={`
                      w-full text-left px-3 py-3 text-[15px] transition
                      ${
                        isActive(item)
                          ? "text-foreground"
                          : "text-foreground/85 hover:text-foreground"
                      }
                    `}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
              <li className="px-3 pt-1">
                <button
                  onClick={() =>
                    handleMenuClick({ to: "/#contact", kind: "hash" })
                  }
                  className="w-full rounded-md px-3 py-2 text-sm font-semibold text-black"
                  style={{ backgroundImage: "var(--gradient-accent)" }}
                >
                  İletişime Geçin
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
