// src/components/WorkingProcess.jsx
import {
  IconCalendar,
  IconFileText,
  IconBulb,
  IconScale,
} from "@tabler/icons-react";

export default function WorkingProcess() {
  const steps = [
    {
      title: "Ön Görüşme",
      desc: "Dosyanın ön değerlendirmesi, hedef ve beklentilerin netleştirilmesi.",
      icon: IconCalendar,
    },
    {
      title: "Analiz",
      desc: "Delil, mevzuat ve içtihat taraması; risk senaryolarının belirlenmesi.",
      icon: IconFileText,
    },
    {
      title: "Strateji",
      desc: "Arabuluculuk, uzlaşma veya dava seçeneklerinin stratejik planlanması.",
      icon: IconBulb,
    },
    {
      title: "Temsil",
      desc: "Süreç yönetimi, etkin savunma ve şeffaf bilgilendirme.",
      icon: IconScale,
    },
  ];

  return (
    <section
      className="section-y border-t border-border/50"
      aria-labelledby="working-process-title"
    >
      <div className="container-x">
        {/* Başlık */}
        <header className="mb-8 sm:mb-10">
          <h2
            id="working-process-title"
            className="font-semibold tracking-[-0.01em] text-[28px] sm:text-[32px] md:text-[34px]"
          >
            Çalışma Süreci
          </h2>
          <p className="mt-2 text-[15px] sm:text-[16.5px] text-foreground/80">
            Ön görüşmeden nihai sonuca kadar şeffaf ve planlı ilerleyiş.
          </p>
        </header>

        {/* 4 Adım Grid */}
        <div
          className="grid grid-cols-1 gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4"
          role="list"
          aria-label="Çalışma adımları"
        >
          {steps.map(({ title, desc, icon: Icon }, idx) => (
            <article
              key={title}
              role="listitem"
              className="
                h-full rounded-[var(--radius-2xl)]
                border border-border/60
                bg-[color:var(--color-surface-2)]/85
                shadow-[var(--shadow-soft)]
                p-5 sm:p-6
              "
            >
              <div className="flex items-start gap-4">
                {/* Nötr rozet (responsive boyutlar) */}
                <span className="relative grid h-10 w-10 sm:h-12 sm:w-12 shrink-0 place-items-center">
                  <span className="absolute inset-0 rounded-full bg-foreground/10" />
                  <span className="absolute inset-0 rounded-full ring-1 ring-border/70" />
                  <Icon
                    size={22}
                    className="relative z-10 text-foreground/85 sm:translate-y-[0.5px]"
                    stroke={1.8}
                  />
                </span>

                <div className="min-w-0">
                  <h3 className="text-[16.5px] sm:text-[18px] font-semibold leading-[1.25] break-words">
                    {/* numara rozetini başlığa dahil ederek görsel hiyerarşiyi güçlendirelim */}
                    <span className="mr-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-foreground/10 px-1 text-[12px] align-[2px]">
                      {idx + 1}
                    </span>
                    {title}
                  </h3>
                  <p className="mt-1.5 text-[14.5px] sm:text-[15px] leading-[1.7] text-[color:var(--color-muted)] break-words">
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
