// src/components/Services.jsx
import {
  IconScale,
  IconBriefcase,
  IconBuildingSkyscraper,
  IconGavel,
  IconShield,
  IconBuildingBank,
  IconHome2,
} from "@tabler/icons-react";

// Altın rozet wrapper
function GoldBadge({ children }) {
  return (
    <span className="relative grid h-12 w-12 shrink-0 place-items-center text-[color:var(--color-accent)]">
      {/* dış halka */}
      <span className="pointer-events-none absolute inset-0 rounded-full ring-[1.8px] ring-[color:var(--color-accent)]/90" />
      {/* iç yüzey */}
      <span className="pointer-events-none absolute inset-[6px] rounded-full bg-[color:var(--color-surface)] ring-1 ring-[color:var(--color-accent)]/35" />
      {/* yumuşak parıltı */}
      <span
        className="pointer-events-none absolute -inset-1 -z-10 rounded-full blur-md"
        style={{ backgroundImage: "var(--gradient-accent)", opacity: 0.22 }}
      />
      {/* ikon */}
      <span className="relative z-10">{children}</span>
    </span>
  );
}

export default function Services() {
  const items = [
    {
      title: "Ceza Hukuku",
      desc: "Soruşturma ve kovuşturmada etkin savunma, tutukluluğa itiraz, itibar koruma.",
      icon: IconScale,
    },
    {
      title: "Ticaret Hukuku",
      desc: "Sözleşmeler, ihtilaf yönetimi, şirketler hukuku ve uyum süreçleri.",
      icon: IconBriefcase,
    },
    {
      title: "Gayrimenkul",
      desc: "İmar, tapu, iskan süreçleri ve uyuşmazlık çözümü.",
      icon: IconHome2,
    },
    {
      title: "Aile Hukuku",
      desc: "Boşanma, velayet, nafaka, mal rejimi ve koruma tedbirleri.",
      icon: IconGavel,
    },
    {
      title: "İş Hukuku",
      desc: "Kıdem-ihbar, işe iade, iş güvenliği ve arabuluculuk.",
      icon: IconShield,
    },
    {
      title: "Tahkim & Arabuluculuk",
      desc: "Hızlı ve gizli alternatif uyuşmazlık çözümü.",
      icon: IconBuildingBank,
    },
    {
      title: "Şirketler Hukuku",
      desc: "Şirket kuruluşu, birleşme & devralma, kurumsal yönetim ve uyum süreçleri.",
      icon: IconBuildingSkyscraper,
    },
    {
      title: "İcra Hukuku",
      desc: "İlamsız para alacağı takibi, İlamlı icra yoluyla takip, Kambiyo senetlerine özgü takip, İtirazın iptali, Menfi tespit, Tasarrufun iptali.",
      icon: IconGavel, // ⚖️ İcra ve hukuku temsil eden uygun ikon
    },
  ];

  return (
    <section
      id="hizmetler"
      className="section-y border-t border-border/50"
      aria-labelledby="services-title"
    >
      <div className="mx-auto max-w-screen-2xl px-6 sm:px-8 md:px-10 lg:px-12">
        {/* Başlık */}
        <header className="mb-8 sm:mb-10">
          <h2
            id="services-title"
            className="text-[28px] sm:text-[30px] md:text-[34px] font-semibold tracking-[-0.01em]"
          >
            Çalışma Alanlarımız
          </h2>
          <p className="mt-2 text-[15px] sm:text-[16px] md:text-[16.5px] text-foreground/80 max-w-[70ch]">
            İhtiyacınıza uygun, stratejik ve sonuç odaklı hukuki danışmanlık.
          </p>
        </header>

        {/* Kartlar */}
        <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map(({ title, desc, icon: IconCmp }) => (
            <article
              key={title}
              className="rounded-[var(--radius-2xl)] border border-border/60 bg-[color:var(--color-surface-2)]/85 p-5 sm:p-6 shadow-[var(--shadow-soft)] transition-colors hover:bg-[color:var(--color-surface-2)]/95"
            >
              <div className="flex items-start gap-4">
                <GoldBadge>
                  <IconCmp
                    size={22}
                    stroke={1.8}
                    className="translate-y-[0.5px]"
                  />
                </GoldBadge>
                <div>
                  <h3 className="text-[17px] sm:text-[18px] font-semibold leading-[1.25]">
                    {title}
                  </h3>
                  <p className="mt-1 text-[14.5px] sm:text-[15px] leading-[1.65] text-[color:var(--color-muted)]">
                    {desc}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
