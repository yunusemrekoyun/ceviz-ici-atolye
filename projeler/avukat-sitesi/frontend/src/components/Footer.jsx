// Footer.jsx
import { IconPhone, IconMail, IconMapPin } from "@tabler/icons-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCallback } from "react";

export default function Footer() {
  const { pathname } = useLocation();
  const nav = useNavigate();

  // hash hedeflerine (Home içindeki anchor’lar) güvenli git
  const goHash = useCallback(
    (hashId) => {
      const id = hashId.replace(/^#/, "");
      if (pathname !== "/") {
        nav("/", { replace: false });
        // home render edildikten sonra kaydır
        requestAnimationFrame(() => {
          setTimeout(() => {
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 50);
        });
      } else {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [pathname, nav]
  );

  return (
    <footer className="mt-16 border-t border-border/60 bg-surface">
      <div className="container-x">
        {/* Üst grid */}
        <div className="grid gap-8 py-7 md:grid-cols-3 md:gap-10">
          {/* Sol blok: logo + açıklama */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="relative grid h-7 w-7 place-items-center rounded-full bg-[color:var(--color-bg)] text-[11px] font-semibold">
                <span className="pointer-events-none absolute inset-0 rounded-full ring-[1.5px] ring-[color:var(--color-accent)]/85"></span>
                <span
                  className="pointer-events-none absolute -inset-1 -z-10 rounded-full blur-md"
                  style={{
                    backgroundImage: "var(--gradient-accent)",
                    opacity: 0.18,
                  }}
                ></span>
                <span className="z-10 text-[color:var(--color-accent)]">
                  SV
                </span>
              </span>

              <span className="leading-[1.05]">
                <span className="block text-[var(--text-base)] font-semibold tracking-[-0.01em]">
                  Suphi Veysanoğlu
                </span>
                <span className="block text-[color:var(--color-accent)]">
                  Avukat
                </span>
              </span>
            </div>

            <p className="max-w-md text-[13.5px] leading-[1.6] text-muted">
              Mersin merkezli, bireysel ve kurumsal müvekkillere stratejik ve
              sonuç odaklı hukuki danışmanlık.
            </p>
          </div>

          {/* Orta blok: Bağlantılar */}
          <nav aria-label="Alt menü">
            <div className="text-[var(--text-base)] font-semibold">
              Bağlantılar
            </div>
            <ul className="mt-3 space-y-1.5 text-[14.5px] text-foreground/90">
              <li>
                {/* Sayfa: Çalışma Alanlarımız */}
                <Link
                  to="/calisma-alanlarimiz"
                  className="transition-colors hover:text-foreground"
                >
                  Çalışma Alanlarımız
                </Link>
              </li>
              <li>
                {/* Home içi anchor: #hakkimda */}
                <button
                  type="button"
                  onClick={() => goHash("#hakkimda")}
                  className="transition-colors hover:text-foreground"
                >
                  Hakkımda
                </button>
              </li>
              <li>
                <Link
                  to="/makaleler"
                  className="transition-colors hover:text-foreground"
                >
                  Makaleler
                </Link>
              </li>
              <li>
                {/* Home içi anchor: iletişim FORMU */}
                <button
                  type="button"
                  onClick={() => goHash("#contact")}
                  className="transition-colors hover:text-foreground"
                >
                  İletişim
                </button>
              </li>
            </ul>
          </nav>

          {/* Sağ blok: İletişim */}
          <div>
            <div className="text-[var(--text-base)] font-semibold">
              İletişim
            </div>
            <ul className="mt-3 space-y-1.5 text-[14.5px] text-foreground/90">
              <li className="flex items-center gap-2">
                <IconPhone className="h-4 w-4 text-accent" />
                <a
                  href="tel:+905367779545"
                  className="hover:underline underline-offset-4"
                >
                  +90 (536) 777 95 45
                </a>
              </li>
              <li className="flex items-center gap-2">
                <IconMail className="h-4 w-4 text-accent" />
                <a
                  href="mailto:avsuphiveysanoglu@hotmail.com"
                  className="hover:underline underline-offset-4 break-all"
                >
                  avsuphiveysanoglu@hotmail.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <IconMapPin className="h-4 w-4 text-accent" />
                <a
                  href="https://www.google.com/maps?q=İhsaniye+Mahallesi+Bahçeler+Cad.+Ofis+Royal+İş+Merkezi+No:22+K:1/11+Akdeniz/MERSİN"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline underline-offset-4"
                >
                  İhsaniye Mahallesi Bahçeler Cad. Ofis Royal İş Merkezi No:22
                  K:1/11 Akdeniz/MERSİN
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Alt bar */}
        <div className="pb-6">
          <div className="rounded-[var(--radius-lg)] border border-border/60 bg-surface-2 px-4 py-2.5 text-center text-[12px] text-muted shadow-[var(--shadow-soft)]">
            © 2025 Suphi Veysanoğlu. Tüm hakları saklıdır.
          </div>
        </div>
      </div>
    </footer>
  );
}
