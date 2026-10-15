// src/components/Hero.jsx
import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function Hero() {
  const { pathname } = useLocation();
  const nav = useNavigate();

  const gotoHash = useCallback(
    (id) => (e) => {
      e.preventDefault();
      if (pathname !== "/") {
        nav("/", { replace: false });
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
    <section id="hero" className="relative isolate w-full overflow-hidden">
      {/* arka plan vs... (varsa bırak) */}

      <div className="relative mx-auto max-w-screen-2xl px-6 md:px-10 lg:px-12 min-h-[calc(100svh-4rem)] flex items-center">
        <div className="grid w-full grid-cols-1 items-center gap-12 md:grid-cols-2 md:gap-20 lg:gap-28 py-12 md:py-16">
          {/* Sol içerik */}
          <div className="space-y-6 md:pr-6 lg:pr-8 max-w-[720px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[13px] font-medium text-muted">
              <span className="h-2 w-2 rounded-full bg-accent" />
              Premium hukuk danışmanlığı
            </span>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight md:whitespace-nowrap">
              Suphi Veysanoğlu
            </h1>

            <p className="max-w-[62ch] text-lg md:text-xl leading-relaxed text-muted">
              Haklarınızı en üst düzeyde savunan, stratejik ve sonuç odaklı
              yaklaşım. Şirketler, Ceza, İcra, Gayrimenkul, İş ve Aile hukuku
              başta olmak üzere kapsamlı temsil.
            </p>

            <div className="flex flex-wrap gap-4">
              <a
                href="/#iletisim"
                onClick={gotoHash("iletisim")}
                className="rounded-[var(--radius-lg)] px-6 py-3 text-base font-semibold text-black shadow-[var(--shadow-soft)] transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-accent/40"
                style={{ backgroundImage: "var(--gradient-accent)" }}
                aria-label="İletişim bölümüne git"
              >
                İletişime Geçin
              </a>
              <a
                href="/#hizmetler"
                onClick={gotoHash("hizmetler")}
                className="rounded-[var(--radius-lg)] border border-border bg-surface px-6 py-3 text-base font-semibold text-foreground transition-colors hover:bg-surface-2"
                aria-label="Hizmetler bölümüne git"
              >
                Hizmetleri Görün
              </a>
            </div>

        
          </div>

          {/* Sağ görsel */}
          <div className="relative w-full md:justify-self-end md:ml-4 lg:ml-6">
            <div className="relative w-full max-w-[640px] lg:max-w-[720px] xl:max-w-[820px] overflow-hidden rounded-[var(--radius-xl)] ring-[3px] ring-[color:var(--color-accent)]/85 shadow-[0_18px_50px_rgba(0,0,0,.35)]">
              <img
                src="/img/law-office.jpg"
                alt="Law Office"
                className="w-full h-auto object-cover object-center transition-transform duration-500 ease-out hover:scale-[1.03]"
                loading="eager"
                sizes="(min-width:1280px) 820px, (min-width:1024px) 720px, (min-width:768px) 640px, 100vw"
              />
            </div>

            <div className="absolute -bottom-5 right-6 rounded-[14px] border border-white/25 bg-white/22 backdrop-blur-md px-4 py-2 text-sm shadow-[0_12px_28px_rgba(0,0,0,.28)]">
              <span className="font-semibold text-[color:var(--color-accent)]">
                Ödüllü Hizmet
              </span>
              <div className="text-xs text-foreground/90">
                Müvekkil memnuniyeti
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* bölüm sonu çizgi */}
      <div className="mx-auto max-w-screen-2xl px-6 md:px-10 lg:px-12">
        <div className="h-px bg-[color:var(--color-border)]/40" />
      </div>
    </section>
  );
}
