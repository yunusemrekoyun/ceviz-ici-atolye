// src/components/FAQ.jsx
import { useId, useState } from "react";

const QA = [
  {
    q: "Ön görüşme nasıl gerçekleşiyor?",
    a: "Kısa bir telefon/online görüşme ile dosya hakkında temel bilgileri alıyor, sonraki adımlar ve tahmini zaman planını paylaşıyoruz.",
  },
  {
    q: "Ücretlendirme nasıl belirleniyor?",
    a: "İşin kapsamı, süre ve risklerine göre şeffaf bir teklif sunuluyor; masraf kalemleri ayrıca belirtiliyor.",
  },
  {
    q: "Gizlilik nasıl korunuyor?",
    a: "Meslek kuralları ve KVKK çerçevesinde tüm belgeler ve bilgiler gizlilikle saklanır, yalnızca zorunlu kişilerle paylaşılır.",
  },
  {
    q: "Dava dışı çözüm yöntemleri değerlendiriliyor mu?",
    a: "Arabuluculuk ve uzlaşma seçeneklerini objektif biçimde değerlendiriyor, müvekkilin menfaatine uygun yolu öneriyoruz.",
  },
];

export default function FAQ() {
  // 🔒 Hepsi kapalı başlar
  const [open, setOpen] = useState(-1);
  const sectionId = useId();

  const toggle = (i) => setOpen((curr) => (curr === i ? -1 : i));

  return (
    <section
      className="section-y border-t border-border/50"
      aria-labelledby={`${sectionId}-title`}
    >
      <div className="container-x">
        {/* Başlık */}
        <header className="mb-8 sm:mb-10">
          <h2
            id={`${sectionId}-title`}
            className="text-[28px] sm:text-[32px] md:text-[34px] font-semibold tracking-[-0.01em]"
          >
            Sıkça Sorulan Sorular
          </h2>
          <p className="mt-2 text-[15px] sm:text-[16.5px] text-foreground/80 max-w-3xl">
            Süreç, ücretlendirme ve gizlilik hakkında temel bilgiler.
          </p>
        </header>

        {/* Akordeon kutu */}
        <div className="overflow-hidden rounded-[var(--radius-2xl)] border border-border/60 bg-[color:var(--color-surface-2)]/65 shadow-[var(--shadow-soft)]">
          <ul className="divide-y divide-border/50" role="list">
            {QA.map(({ q, a }, i) => {
              const isOpen = open === i;
              const panelId = `${sectionId}-panel-${i}`;
              const btnId = `${sectionId}-button-${i}`;

              return (
                <li key={q} role="listitem">
                  {/* Soru satırı */}
                  <button
                    id={btnId}
                    type="button"
                    onClick={() => toggle(i)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className={[
                      "group flex w-full items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5 text-left",
                      // 🎯 Yalnızca hover’da arka plan ver
                      "hover:bg-foreground/[0.045] transition-colors motion-reduce:transition-none",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                    ].join(" ")}
                  >
                    <span className="text-[15.5px] sm:text-[16px] font-semibold text-foreground/95">
                      {q}
                    </span>

                    {/* Chevron */}
                    <svg
                      viewBox="0 0 24 24"
                      className={[
                        "h-4 w-4 text-foreground/70 transition-transform duration-200 motion-reduce:transition-none",
                        isOpen ? "rotate-180" : "rotate-0",
                      ].join(" ")}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>

                  {/* Cevap paneli */}
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={btnId}
                    aria-hidden={!isOpen}
                    className={[
                      "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    ].join(" ")}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0 text-[14.5px] leading-[1.75] text-[color:var(--color-muted)]">
                        {a}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
