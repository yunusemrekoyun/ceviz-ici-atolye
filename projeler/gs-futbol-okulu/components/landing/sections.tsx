import Link from "next/link";
import { ABOUT, HERO, REGISTER, REGISTER_PATH, TRAINING } from "./content";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="lp-gold text-[11px] font-semibold uppercase tracking-[0.28em] sm:text-xs">{children}</p>;
}

function Title({ children }: { children: React.ReactNode }) {
  return <h2 className="lp-display mt-2 text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-[40px]">{children}</h2>;
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17L17 7M17 7H7M17 7V17" />
    </svg>
  );
}

/** Shared padding: leaves room for the header at the top and breathing space at the bottom. */
const LAYER = "flex h-full flex-col px-4 pb-6 pt-[128px] sm:px-8 sm:pt-[96px] lg:px-12";

export function HeroSection({ onExplore }: { onExplore: () => void }) {
  return (
    <div className={`${LAYER} justify-between`}>
      <div className="select-none text-center">
        <h1 className="lp-hero-title lp-display text-[clamp(40px,10vw,170px)] font-bold uppercase leading-[0.92]">
          {HERO.titleLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>
      </div>

      <div className="flex flex-col items-center gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="lp-glass w-full max-w-[380px] rounded-3xl p-5">
          <Eyebrow>{HERO.eyebrow}</Eyebrow>
          <h2 className="lp-display mt-1.5 text-xl font-bold text-white">{HERO.subtitle}</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-zinc-300">{HERO.lead}</p>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href={REGISTER_PATH}
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-xs font-semibold tracking-wider text-black shadow-xl transition hover:scale-105 hover:bg-zinc-200 active:scale-95"
          >
            {HERO.primaryCta}
            <ArrowIcon className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={onExplore}
            className="inline-flex items-center gap-1.5 px-2 py-2 text-xs font-medium text-zinc-200 transition hover:text-white"
          >
            {HERO.secondaryCta}
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export function AboutSection() {
  return (
    <div className={`${LAYER} justify-center`}>
      <div className="grid gap-3 sm:gap-5 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-10">
        <div className="lp-glass max-w-xl rounded-3xl p-5 sm:p-6">
          <Eyebrow>{ABOUT.eyebrow}</Eyebrow>
          <Title>{ABOUT.title}</Title>
          <p className="mt-3 text-sm leading-relaxed text-zinc-200 sm:text-base">{ABOUT.text}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {ABOUT.cards.map((card, i) => (
            <div key={card.title} className={`lp-glass rounded-3xl p-4 sm:p-5 ${i > 0 ? "lp-hide-short" : ""}`}>
              <h3 className="text-sm font-semibold text-white">{card.title}</h3>
              <ul className="mt-2 space-y-1.5">
                {card.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13px] leading-snug text-zinc-300">
                    <span className="lp-gold mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TrainingSection() {
  return (
    <div className={`${LAYER} justify-center`}>
      <div className="lp-glass max-w-2xl rounded-3xl p-5 sm:p-6">
        <Eyebrow>{TRAINING.eyebrow}</Eyebrow>
        <Title>{TRAINING.title}</Title>
        <p className="lp-hide-short mt-3 text-sm leading-relaxed text-zinc-200 sm:text-base">{TRAINING.text}</p>
      </div>
      <div className="mt-3 grid gap-3 sm:mt-5 sm:grid-cols-3 sm:gap-4">
        {TRAINING.cards.map((card, i) => (
          <div key={card.title} className="lp-glass rounded-3xl p-4 sm:p-5">
            <span className="lp-display lp-gold text-xs font-bold">0{i + 1}</span>
            <h3 className="mt-1 text-sm font-semibold text-white sm:text-base">{card.title}</h3>
            <p className="mt-1.5 text-[13px] leading-snug text-zinc-300">{card.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RegisterSection() {
  return (
    <div className={`${LAYER} items-center justify-center`}>
      <div className="lp-glass w-full max-w-xl rounded-3xl p-5 sm:p-8">
        <Eyebrow>{REGISTER.eyebrow}</Eyebrow>
        <Title>{REGISTER.title}</Title>
        <p className="mt-3 text-sm leading-relaxed text-zinc-300">{REGISTER.text}</p>
        <ol className="mt-5 space-y-3">
          {REGISTER.steps.map((step, i) => (
            <li key={step} className="flex items-start gap-3 text-sm text-zinc-100">
              <span className="lp-display flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="pt-1 leading-snug">{step}</span>
            </li>
          ))}
        </ol>
        <Link
          href={REGISTER_PATH}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-xs font-semibold tracking-wider text-black shadow-xl transition hover:scale-105 hover:bg-zinc-200 active:scale-95"
        >
          {REGISTER.cta}
          <ArrowIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
